"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Goal, Habit, RepeatType } from "@/lib/types"
import { habitsArraySchema } from "@/lib/schemas/common.schema"
import { generateId } from "@/lib/utils/id"
import { syncService } from "@/lib/services/sync"

type HabitsState = {
  habits: Habit[]
  isLoaded: boolean
}

type HabitsActions = {
  // Habit CRUD operations
  addHabit: (title: string, repeatType: RepeatType, repeatDays?: number[], globalGoalId?: string) => void
  updateHabit: (id: string, title: string, repeatType: RepeatType, repeatDays?: number[], globalGoalId?: string) => void
  deleteHabit: (id: string) => void
  
  // Completion tracking
  toggleHabitCompletion: (habitId: string, date: Date) => void
  isHabitCompletedForDate: (habitId: string, date: Date) => boolean
  
  // Utility functions
  isHabitScheduledForDate: (habit: Habit, date: Date) => boolean
  calculateStreak: (habitId: string) => number
  calculateMaxStreak: (habitId: string) => number
  getHabitsForDate: (date: Date) => Habit[]
  getAllHabits: () => Habit[]

  // Batch operations
  setHabits: (habits: Habit[]) => void
}

type HabitsStore = HabitsState & HabitsActions

export const useHabitsStore = create<HabitsStore>()(
  persist(
    (set, get) => ({
      habits: [],
      isLoaded: false,

      addHabit: (title, repeatType, repeatDays, globalGoalId) => {
        const newHabit: Habit = {
          id: generateId(),
          title,
          completed: false,
          repeatType,
          repeatDays: repeatType === "weekly" ? repeatDays : undefined,
          globalGoalId,
          currentStreak: 0,
          maxStreak: 0,
          lastCompletedDate: undefined,
          completions: {},
          _version: 0, // Начальная версия для новой привычки
        }

        set((state) => ({
          habits: [...state.habits, newHabit],
        }))

        syncService.enqueueHabitChange("create", newHabit)
      },

      updateHabit: (id, title, repeatType, repeatDays, globalGoalId) => {
        let updatedHabit: Habit | undefined

        set((state) => {
          const habit = state.habits.find((h) => h.id === id)
          if (!habit) return state

          updatedHabit = {
            ...habit,
            title,
            repeatType,
            repeatDays: repeatType === "weekly" ? repeatDays : undefined,
            globalGoalId,
          }

          return {
            habits: state.habits.map((h) => (h.id === id ? updatedHabit! : h)),
          }
        })

        if (updatedHabit) {
          syncService.enqueueHabitChange("update", updatedHabit)
        }
      },

      deleteHabit: (id) => {
        const habitToDelete = get().habits.find((h) => h.id === id)
        if (!habitToDelete) return

        // Удаляем из UI
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
        }))

        // enqueueHabitChange схлопнет create+delete или отправит delete для существующей
        syncService.enqueueHabitChange("delete", habitToDelete)
      },

      toggleHabitCompletion: (habitId, date) => {
        const dateString = date.toDateString()
        let updatedHabit: Habit | undefined

        set((state) => {
          const habit = state.habits.find((h) => h.id === habitId)
          if (!habit) return state

          // Получаем текущий статус выполнения для этой даты
          const currentCompletions = habit.completions || {}
          const isCurrentlyCompleted = currentCompletions[dateString] || false
          const isCompleting = !isCurrentlyCompleted

          // Обновляем completions
          const newCompletions = {
            ...currentCompletions,
            [dateString]: isCompleting,
          }

          // Если снимаем отметку, удаляем запись (опционально, можно оставить false)
          if (!isCompleting) {
            delete newCompletions[dateString]
          }

          // Update streak
          const updatedHabits = state.habits.map((h) => {
            if (h.id !== habitId) return h

            if (isCompleting) {
              // Calculate new streak
              let newStreak = 1

              if (h.lastCompletedDate) {
                const lastDate = new Date(h.lastCompletedDate)
                const currentDate = new Date(date)
                lastDate.setHours(0, 0, 0, 0)
                currentDate.setHours(0, 0, 0, 0)

                // Find next scheduled day after lastDate
                const nextScheduled = new Date(lastDate)
                nextScheduled.setDate(nextScheduled.getDate() + 1)

                // Keep incrementing until we find a scheduled day
                while (!get().isHabitScheduledForDate(habit, nextScheduled)) {
                  nextScheduled.setDate(nextScheduled.getDate() + 1)
                  // Safety: stop after 7 days for weekly, 1 day for daily
                  if (nextScheduled > currentDate) break
                }

                // If current date is the next scheduled day -> continue streak
                if (nextScheduled.getTime() === currentDate.getTime()) {
                  newStreak = (h.currentStreak || 0) + 1
                }
                // Otherwise streak resets to 1 (missed days)
              }

              updatedHabit = {
                ...h,
                currentStreak: newStreak,
                maxStreak: Math.max(newStreak, h.maxStreak || 0),
                lastCompletedDate: dateString,
                completions: newCompletions,
              }

              return updatedHabit
            } else {
              // Unchecking - decrease streak
              updatedHabit = {
                ...h,
                currentStreak: Math.max(0, (h.currentStreak || 0) - 1),
                completions: newCompletions,
              }

              return updatedHabit
            }
          })

          return { habits: updatedHabits }
        })

        // Добавляем изменения в очередь синхронизации
        if (updatedHabit) {
          syncService.enqueueHabitChange("update", updatedHabit)
        }
      },

      isHabitCompletedForDate: (habitId, date) => {
        const dateString = date.toDateString()
        const habit = get().habits.find((h) => h.id === habitId)
        if (!habit) return false
        return habit.completions?.[dateString] || false
      },

      isHabitScheduledForDate: (habit, date) => {
        if (habit.repeatType === "daily") return true
        if (habit.repeatType === "weekly" && habit.repeatDays) {
          const dayOfWeek = date.getDay()
          return habit.repeatDays.includes(dayOfWeek)
        }
        return false
      },

      calculateStreak: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId)
        return habit?.currentStreak || 0
      },

      calculateMaxStreak: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId)
        return habit?.maxStreak || 0
      },

      getHabitsForDate: (date) => {
        const habits = get().habits
        return habits.filter((h) => get().isHabitScheduledForDate(h, date))
      },

      getAllHabits: () => {
        return get().habits
      },

      setHabits: (habits) => {
        set({ habits })
      },
    }),
    {
      name: "habits-storage",
      storage: createJSONStorage(() => {
        return {
          getItem: (name) => {
            if (typeof window === 'undefined') return null
            try {
              const str = localStorage.getItem(name)
              if (!str) return null

              const parsed = JSON.parse(str)

              // Validate habits (поддерживаем старый формат goals для миграции)
              if (parsed.state?.goals && !parsed.state?.habits) {
                // Миграция: переименовываем goals в habits
                parsed.state.habits = parsed.state.goals
                delete parsed.state.goals
              }
              
              if (parsed.state?.habits) {
                const habitsResult = habitsArraySchema.safeParse(parsed.state.habits)
                if (!habitsResult.success) {
                  console.error("Invalid habits data in localStorage:", habitsResult.error)
                  parsed.state.habits = []
                }
              }

              return JSON.stringify(parsed)
            } catch (error) {
              console.error("Error loading habits from localStorage:", error)
              return JSON.stringify({ state: { habits: [], isLoaded: false } })
            }
          },
          setItem: (name, value) => {
            if (typeof window === 'undefined') return
            try {
              localStorage.setItem(name, value)
            } catch (error) {
              console.error("Error saving habits to localStorage:", error)
            }
          },
          removeItem: (name) => {
            if (typeof window === 'undefined') return
            try {
              localStorage.removeItem(name)
            } catch (error) {
              console.error("Error removing habits from localStorage:", error)
            }
          },
        }
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoaded = true
        }
      },
    }
  )
)

