"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Goal, Habit, RepeatType } from "@/lib/types"
import { habitsArraySchema } from "@/lib/schemas/common.schema"
import { generateId } from "@/lib/utils/id"
import { syncService } from "@/lib/services/sync"

// Вспомогательная функция для проверки scheduled дня
function isHabitScheduledForDateStatic(habit: Habit, date: Date): boolean {
  if (habit.repeatType === "daily") return true
  if (habit.repeatType === "weekly" && habit.repeatDays) {
    const dayOfWeek = date.getDay()
    return habit.repeatDays.includes(dayOfWeek)
  }
  return false
}

// Проверяет, есть ли пропущенные scheduled дни между двумя датами
function hasGapBetweenDates(habit: Habit, olderDate: Date, newerDate: Date): boolean {
  const current = new Date(olderDate)
  current.setDate(current.getDate() + 1)

  while (current < newerDate) {
    if (isHabitScheduledForDateStatic(habit, current)) {
      return true // Нашли scheduled день, который пропущен
    }
    current.setDate(current.getDate() + 1)
  }
  return false
}

// Конвертирует Date в ISO строку (YYYY-MM-DD) в локальном timezone
function toISODateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Пересчитывает currentStreak и maxStreak на основе completions
function calculateStreaksFromCompletions(habit: Habit): { currentStreak: number; maxStreak: number } {
  const completions = habit.completions || []

  if (completions.length === 0) {
    return { currentStreak: 0, maxStreak: 0 }
  }

  // Конвертируем ISO строки в даты и сортируем от новых к старым
  const completedDates = completions
    .map((dateStr) => new Date(dateStr))
    .sort((a, b) => b.getTime() - a.getTime())

  // Вчерашняя дата (сегодня не считается)
  const yesterday = new Date()
  yesterday.setHours(0, 0, 0, 0)
  yesterday.setDate(yesterday.getDate() - 1)

  // Set для быстрой проверки наличия даты
  const completionsSet = new Set(completions)

  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 0
  let currentStreakBroken = false

  for (let i = 0; i < completedDates.length; i++) {
    const date = completedDates[i]
    date.setHours(0, 0, 0, 0)

    if (i === 0) {
      // Первая (самая новая) дата — проверяем связь со вчера
      if (!currentStreakBroken) {
        const yesterdayISO = toISODateString(yesterday)
        // Проверяем, есть ли пропущенные scheduled дни между этой датой и вчера
        if (hasGapBetweenDates(habit, date, yesterday) ||
            (isHabitScheduledForDateStatic(habit, yesterday) && date.getTime() !== yesterday.getTime() && !completionsSet.has(yesterdayISO))) {
          // Есть пропуск — currentStreak остаётся 0
          currentStreakBroken = true
        } else {
          currentStreak = 1
        }
      }
      tempStreak = 1
    } else {
      const prevDate = completedDates[i - 1]
      prevDate.setHours(0, 0, 0, 0)

      // Проверяем, есть ли пропущенные scheduled дни между текущей и предыдущей датой
      if (hasGapBetweenDates(habit, date, prevDate)) {
        // Есть пропуск — streak прерывается
        maxStreak = Math.max(maxStreak, tempStreak)
        tempStreak = 1
        currentStreakBroken = true
      } else {
        tempStreak++
        if (!currentStreakBroken) {
          currentStreak = tempStreak
        }
      }
    }
  }

  maxStreak = Math.max(maxStreak, tempStreak)

  return { currentStreak, maxStreak }
}

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
          completions: [],
          _version: 0,
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
        const dateISO = toISODateString(date)
        let updatedHabit: Habit | undefined

        set((state) => {
          const habit = state.habits.find((h) => h.id === habitId)
          if (!habit) return state

          const currentCompletions = habit.completions || []
          const isCurrentlyCompleted = currentCompletions.includes(dateISO)

          // Обновляем completions
          let newCompletions: string[]
          if (isCurrentlyCompleted) {
            // Снимаем отметку — удаляем дату из массива
            newCompletions = currentCompletions.filter((d) => d !== dateISO)
          } else {
            // Ставим отметку — добавляем дату в массив
            newCompletions = [...currentCompletions, dateISO]
          }

          // Создаём временный habit с новыми completions для пересчёта streaks
          const tempHabit = { ...habit, completions: newCompletions }
          const { currentStreak, maxStreak } = calculateStreaksFromCompletions(tempHabit)

          const updatedHabits = state.habits.map((h) => {
            if (h.id !== habitId) return h

            updatedHabit = {
              ...h,
              completions: newCompletions,
              currentStreak,
              maxStreak,
            }

            return updatedHabit
          })

          return { habits: updatedHabits }
        })

        // Добавляем изменения в очередь синхронизации
        if (updatedHabit) {
          syncService.enqueueHabitChange("update", updatedHabit)
        }
      },

      isHabitCompletedForDate: (habitId, date) => {
        const dateISO = toISODateString(date)
        const habit = get().habits.find((h) => h.id === habitId)
        if (!habit) return false
        return habit.completions?.includes(dateISO) || false
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


