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
  lastActiveDate: string | null // последняя дата и время активности пользователя (ISO datetime "2025-01-15T14:30:00.000Z")
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
        
        // Если первый запуск - ничего не делаем
        if (!lastActive) {
          get().updateLastActiveDate()
          return
        }

        // Парсим lastActiveDate (может быть ISO datetime или старый формат ISO date)
        const lastActiveDate = new Date(lastActive)
        const todayDate = new Date(today + "T00:00:00")
        
        // Сравниваем только даты (без времени) для определения пропущенных дней
        const lastActiveDateOnly = new Date(lastActiveDate.getFullYear(), lastActiveDate.getMonth(), lastActiveDate.getDate())
        const todayDateOnly = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())
        
        const diffInMs = todayDateOnly.getTime() - lastActiveDateOnly.getTime()
        let diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

        // Если активность была сегодня - ничего не делаем
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
        const missedDate = new Date(lastActiveDateOnly)
        missedDate.setDate(missedDate.getDate() + i)
        const missedDateISO = missedDate.toISOString().split('T')[0]
        
        // Проверяем, не был ли этот день уже закрыт
        if (!get().isDayEnded(missedDateISO)) {
          // Конвертируем ISO дату в toDateString для сравнения с goals
          const missedDateAsDateString = new Date(missedDateISO + "T00:00:00").toDateString()
          
          // Проверяем, были ли goals для этого дня
          const hasGoals = goals.some(
            (g) => g.type === "goal" && g.targetDate === missedDateAsDateString
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
// Выполняет merge локальных данных с данными от сервера
syncService.registerPendingReviewsApplyHandler((reviewBlock) => {
  useDayStateStore.setState((state) => {
    // Merge pendingReviewDates: объединяем локальные и серверные, убирая дубликаты
    const localDates = state.pendingReviewDates || []
    const serverDates = reviewBlock.pendingReviewDates || []
    const mergedDates = Array.from(new Set([...localDates, ...serverDates])).sort()

    // Применяем lastActiveDate от сервера, если он новее локального
    // Сравниваем по точному времени (ISO datetime) для корректной обработки merge conflicts
    let newLastActiveDate = state.lastActiveDate
    if (reviewBlock.lastActiveDate) {
      if (!state.lastActiveDate) {
        // Если локально нет - берем с сервера
        newLastActiveDate = reviewBlock.lastActiveDate
      } else {
        // Парсим ISO datetime (поддерживаем старый формат ISO date для обратной совместимости)
        const localDate = new Date(state.lastActiveDate)
        const serverDate = new Date(reviewBlock.lastActiveDate)
        
        // Сравниваем по точному времени: берем более новую
        if (serverDate > localDate) {
          newLastActiveDate = reviewBlock.lastActiveDate
        }
      }
    }

    return {
    ...state,
      pendingReviewDates: mergedDates,
      lastActiveDate: newLastActiveDate,
    }
  })
})

