"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Goal } from "@/lib/types"
import { goalsArraySchema } from "@/lib/schemas/goal.schema"
import { generateId } from "@/lib/utils/id"
import { syncService } from "@/lib/services/sync-service"

type GoalsState = {
  goals: Goal[]
  isLoaded: boolean
}

type GoalsActions = {
  // Goal CRUD operations
  addGoal: (title: string, label: string, description: string, targetDate?: string) => void
  updateGoal: (id: string, title: string, label: string, description: string) => void
  deleteGoal: (id: string) => void
  toggleComplete: (id: string) => void
  toggleImportant: (id: string) => void
  rescheduleForTomorrow: (id: string) => void
  moveToToday: (goalIds: string[] | string) => void
  moveToBacklog: (id: string) => void
  
  // Batch operations
  setGoals: (goals: Goal[]) => void
  
  // Selectors helpers
  getGoalById: (id: string) => Goal | undefined
  getGoalsForDate: (date: Date) => Goal[]
  getBacklogGoals: () => Goal[]
  getTemporaryGoals: () => Goal[]
}

type GoalsStore = GoalsState & GoalsActions

export const useGoalsStore = create<GoalsStore>()(
  persist(
    (set, get) => ({
      goals: [],
      isLoaded: false,

      addGoal: (title, label, description, targetDate) => {
        let finalTargetDate: string

        if (targetDate) {
          finalTargetDate = targetDate
        } else {
          finalTargetDate = new Date().toDateString()
        }

        const newGoal: Goal = {
          id: generateId(),
          title,
          description: description || undefined,
          type: "goal",
          completed: false,
          targetDate: finalTargetDate,
          label: label ? label.toUpperCase() : label,
        }

        set((state) => ({
          goals: [...state.goals, newGoal],
        }))

        syncService.enqueueGoalChange("create", newGoal)
      },

      updateGoal: (id, title, label, description) => {
        let updatedGoal: Goal | undefined

        set((state) => {
          const goal = state.goals.find((g) => g.id === id)
          if (!goal) return state

          updatedGoal = {
            ...goal,
            title,
            label: label ? label.toUpperCase() : label,
            description: description || undefined,
          }

          return {
            goals: state.goals.map((g) => (g.id === id ? updatedGoal! : g)),
          }
        })

        if (updatedGoal) {
          syncService.enqueueGoalChange("update", updatedGoal)
          syncService.sync()
        }
      },

      deleteGoal: (id) => {
        const goalToDelete = get().goals.find((g) => g.id === id)
        if (!goalToDelete) return

        // Удаляем из UI
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        }))

        // enqueueGoalChange схлопнет create+delete или отправит delete для существующей
        syncService.enqueueGoalChange("delete", goalToDelete)
        syncService.sync()
      },

      toggleComplete: (id) => {
        let updatedGoal: Goal | undefined

        set((state) => {
          const goal = state.goals.find((g) => g.id === id)
          if (!goal) return state

          updatedGoal = {
            ...goal,
            completed: !goal.completed,
          }

          return {
            goals: state.goals.map((g) => (g.id === id ? updatedGoal! : g)),
          }
        })

        if (updatedGoal) {
          syncService.enqueueGoalChange("update", updatedGoal)
        }
      },

      toggleImportant: (id) => {
        let updatedGoal: Goal | undefined

        set((state) => {
          const goal = state.goals.find((g) => g.id === id)
          if (!goal) return state

          updatedGoal = {
            ...goal,
            important: !goal.important,
          }

          return {
            goals: state.goals.map((g) => (g.id === id ? updatedGoal! : g)),
          }
        })

        if (updatedGoal) {
          syncService.enqueueGoalChange("update", updatedGoal)
        }
      },

      rescheduleForTomorrow: (id) => {
        const tomorrow = new Date(Date.now() + 86400000).toDateString()
        let updatedGoal: Goal | undefined

        set((state) => {
          const goal = state.goals.find((g) => g.id === id)
          if (!goal) return state

          updatedGoal = {
            ...goal,
            targetDate: goal.type === "goal" ? tomorrow : goal.targetDate,
            completed: false,
          }

          return {
            goals: state.goals.map((g) => (g.id === id ? updatedGoal! : g)),
          }
        })

        if (updatedGoal) {
          syncService.enqueueGoalChange("update", updatedGoal)
          syncService.sync()
        }
      },

      moveToToday: (goalIds) => {
        const todayDate = new Date().toDateString()
        const idsArray = Array.isArray(goalIds) ? goalIds : [goalIds]
        const updatedGoals: Goal[] = []

        set((state) => {
          const goals = state.goals.map((g) => {
            if (idsArray.includes(g.id)) {
              const updated = {
                ...g,
                targetDate: todayDate,
                completed: false,
              }
              updatedGoals.push(updated)
              return updated
            }
            return g
          })

          return { goals }
        })

        updatedGoals.forEach((goal) => {
          syncService.enqueueGoalChange("update", goal)
        })
      },

      moveToBacklog: (id) => {
        let updatedGoal: Goal | undefined

        set((state) => {
          const goal = state.goals.find((g) => g.id === id)
          if (!goal) return state

          updatedGoal = {
            ...goal,
            targetDate: "backlog",
            completed: false,
          }

          return {
            goals: state.goals.map((g) => (g.id === id ? updatedGoal! : g)),
          }
        })

        if (updatedGoal) {
          syncService.enqueueGoalChange("update", updatedGoal)
        }
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
          (g) => g.type === "goal" && g.targetDate === dateString
        )
      },

      getBacklogGoals: () => {
        return get().goals.filter(
          (g) => g.type === "goal" && g.targetDate === "backlog"
        )
      },

      getTemporaryGoals: () => {
        return get().goals.filter((g) => g.type === "goal")
      },
    }),
    {
      name: "goals-storage",
      storage: createJSONStorage(() => {
        // Add validation on load
        return {
          getItem: (name) => {
            if (typeof window === 'undefined') return null
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
            if (typeof window === 'undefined') return
            try {
              localStorage.setItem(name, value)
            } catch (error) {
              console.error("Error saving goals to localStorage:", error)
            }
          },
          removeItem: (name) => {
            if (typeof window === 'undefined') return
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

// Зарегистрировать обработчик применения целей от backend
// Выполняет merge локальных и серверных данных по _localUpdatedAt
syncService.registerGoalsApplyHandler((serverGoals) => {
  useGoalsStore.setState((state) => {
    const localGoals = state.goals || []
    const serverGoalsMap = new Map(serverGoals.map(g => [g.id, g]))
    const mergedGoals: Goal[] = []
    const processedIds = new Set<string>()

    // Обрабатываем локальные цели
    for (const localGoal of localGoals) {
      const serverGoal = serverGoalsMap.get(localGoal.id)
      
      if (serverGoal) {
        // Сущность есть и локально, и на сервере - делаем merge
        const localUpdatedAt = localGoal._localUpdatedAt || 0
        const serverUpdatedAt = serverGoal._localUpdatedAt || 0
        
        // Берем более новую версию
        const selectedGoal = localUpdatedAt > serverUpdatedAt ? localGoal : serverGoal
        mergedGoals.push({
          ...selectedGoal,
          label: selectedGoal.label?.toUpperCase() || selectedGoal.label,
        })
        processedIds.add(localGoal.id)
      } else {
        // Сущность есть только локально - оставляем локальную
        mergedGoals.push({
          ...localGoal,
          label: localGoal.label?.toUpperCase() || localGoal.label,
        })
        processedIds.add(localGoal.id)
      }
    }

    // Добавляем серверные цели, которых нет локально
    for (const serverGoal of serverGoals) {
      if (!processedIds.has(serverGoal.id)) {
        mergedGoals.push({
          ...serverGoal,
          label: serverGoal.label?.toUpperCase() || serverGoal.label,
        })
      }
    }

    return {
      goals: mergedGoals,
    isLoaded: true,
    }
  })
})

