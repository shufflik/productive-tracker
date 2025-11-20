"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { getTodayLocalISO, getLocalDateFromUTC } from "@/lib/utils/date"
import { syncService } from "@/lib/services/sync"
import { useGoalsStore } from "./goals-store"

type DayState = {
  date: string // ISO date format "2025-11-10"
  isEndDay: boolean
}

type DayStateStore = {
  dayStates: Record<string, DayState> // key is ISO date string
  lastActiveDate: string | null // последняя дата и время активности пользователя (ISO datetime "2025-01-15T14:30:00.000Z")
  pendingReviewDates: string[] // даты, для которых нужно показать review диалог
  
  // Actions
  markDayAsEnded: (date: string) => void
  cancelDayEnd: (date: string) => void
  isDayEnded: (date: string) => boolean
  getTodayState: () => DayState
  isTodayEnded: () => boolean
  
  // Новые методы для автоматического закрытия дней
  markDayForReview: (date: string) => void
  completePendingReview: (date: string) => void
  updateLastActiveDate: () => void
  getPendingReviewDates: () => string[]
}

export const useDayStateStore = create<DayStateStore>()(
  persist(
    (set, get) => ({
      dayStates: {},
      lastActiveDate: null,
      pendingReviewDates: [],

      markDayAsEnded: (date) => {
        // Храним только 1 день в кеше - заменяем весь кеш новой датой
        set({
          dayStates: {
            [date]: {
              date,
              isEndDay: true,
            },
          },
        })
      },

      cancelDayEnd: (date) => {
        // Восстанавливаем incomplete goals обратно в today если отменяется сегодняшний день
        const today = getTodayLocalISO()
        if (date === today) {
          try {
            // Читаем данные о незавершенных целях из localStorage
            const reasons = JSON.parse(localStorage.getItem("reasons") || "[]")
            const incompleteGoalsForDate = reasons
              .filter((r: any) => r.date === date)
              .map((r: any) => r.goalId)

            if (incompleteGoalsForDate.length > 0) {
              // Переносим все incomplete goals обратно в today
              useGoalsStore.getState().moveToToday(incompleteGoalsForDate)
              console.log(`[DayStateStore] Restored ${incompleteGoalsForDate.length} incomplete goals back to today`)
            }
          } catch (error) {
            console.error("[DayStateStore] Failed to restore incomplete goals:", error)
          }
        }

        set((state) => {
          const newDayStates = { ...state.dayStates }
          delete newDayStates[date]
          return { dayStates: newDayStates }
        })
      },

      isDayEnded: (date) => {
        const dayState = get().dayStates[date]
        return dayState?.isEndDay ?? false
      },

      getTodayState: () => {
        const today = getTodayLocalISO()
        const state = get().dayStates[today]
        return state ?? { date: today, isEndDay: false }
      },

      isTodayEnded: () => {
        const today = getTodayLocalISO()
        return get().isDayEnded(today)
      },

      markDayForReview: (date) => {
        set((state) => {
          if (!state.pendingReviewDates.includes(date)) {
            return {
              pendingReviewDates: [...state.pendingReviewDates, date],
            }
          }
          return state
        })
      },

      completePendingReview: (date) => {
        set((state) => ({
          pendingReviewDates: state.pendingReviewDates.filter((d) => d !== date),
        }))
      },

      updateLastActiveDate: () => {
        // Сохраняем точное время для корректной обработки merge conflicts
        const now = new Date().toISOString()
        set({ lastActiveDate: now })
      },

      getPendingReviewDates: () => {
        return get().pendingReviewDates
      },
    }),
    {
      name: "day-state-storage",
      storage: createJSONStorage(() => {
        return {
          getItem: (name) => {
            if (typeof window === 'undefined') return null
            try {
              const str = localStorage.getItem(name)
              if (!str) return null
              return str
            } catch (error) {
              console.error("Error loading day states from localStorage:", error)
              return JSON.stringify({ state: { dayStates: {} } })
            }
          },
          setItem: (name, value) => {
            if (typeof window === 'undefined') return
            try {
              localStorage.setItem(name, value)
            } catch (error) {
              console.error("Error saving day states to localStorage:", error)
            }
          },
          removeItem: (name) => {
            if (typeof window === 'undefined') return
            try {
              localStorage.removeItem(name)
            } catch (error) {
              console.error("Error removing day states from localStorage:", error)
            }
          },
        }
      }),
    }
  )
)

// Зарегистрировать обработчик применения review блока от backend
// pendingReviewDates теперь генерируются только на бекенде
syncService.registerPendingReviewsApplyHandler((reviewBlock) => {
  useDayStateStore.setState((state) => {
    // pendingReviewDates генерируются на бекенде, просто берем с сервера
    const serverDates = reviewBlock.pendingReviewDates || []

    // Применяем dayEnded от бекенда
    // Бекенд теперь возвращает дату напрямую в dayEnded.date
    let newDayStates = { ...state.dayStates }
    if (reviewBlock.dayEnded) {
      try {
        const { date, ended } = reviewBlock.dayEnded
        
        // Если день закрыт и даты нет в кеше - добавляем (заменяя весь кеш)
        if (ended && !newDayStates[date]) {
          newDayStates = {
            [date]: {
              date: date,
              isEndDay: true,
            }
          }
        }
        // Если ended = false или дата уже в кеше - ничего не делаем
      } catch (error) {
        console.error("[DayStateStore] Failed to apply dayEnded:", error)
      }
    }

    return {
      ...state,
      pendingReviewDates: serverDates,
      dayStates: newDayStates,
    }
  })
})

