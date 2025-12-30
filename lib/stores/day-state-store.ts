"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { getTodayLocalISO, getLocalDateFromUTC } from "@/lib/utils/date"
import { syncService } from "@/lib/services/sync"
import { useGoalsStore } from "./goals-store"
import type { PendingReviewGoal } from "@/lib/services/sync/types"

type DayState = {
  date: string // ISO date format "2025-11-10"
  isEndDay: boolean
}

type DayStateStore = {
  dayStates: Record<string, DayState> // key is ISO date string
  lastActiveDate: string | null // последняя дата и время активности пользователя (ISO datetime "2025-01-15T14:30:00.000Z")
  pendingReview: Record<string, PendingReviewGoal[]> // goals grouped by date for pending reviews

  // Actions
  markDayAsEnded: (date: string) => void
  cancelDayEnd: (date: string, incompleteGoalIds?: string[]) => void
  isDayEnded: (date: string) => boolean
  getTodayState: () => DayState
  isTodayEnded: () => boolean

  // Методы для автоматического закрытия дней
  completePendingReview: (date: string) => void
  updateLastActiveDate: () => void
  getPendingReviewDates: () => string[]
  getGoalsForReview: (date: string) => PendingReviewGoal[]
}

export const useDayStateStore = create<DayStateStore>()(
  persist(
    (set, get) => ({
      dayStates: {},
      lastActiveDate: null,
      pendingReview: {},

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

      cancelDayEnd: (date, incompleteGoalIds: string[] = []) => {
        // Восстанавливаем incomplete goals обратно в today если отменяется сегодняшний день
        const today = getTodayLocalISO()
        if (date === today && incompleteGoalIds.length > 0) {
          try {
              // Переносим все incomplete goals обратно в today
            useGoalsStore.getState().moveToToday(incompleteGoalIds)
            console.log(`[DayStateStore] Restored ${incompleteGoalIds.length} incomplete goals back to today`)
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

      completePendingReview: (date) => {
        set((state) => {
          const newPendingReview = { ...state.pendingReview }
          delete newPendingReview[date]
          return { pendingReview: newPendingReview }
        })
      },

      updateLastActiveDate: () => {
        // Сохраняем точное время для корректной обработки merge conflicts
        const now = new Date().toISOString()
        set({ lastActiveDate: now })
      },

      getPendingReviewDates: () => {
        return Object.keys(get().pendingReview)
      },

      getGoalsForReview: (date) => {
        return get().pendingReview[date] || []
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
syncService.registerPendingReviewsApplyHandler((reviewBlock) => {
  useDayStateStore.setState((state) => {
    // pendingReview приходит с бекенда - goals сгруппированы по датам
    const serverPendingReview = reviewBlock.pendingReview || {}

    // Применяем dayEnded от бекенда
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
      } catch (error) {
        console.error("[DayStateStore] Failed to apply dayEnded:", error)
      }
    }

    return {
      ...state,
      pendingReview: serverPendingReview,
      dayStates: newDayStates,
    }
  })
})