// Зарегистрировать обработчики применения данных о привычках от backend
// Выполняет merge локальных и серверных данных по _version
syncService.registerHabitsApplyHandler((serverHabits) => {
  useHabitsStore.setState((state) => {
    const localHabits = state.habits || []
    const serverHabitsMap = new Map(serverHabits.map(h => [h.id, h]))
    const mergedHabits: Habit[] = []
    const processedIds = new Set<string>()

    // Обрабатываем локальные привычки
    for (const localHabit of localHabits) {
      const serverHabit = serverHabitsMap.get(localHabit.id)

      if (serverHabit) {
        // Сущность есть и локально, и на сервере - делаем merge
        const localVersion = localHabit._version || 0
        const serverVersion = serverHabit._version || 0

        // КРИТИЧНО: Берем версию с большим _version (backend авторитетен)
        // Если версии равны, сравниваем по _localUpdatedAt (для оффлайн изменений)
        let selectedHabit: Habit
        if (serverVersion > localVersion) {
          // Серверная версия новее - берем её
          selectedHabit = serverHabit
        } else if (serverVersion === localVersion) {
          // Версии равны - сравниваем по времени изменения
          const localUpdatedAt = localHabit._localUpdatedAt || 0
          const serverUpdatedAt = serverHabit._localUpdatedAt || 0
          selectedHabit = localUpdatedAt > serverUpdatedAt ? localHabit : serverHabit
        } else {
          // Локальная версия новее (не должно быть в норме, но возможно при оффлайн изменениях)
          selectedHabit = localHabit
        }

        mergedHabits.push(selectedHabit)
        processedIds.add(localHabit.id)
      } else {
        // Сущность есть только локально - оставляем локальную
        mergedHabits.push(localHabit)
        processedIds.add(localHabit.id)
      }
    }

    // Добавляем серверные привычки, которых нет локально
    for (const serverHabit of serverHabits) {
      if (!processedIds.has(serverHabit.id)) {
        mergedHabits.push(serverHabit)
      }
    }

    return {
      ...state,
      habits: mergedHabits,
    }
  })
})

syncService.registerHabitsDeleteHandler((habitIds) => {
  useHabitsStore.setState((state) => ({
    habits: state.habits.filter(h => !habitIds.includes(h.id)),
  }))
})


