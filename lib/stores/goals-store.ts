"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Goal } from "@/lib/types"
import { goalsArraySchema } from "@/lib/schemas/common.schema"
import { generateId } from "@/lib/utils/id"
import { syncService } from "@/lib/services/sync"
import { format } from "date-fns"

// Helper to format date to ISO format (YYYY-MM-DD)
const toISODateString = (date: Date): string => format(date, "yyyy-MM-dd")

type GoalsState = {
  goals: Goal[]
  isLoaded: boolean
}

type GoalsActions = {
  // Goal CRUD operations
  addGoal: (title: string, label: string, description: string, options?: { targetDate?: string; isBacklog?: boolean }, globalGoalId?: string, milestoneId?: string) => void
  updateGoal: (id: string, title: string, label: string, description: string, globalGoalId?: string, milestoneId?: string) => void
  linkToGlobalGoal: (goalId: string, globalGoalId: string | undefined, milestoneId?: string) => void
  deleteGoal: (id: string) => void
  toggleComplete: (id: string) => void
  toggleImportant: (id: string) => void
  rescheduleForTomorrow: (id: string) => void
  moveToToday: (goalIds: string[] | string) => void
  moveToDate: (goalIds: string[] | string, targetDate: string) => void
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

      addGoal: (title, label, description, options, globalGoalId, milestoneId) => {
        const newGoal: Goal = {
          id: generateId(),
          title,
          description: description || undefined,
          completed: false,
          // Either targetDate or isBacklog, not both
          targetDate: options?.isBacklog ? undefined : (options?.targetDate || toISODateString(new Date())),
          isBacklog: options?.isBacklog || undefined,
          label: label ? label.toUpperCase() : label,
          globalGoalId: globalGoalId || undefined,
          milestoneId: milestoneId || undefined,
          _version: 0, // Начальная версия для новой цели
        }

        set((state) => ({
          goals: [...state.goals, newGoal],
        }))

        syncService.enqueueGoalChange("create", newGoal)
      },

      updateGoal: (id, title, label, description, globalGoalId, milestoneId) => {
        let updatedGoal: Goal | undefined

        set((state) => {
          const goal = state.goals.find((g) => g.id === id)
          if (!goal) return state


          updatedGoal = {
            ...goal,
            title,
            label: label ? label.toUpperCase() : label,
            description: description || undefined,
            globalGoalId: globalGoalId,
            milestoneId: milestoneId,
            meta: goal.meta,
          }


          return {
            goals: state.goals.map((g) => (g.id === id ? updatedGoal! : g)),
          }
        })

        if (updatedGoal) {
          syncService.enqueueGoalChange("update", updatedGoal)
        }
      },

      linkToGlobalGoal: (goalId, globalGoalId, milestoneId) => {
        let updatedGoal: Goal | undefined

        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId)
          if (!goal) return state

          updatedGoal = {
            ...goal,
            globalGoalId: globalGoalId,
            milestoneId: milestoneId,
          }

          return {
            goals: state.goals.map((g) => (g.id === goalId ? updatedGoal! : g)),
          }
        })

        if (updatedGoal) {
          syncService.enqueueGoalChange("update", updatedGoal)
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
        const tomorrow = toISODateString(new Date(Date.now() + 86400000))
        let updatedGoal: Goal | undefined

        set((state) => {
          const goal = state.goals.find((g) => g.id === id)
          if (!goal) return state

          updatedGoal = {
            ...goal,
            targetDate: tomorrow,
            isBacklog: undefined, // Clear backlog flag when scheduling
            completed: false,
            meta: goal.meta,
          }

          return {
            goals: state.goals.map((g) => (g.id === id ? updatedGoal! : g)),
          }
        })

        if (updatedGoal) {
          syncService.enqueueGoalChange("update", updatedGoal)
        }
      },

      moveToToday: (goalIds) => {
        const todayDate = toISODateString(new Date())
        const idsArray = Array.isArray(goalIds) ? goalIds : [goalIds]
        const updatedGoals: Goal[] = []

        set((state) => {
          const goals = state.goals.map((g) => {
            if (idsArray.includes(g.id)) {
              const updated = {
                ...g,
                targetDate: todayDate,
                isBacklog: undefined, // Clear backlog flag when moving to today
                completed: false,
                meta: g.meta,
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

      moveToDate: (goalIds, targetDate) => {
        const idsArray = Array.isArray(goalIds) ? goalIds : [goalIds]
        const updatedGoals: Goal[] = []

        set((state) => {
          const goals = state.goals.map((g) => {
            if (idsArray.includes(g.id)) {
              const updated = {
                ...g,
                targetDate: targetDate,
                isBacklog: undefined, // Clear backlog flag when moving to a date
                completed: false,
                meta: g.meta,
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
            targetDate: undefined, // Clear date when moving to backlog
            isBacklog: true,
            completed: false,
            meta: goal.meta,
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
        const dateString = toISODateString(date)
        return get().goals.filter(
          (g) => g.targetDate === dateString && !g.isBacklog
        )
      },

      getBacklogGoals: () => {
        return get().goals.filter(
          (g) => g.isBacklog === true
        )
      },

      getTemporaryGoals: () => {
        return get().goals
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
// Выполняет merge локальных и серверных данных по _version
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
        const localVersion = localGoal._version || 0
        const serverVersion = serverGoal._version || 0

        // КРИТИЧНО: Берем версию с большим _version (backend авторитетен)
        // Если версии равны, сравниваем по _localUpdatedAt (для оффлайн изменений)
        let selectedGoal: Goal
        if (serverVersion > localVersion) {
          // Серверная версия новее - берем её
          selectedGoal = serverGoal
        } else if (serverVersion === localVersion) {
          // Версии равны - сравниваем по времени изменения
          const localUpdatedAt = localGoal._localUpdatedAt || 0
          const serverUpdatedAt = serverGoal._localUpdatedAt || 0
          selectedGoal = localUpdatedAt > serverUpdatedAt ? localGoal : serverGoal
        } else {
          // Локальная версия новее (не должно быть в норме, но возможно при оффлайн изменениях)
          selectedGoal = localGoal
        }

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


    const newState = {
      goals: mergedGoals,
      isLoaded: true,
    }

    return newState
  })

  // Проверяем сразу после setState (синхронно)
  const goalsAfterSetState = useGoalsStore.getState().goals

  // Проверяем что сохранилось после setState (async)
  setTimeout(() => {
    const currentGoals = useGoalsStore.getState().goals
  }, 100)
})

syncService.registerGoalsDeleteHandler((goalIds) => {
  useGoalsStore.setState((state) => ({
    goals: state.goals.filter(g => !goalIds.includes(g.id)),
  }))
})

