"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { getTodayLocalISO } from "@/lib/utils/date"
import { syncService } from "@/lib/services/sync-service"

type DayState = {
  date: string // ISO date format "2025-11-10"
  isEndDay: boolean
}

type DayStateStore = {
  dayStates: Record<string, DayState> // key is ISO date string
  lastActiveDate: string | null // последняя дата активности пользователя
  pendingReviewDates: string[] // даты, для которых нужно показать review диалог
  
  // Actions
  markDayAsEnded: (date: string) => void
  cancelDayEnd: (date: string) => void
  isDayEnded: (date: string) => boolean
  getTodayState: () => DayState
  isTodayEnded: () => boolean
  
  // Новые методы для автоматического закрытия дней
  checkMissedDays: (goals: Array<{ targetDate?: string; type: string }>) => void
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
        set((state) => ({
          dayStates: {
            ...state.dayStates,
            [date]: {
              date,
              isEndDay: true,
            },
          },
        }))
        
        // CRITICAL EVENT: синхронизируем сразу
        syncService.sync()
      },

      cancelDayEnd: (date) => {
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

      // Проверка пропущенных дней и автоматическое закрытие
      checkMissedDays: (goals) => {
        const today = getTodayLocalISO()
        const lastActive = get().lastActiveDate
        
        // Если первый запуск или активность была сегодня - ничего не делаем
        if (!lastActive || lastActive === today) {
          get().updateLastActiveDate()
          return
        }

        // Считаем пропущенные дни
        const lastActiveDate = new Date(lastActive + "T00:00:00")
        const todayDate = new Date(today + "T00:00:00")
        const diffInMs = todayDate.getTime() - lastActiveDate.getTime()
        let diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

        if (diffInDays <= 0) {
          get().updateLastActiveDate()
          return
        }

      // Для каждого пропущенного дня между lastActive и today
      // Закрываем максимум ПЕРВЫЕ 2 пропущенных дня (включая lastActive если не закрыт)
      const missedDates: string[] = []
      let closedCount = 0
      
      // Начинаем с lastActive (i=0), заканчиваем до today (i < diffInDays)
      // Закрываем максимум 2 дня
      for (let i = 0; i < diffInDays && closedCount < 2; i++) {
        const missedDate = new Date(lastActiveDate)
        missedDate.setDate(missedDate.getDate() + i)
        const missedDateISO = missedDate.toISOString().split('T')[0]
        
        // Проверяем, не был ли этот день уже закрыт
        if (!get().isDayEnded(missedDateISO)) {
          // Конвертируем ISO дату в toDateString для сравнения с goals
          const missedDateAsDateString = new Date(missedDateISO + "T00:00:00").toDateString()
          
          // Проверяем, были ли goals для этого дня
          const hasGoals = goals.some(
            (g) => g.type === "temporary" && g.targetDate === missedDateAsDateString
          )
          
          if (hasGoals) {
            // Есть goals - добавляем в очередь для review
            missedDates.push(missedDateISO)
            // Автоматически помечаем день как завершенный
            get().markDayAsEnded(missedDateISO)
            closedCount++
          }
          // Если нет goals - просто пропускаем день (не закрываем его)
        }
      }

        // Добавляем пропущенные даты в очередь на review
        if (missedDates.length > 0) {
          set((state) => ({
            pendingReviewDates: [...missedDates, ...state.pendingReviewDates],
          }))
        }

        // Обновляем lastActiveDate на сегодня
        get().updateLastActiveDate()
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
        
        // CRITICAL EVENT: синхронизируем сразу
        syncService.sync()
      },

      updateLastActiveDate: () => {
        const today = getTodayLocalISO()
        set({ lastActiveDate: today })
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

