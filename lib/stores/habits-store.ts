"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Goal, Habit, RepeatType, DayCompletion } from "@/lib/types"
import { goalsArraySchema, dayCompletionsArraySchema } from "@/lib/schemas/goal.schema"
import { generateId } from "@/lib/utils/id"
import { syncService } from "@/lib/services/sync-service"

type HabitsState = {
  goals: Habit[]
  dayCompletions: DayCompletion[]
  isLoaded: boolean
}

type HabitsActions = {
  // Habit CRUD operations
  addHabit: (title: string, repeatType: RepeatType, repeatDays?: number[]) => void
  updateHabit: (id: string, title: string, repeatType: RepeatType, repeatDays?: number[]) => void
  deleteHabit: (id: string) => void
  
  // Completion tracking
  toggleHabitCompletion: (habitId: string, date: Date) => void
  isHabitCompletedForDate: (habitId: string, date: Date) => boolean
  
  // Utility functions
  isHabitScheduledForDate: (habit: Habit, date: Date) => boolean
  calculateStreak: (habitId: string) => number
  calculateMaxStreak: (habitId: string) => number
  getHabitsForDate: (date: Date) => Habit[]
  
  // Sync with goals store
  syncWithGoalsStore: (goals: Goal[]) => void
  getAllGoals: () => Habit[]
}

type HabitsStore = HabitsState & HabitsActions

export const useHabitsStore = create<HabitsStore>()(
  persist(
    (set, get) => ({
      goals: [],
      dayCompletions: [],
      isLoaded: false,

      addHabit: (title, repeatType, repeatDays) => {
        const newHabit: Habit = {
          id: generateId(),
          title,
          type: "habit",
          completed: false,
          repeatType,
          repeatDays: repeatType === "weekly" ? repeatDays : undefined,
          currentStreak: 0,
          maxStreak: 0,
          lastCompletedDate: undefined,
        }

        set((state) => ({
          goals: [...state.goals, newHabit],
        }))
      },

      updateHabit: (id, title, repeatType, repeatDays) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id
              ? {
                  ...g,
                  title,
                  repeatType,
                  repeatDays: repeatType === "weekly" ? repeatDays : undefined,
                }
              : g
          ),
        }))
      },

      deleteHabit: (id) => {
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        }))
        
        // При удалении привычки - синхронизируем (для notifications)
        // Не критично, но полезно для backend метрик
        syncService.sync()
      },

      toggleHabitCompletion: (habitId, date) => {
        const dateString = date.toDateString()
        
        set((state) => {
          const habit = state.goals.find((g) => g.id === habitId)
          if (!habit) return state

          const completions = [...state.dayCompletions]
          const dateIndex = completions.findIndex((c) => c.date === dateString)
          
          // Toggle completion status
          let isCompleting = false
          
          if (dateIndex === -1) {
            completions.push({
              date: dateString,
              goals: [{ id: habitId, completed: true }],
            })
            isCompleting = true
          } else {
            const goalIndex = completions[dateIndex].goals.findIndex((g) => g.id === habitId)
            if (goalIndex === -1) {
              completions[dateIndex].goals.push({ id: habitId, completed: true })
              isCompleting = true
            } else {
              isCompleting = !completions[dateIndex].goals[goalIndex].completed
              completions[dateIndex].goals[goalIndex].completed = isCompleting
            }
          }

          // Update streak
          const updatedGoals = state.goals.map((g) => {
            if (g.id !== habitId) return g

            if (isCompleting) {
              // Calculate new streak
              let newStreak = 1
              
              if (g.lastCompletedDate) {
                const lastDate = new Date(g.lastCompletedDate)
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
                  newStreak = (g.currentStreak || 0) + 1
                }
                // Otherwise streak resets to 1 (missed days)
              }

              return {
                ...g,
                currentStreak: newStreak,
                maxStreak: Math.max(newStreak, g.maxStreak || 0),
                lastCompletedDate: dateString,
              }
            } else {
              // Unchecking - decrease streak
              return {
                ...g,
                currentStreak: Math.max(0, (g.currentStreak || 0) - 1),
              }
            }
          })

          return { dayCompletions: completions, goals: updatedGoals }
        })
      },

      isHabitCompletedForDate: (habitId, date) => {
        const dateString = date.toDateString()
        const dateCompletion = get().dayCompletions.find((c) => c.date === dateString)

        if (!dateCompletion) return false
        const goalCompletion = dateCompletion.goals.find((g) => g.id === habitId)
        return goalCompletion?.completed || false
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
        const habit = get().goals.find((g) => g.id === habitId)
        return habit?.currentStreak || 0
      },

      calculateMaxStreak: (habitId) => {
        const habit = get().goals.find((g) => g.id === habitId)
        return habit?.maxStreak || 0
      },

      getHabitsForDate: (date) => {
        const habits = get().goals.filter((g) => g.type === "habit")
        return habits.filter((h) => get().isHabitScheduledForDate(h, date))
      },

      syncWithGoalsStore: (goals) => {
        // Only keep habits from the goals list
        const habits = goals.filter((g): g is Habit => g.type === "habit")
        set({ goals: habits })
      },

      getAllGoals: () => {
        return get().goals
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

              // Validate goals
              if (parsed.state?.goals) {
                const goalsResult = goalsArraySchema.safeParse(parsed.state.goals)
                if (!goalsResult.success) {
                  console.error("Invalid habits data in localStorage:", goalsResult.error)
                  parsed.state.goals = []
                }
              }

              // Validate day completions
              if (parsed.state?.dayCompletions) {
                const completionsResult = dayCompletionsArraySchema.safeParse(
                  parsed.state.dayCompletions
                )
                if (!completionsResult.success) {
                  console.error("Invalid completions data in localStorage:", completionsResult.error)
                  parsed.state.dayCompletions = []
                }
              }

              return JSON.stringify(parsed)
            } catch (error) {
              console.error("Error loading habits from localStorage:", error)
              return JSON.stringify({ state: { goals: [], dayCompletions: [], isLoaded: false } })
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

