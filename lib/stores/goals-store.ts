"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Goal } from "@/lib/types"
import { goalsArraySchema } from "@/lib/schemas/goal.schema"
import { generateId } from "@/lib/utils/id"

type GoalsState = {
  goals: Goal[]
  isLoaded: boolean
}

type GoalsActions = {
  // Goal CRUD operations
  addGoal: (title: string, label: string, targetDate?: string) => void
  updateGoal: (id: string, title: string, label: string) => void
  deleteGoal: (id: string) => void
  toggleComplete: (id: string) => void
  toggleImportant: (id: string) => void
  rescheduleForTomorrow: (id: string) => void
  moveToToday: (goalIds: string[]) => void
  
  // Batch operations
  setGoals: (goals: Goal[]) => void
  
  // Selectors helpers
  getGoalById: (id: string) => Goal | undefined
  getGoalsForDate: (date: Date) => Goal[]
  getBacklogGoals: () => Goal[]
  getTemporaryGoals: () => Goal[]
  getHabits: () => Goal[]
}

type GoalsStore = GoalsState & GoalsActions

export const useGoalsStore = create<GoalsStore>()(
  persist(
    (set, get) => ({
      goals: [],
      isLoaded: false,

      addGoal: (title, label, targetDate) => {
        let finalTargetDate: string

        if (targetDate) {
          finalTargetDate = targetDate
        } else {
          finalTargetDate = new Date().toDateString()
        }

        const newGoal: Goal = {
          id: generateId(),
          title,
          type: "temporary",
          completed: false,
          targetDate: finalTargetDate,
          label,
        }

        set((state) => ({
          goals: [...state.goals, newGoal],
        }))
      },

      updateGoal: (id, title, label) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, title, label } : g)),
        }))
      },

      deleteGoal: (id) => {
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        }))
      },

      toggleComplete: (id) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g)),
        }))
      },

      toggleImportant: (id) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, important: !g.important } : g)),
        }))
      },

      rescheduleForTomorrow: (id) => {
        const tomorrow = new Date(Date.now() + 86400000).toDateString()
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id
              ? {
                  ...g,
                  targetDate: g.type === "temporary" ? tomorrow : g.targetDate,
                  completed: false,
                }
              : g
          ),
        }))
      },

      moveToToday: (goalIds) => {
        const todayDate = new Date().toDateString()
        set((state) => ({
          goals: state.goals.map((g) =>
            goalIds.includes(g.id)
              ? {
                  ...g,
                  targetDate: todayDate,
                  completed: false,
                }
              : g
          ),
        }))
      },

      setGoals: (goals) => {
        set({ goals })
      },

      getGoalById: (id) => {
        return get().goals.find((g) => g.id === id)
      },

      getGoalsForDate: (date) => {
        const dateString = date.toDateString()
        return get().goals.filter(
          (g) => g.type === "temporary" && g.targetDate === dateString
        )
      },

      getBacklogGoals: () => {
        return get().goals.filter((g) => g.type === "temporary" && g.targetDate === "backlog")
      },

      getTemporaryGoals: () => {
        return get().goals.filter((g) => g.type === "temporary")
      },

      getHabits: () => {
        return get().goals.filter((g) => g.type === "habit")
      },
    }),
    {
      name: "goals-storage",
      storage: createJSONStorage(() => {
        // Add validation on load
        return {
          getItem: (name) => {
            try {
              const str = localStorage.getItem(name)
              if (!str) return null

              const parsed = JSON.parse(str)
              
              // Validate the state structure
              if (parsed.state?.goals) {
                const result = goalsArraySchema.safeParse(parsed.state.goals)
                if (!result.success) {
                  console.error("Invalid goals data in localStorage:", result.error)
                  return JSON.stringify({ state: { goals: [], isLoaded: false } })
                }
              }

              return str
            } catch (error) {
              console.error("Error loading goals from localStorage:", error)
              return JSON.stringify({ state: { goals: [], isLoaded: false } })
            }
          },
          setItem: (name, value) => {
            try {
              localStorage.setItem(name, value)
            } catch (error) {
              console.error("Error saving goals to localStorage:", error)
            }
          },
          removeItem: (name) => {
            try {
              localStorage.removeItem(name)
            } catch (error) {
              console.error("Error removing goals from localStorage:", error)
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

