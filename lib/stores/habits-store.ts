"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Goal, RepeatType, DayCompletion } from "@/lib/types"
import { goalsArraySchema, dayCompletionsArraySchema } from "@/lib/schemas/goal.schema"
import { generateId } from "@/lib/utils/id"

type HabitsState = {
  goals: Goal[]
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
  isHabitScheduledForDate: (habit: Goal, date: Date) => boolean
  calculateStreak: (habitId: string) => number
  getHabitsForDate: (date: Date) => Goal[]
  
  // Sync with goals store
  syncWithGoalsStore: (goals: Goal[]) => void
  getAllGoals: () => Goal[]
}

type HabitsStore = HabitsState & HabitsActions

export const useHabitsStore = create<HabitsStore>()(
  persist(
    (set, get) => ({
      goals: [],
      dayCompletions: [],
      isLoaded: false,

      addHabit: (title, repeatType, repeatDays) => {
        const newHabit: Goal = {
          id: generateId(),
          title,
          type: "habit",
          completed: false,
          repeatType,
          repeatDays: repeatType === "weekly" ? repeatDays : undefined,
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
      },

      toggleHabitCompletion: (habitId, date) => {
        const dateString = date.toDateString()
        
        set((state) => {
          const completions = [...state.dayCompletions]
          const dateIndex = completions.findIndex((c) => c.date === dateString)

          if (dateIndex === -1) {
            // Create new date entry
            completions.push({
              date: dateString,
              goals: [{ id: habitId, completed: true }],
            })
          } else {
            // Update existing date entry
            const goalIndex = completions[dateIndex].goals.findIndex((g) => g.id === habitId)
            if (goalIndex === -1) {
              completions[dateIndex].goals.push({ id: habitId, completed: true })
            } else {
              completions[dateIndex].goals[goalIndex].completed =
                !completions[dateIndex].goals[goalIndex].completed
            }
          }

          return { dayCompletions: completions }
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
        const completions = get().dayCompletions

        const sortedCompletions = completions
          .filter((c) => c.goals.some((g) => g.id === habitId))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        if (sortedCompletions.length === 0) return 0

        let streak = 0
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (let i = 0; i < sortedCompletions.length; i++) {
          const completionDate = new Date(sortedCompletions[i].date)
          completionDate.setHours(0, 0, 0, 0)

          const expectedDate = new Date(today)
          expectedDate.setDate(today.getDate() - i)
          expectedDate.setHours(0, 0, 0, 0)

          if (completionDate.getTime() !== expectedDate.getTime()) {
            break
          }

          const goalCompletion = sortedCompletions[i].goals.find((g) => g.id === habitId)
          if (goalCompletion?.completed) {
            streak++
          } else {
            break
          }
        }

        return streak
      },

      getHabitsForDate: (date) => {
        const habits = get().goals.filter((g) => g.type === "habit")
        return habits.filter((h) => get().isHabitScheduledForDate(h, date))
      },

      syncWithGoalsStore: (goals) => {
        // Only keep habits from the goals list
        const habits = goals.filter((g) => g.type === "habit")
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

