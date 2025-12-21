"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { 
  GlobalGoal, 
  GlobalGoalType, 
  GlobalGoalStatus,
  Milestone,
  GlobalGoalProgress,
  OutcomeProgress,
  ProcessProgress,
  HybridProgress,
  Goal,
  Habit
} from "@/lib/types"
import { generateId } from "@/lib/utils/id"
import {
  getGlobalGoalsApi,
  createGlobalGoalApi,
  updateGlobalGoalApi,
  deleteGlobalGoalApi,
  createMilestoneApi,
  updateMilestoneApi,
  deleteMilestoneApi,
  activateMilestoneApi,
} from "@/lib/services/api-client"

type GlobalGoalsState = {
  globalGoals: GlobalGoal[]
  milestones: Milestone[]
  isLoaded: boolean
  isLoading: boolean
  error: string | null
}

type GlobalGoalsActions = {
  // Global Goal CRUD
  addGlobalGoal: (data: {
    type: GlobalGoalType
    title: string
    description?: string
    icon?: string
    periodStart: string
    periodEnd?: string
    targetValue?: number
    unit?: string
    initialMilestones?: { title: string; description?: string }[]
  }) => Promise<GlobalGoal>
  
  updateGlobalGoal: (id: string, data: {
    title?: string
    description?: string
    icon?: string
    status?: GlobalGoalStatus
    periodEnd?: string
    currentValue?: number
  }) => Promise<void>
  
  deleteGlobalGoal: (id: string) => Promise<void>
  
  // Milestone CRUD
  addMilestone: (globalGoalId: string, title: string, description?: string) => Promise<Milestone>
  updateMilestone: (globalGoalId: string, milestoneId: string, data: {
    title?: string
    description?: string
    order?: number
  }) => Promise<void>
  deleteMilestone: (globalGoalId: string, milestoneId: string) => Promise<void>
  activateMilestone: (globalGoalId: string, milestoneId: string) => Promise<void>
  completeMilestone: (globalGoalId: string, milestoneId: string) => Promise<void>
  
  // Sync
  fetchGlobalGoals: () => Promise<void>
  setGlobalGoals: (goals: GlobalGoal[]) => void
  setMilestones: (milestones: Milestone[]) => void
  
  // Selectors
  getGlobalGoalById: (id: string) => GlobalGoal | undefined
  getMilestonesForGoal: (goalId: string) => Milestone[]
  getActiveMilestone: (goalId: string) => Milestone | undefined
  
  // Progress calculation
  calculateProgress: (
    globalGoal: GlobalGoal, 
    linkedGoals: Goal[], 
    linkedHabits: Habit[]
  ) => GlobalGoalProgress
}

type GlobalGoalsStore = GlobalGoalsState & GlobalGoalsActions

// ============================================
// Progress Calculation Helpers
// ============================================

function calculateOutcomeProgress(
  globalGoal: GlobalGoal,
  milestones: Milestone[],
  linkedGoals: Goal[]
): OutcomeProgress {
  const activeMilestone = milestones.find(m => m.isActive)
  const now = new Date()
  
  // Calculate time in current milestone
  let timeInCurrentMilestone = 0
  if (activeMilestone?.enteredAt) {
    const enteredDate = new Date(activeMilestone.enteredAt)
    timeInCurrentMilestone = Math.floor((now.getTime() - enteredDate.getTime()) / (1000 * 60 * 60 * 24))
  }
  
  // Build milestone history - для контекста, НЕ для прогресса
  const milestoneHistory = milestones.map(m => {
    let daysSpent = 0
    if (m.enteredAt) {
      const enteredDate = new Date(m.enteredAt)
      const exitDate = m.exitedAt ? new Date(m.exitedAt) : (m.isActive ? now : enteredDate)
      daysSpent = Math.floor((exitDate.getTime() - enteredDate.getTime()) / (1000 * 60 * 60 * 24))
    }
    
    return {
      id: m.id,
      title: m.title,
      enteredAt: m.enteredAt,
      exitedAt: m.exitedAt,
      daysSpent,
      isCompleted: m.isCompleted
    }
  })
  
  // Activity by milestone - для контекста, НЕ для прогресса
  const activityByMilestone: OutcomeProgress['activityByMilestone'] = {}
  for (const milestone of milestones) {
    const goalsForMilestone = linkedGoals.filter(g => g.milestoneId === milestone.id)
    const completedGoals = goalsForMilestone.filter(g => g.completed)
    
    const activeDates = new Set<string>()
    for (const goal of goalsForMilestone) {
      if (goal.targetDate) {
        activeDates.add(goal.targetDate)
      }
    }
    
    activityByMilestone[milestone.id] = {
      goalsCompleted: completedGoals.length,
      goalsTotal: goalsForMilestone.length,
      daysActive: activeDates.size
    }
  }
  
  return {
    type: "outcome",
    currentMilestone: activeMilestone,
    timeInCurrentMilestone,
    milestoneHistory,
    activityByMilestone
  }
}

/**
 * Определяет текстовый статус активности на основе индекса
 */
function getActivityStatus(activityIndex: number): import("@/lib/types").ActivityStatus {
  if (activityIndex >= 60) return "active"
  if (activityIndex >= 30) return "unstable"
  return "weak"
}

/**
 * Генерирует краткий сигнал об активности
 */
function getActivitySignal(
  activityIndex: number,
  trend: "up" | "down" | "stable",
  streakDays: number
): string | undefined {
  if (trend === "up" && activityIndex >= 50) {
    return "Активность выше обычного"
  }
  if (streakDays >= 7) {
    return `Серия ${streakDays} дней`
  }
  if (trend === "down" && activityIndex < 40) {
    return "Активность снижается"
  }
  return undefined
}

function calculateProcessProgress(
  globalGoal: GlobalGoal,
  linkedGoals: Goal[],
  linkedHabits: Habit[],
  excludeMilestoneGoals: boolean = false
): ProcessProgress {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  
  // КРИТИЧНО: Исключаем goals привязанные к milestones outcome-целей
  // Они учитываются только в контексте своего milestone
  const goalsToCount = excludeMilestoneGoals 
    ? linkedGoals.filter(g => !g.milestoneId)
    : linkedGoals
  
  // Count activity in last 7 days
  const recentGoals = goalsToCount.filter(g => {
    if (!g.targetDate) return false
    const date = new Date(g.targetDate)
    return date >= weekAgo && date <= now
  })
  
  const recentCompletedGoals = recentGoals.filter(g => g.completed).length
  
  // Count habit completions in last 7 days
  let recentHabitCompletions = 0
  for (const habit of linkedHabits) {
    if (habit.completions) {
      for (const [dateStr, completed] of Object.entries(habit.completions)) {
        const date = new Date(dateStr)
        if (date >= weekAgo && date <= now && completed) {
          recentHabitCompletions++
        }
      }
    }
  }
  
  // Calculate activity index (0-100) - внутренний показатель
  const totalRecentActivity = recentCompletedGoals + recentHabitCompletions
  const maxExpectedActivity = 7 * (1 + linkedHabits.length)
  const activityIndex = maxExpectedActivity > 0 
    ? Math.min(100, Math.round((totalRecentActivity / maxExpectedActivity) * 100))
    : 0
  
  // Calculate trend
  const previousWeekGoals = goalsToCount.filter(g => {
    if (!g.targetDate) return false
    const date = new Date(g.targetDate)
    return date >= twoWeeksAgo && date < weekAgo
  })
  const previousWeekCompletedGoals = previousWeekGoals.filter(g => g.completed).length
  
  let trend: "up" | "down" | "stable" = "stable"
  if (recentCompletedGoals > previousWeekCompletedGoals + 1) {
    trend = "up"
  } else if (recentCompletedGoals < previousWeekCompletedGoals - 1) {
    trend = "down"
  }
  
  // Calculate streak
  let streakDays = 0
  let checkDate = new Date(now)
  checkDate.setHours(0, 0, 0, 0)
  
  while (true) {
    const dateStr = checkDate.toDateString()
    const hasGoalActivity = goalsToCount.some(g => 
      g.targetDate === dateStr && g.completed
    )
    const hasHabitActivity = linkedHabits.some(h => 
      h.completions?.[dateStr] === true
    )
    
    if (hasGoalActivity || hasHabitActivity) {
      streakDays++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  
  // Find last active date
  let lastActiveDate: string | undefined
  const allDates = goalsToCount
    .filter(g => g.completed && g.targetDate)
    .map(g => g.targetDate!)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  
  if (allDates.length > 0) {
    lastActiveDate = allDates[0]
  }
  
  // Определяем текстовый статус и сигнал
  const activityStatus = getActivityStatus(activityIndex)
  const activitySignal = getActivitySignal(activityIndex, trend, streakDays)
  
  return {
    type: "process",
    _activityIndex: activityIndex, // внутренний, не показываем в UI
    activityStatus,
    activitySignal,
    trend,
    streakDays,
    lastActiveDate,
    weeklyActivity: {
      goalsCompleted: recentCompletedGoals,
      habitsCompleted: recentHabitCompletions
    }
  }
}

function calculateHybridProgress(
  globalGoal: GlobalGoal,
  linkedGoals: Goal[],
  linkedHabits: Habit[]
): HybridProgress {
  // Получаем process rhythm, исключая goals привязанные к milestones
  const processProgress = calculateProcessProgress(globalGoal, linkedGoals, linkedHabits, true)
  
  const current = globalGoal.currentValue || 0
  const target = globalGoal.targetValue || 1
  const unit = globalGoal.unit || ""
  
  return {
    type: "hybrid",
    // Объективный результат - только факты, БЕЗ процентов
    objectiveResult: {
      current,
      target,
      unit
    },
    // Процессный ритм - упрощённая версия ProcessProgress
    processRhythm: {
      activityStatus: processProgress.activityStatus,
      activitySignal: processProgress.activitySignal,
      trend: processProgress.trend,
      streakDays: processProgress.streakDays
    }
  }
}

// ============================================
// Store
// ============================================

export const useGlobalGoalsStore = create<GlobalGoalsStore>()(
  persist(
    (set, get) => ({
      globalGoals: [],
      milestones: [],
      isLoaded: false,
      isLoading: false,
      error: null,

      addGlobalGoal: async (data) => {
        const tempId = generateId()
        const now = new Date().toISOString()
        
        // Create optimistic goal
        const newGoal: GlobalGoal = {
          id: tempId,
          type: data.type,
          title: data.title,
          description: data.description,
          icon: data.icon,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          status: "not_started",
          targetValue: data.targetValue,
          currentValue: 0,
          unit: data.unit,
          createdAt: now,
          _version: 0,
        }
        
        // Create optimistic milestones for outcome goals
        const newMilestones: Milestone[] = []
        if (data.type === "outcome" && data.initialMilestones) {
          data.initialMilestones.forEach((m, index) => {
            newMilestones.push({
              id: generateId(),
              globalGoalId: tempId,
              title: m.title,
              description: m.description,
              order: index,
              isActive: index === 0,
              isCompleted: false,
              enteredAt: index === 0 ? now : undefined,
              _version: 0,
            })
          })
        }
        
        set((state) => ({
          globalGoals: [...state.globalGoals, newGoal],
          milestones: [...state.milestones, ...newMilestones],
        }))
        
        try {
          const response = await createGlobalGoalApi({
            type: data.type,
            title: data.title,
            description: data.description,
            icon: data.icon,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            targetValue: data.targetValue,
            unit: data.unit,
            milestones: data.initialMilestones,
          })
          
          // Replace temp with server response
          set((state) => ({
            globalGoals: state.globalGoals.map((g) =>
              g.id === tempId ? response.globalGoal : g
            ),
            milestones: response.milestones 
              ? [
                  ...state.milestones.filter(m => m.globalGoalId !== tempId),
                  ...response.milestones
                ]
              : state.milestones.map(m => 
                  m.globalGoalId === tempId 
                    ? { ...m, globalGoalId: response.globalGoal.id }
                    : m
                ),
          }))
          
          return response.globalGoal
        } catch (error) {
          // Keep optimistic update on error (offline-first)
          console.warn('[GlobalGoalsStore] API error, keeping local goal:', error)
          return newGoal
        }
      },

      updateGlobalGoal: async (id, data) => {
        const goal = get().globalGoals.find((g) => g.id === id)
        if (!goal) return
        
        const updatedGoal: GlobalGoal = {
          ...goal,
          ...data,
          statusChangedAt: data.status && data.status !== goal.status 
            ? new Date().toISOString() 
            : goal.statusChangedAt,
        }
        
        set((state) => ({
          globalGoals: state.globalGoals.map((g) =>
            g.id === id ? updatedGoal : g
          ),
        }))
        
        try {
          await updateGlobalGoalApi(id, {
            ...data,
            _version: goal._version || 0,
          })
        } catch (error) {
          console.warn('[GlobalGoalsStore] API error, keeping local update:', error)
        }
      },

      deleteGlobalGoal: async (id) => {
        const goal = get().globalGoals.find((g) => g.id === id)
        if (!goal) return
        
        set((state) => ({
          globalGoals: state.globalGoals.filter((g) => g.id !== id),
          milestones: state.milestones.filter((m) => m.globalGoalId !== id),
        }))
        
        try {
          await deleteGlobalGoalApi(id)
        } catch (error) {
          console.warn('[GlobalGoalsStore] API error, keeping local delete:', error)
        }
      },

      addMilestone: async (globalGoalId, title, description) => {
        const existingMilestones = get().milestones.filter(m => m.globalGoalId === globalGoalId)
        const tempId = generateId()
        
        const newMilestone: Milestone = {
          id: tempId,
          globalGoalId,
          title,
          description,
          order: existingMilestones.length,
          isActive: existingMilestones.length === 0,
          isCompleted: false,
          enteredAt: existingMilestones.length === 0 ? new Date().toISOString() : undefined,
          _version: 0,
        }
        
        set((state) => ({
          milestones: [...state.milestones, newMilestone],
        }))
        
        try {
          const response = await createMilestoneApi({
            globalGoalId,
            title,
            description,
            order: newMilestone.order,
          })
          
          set((state) => ({
            milestones: state.milestones.map((m) =>
              m.id === tempId ? response.milestone : m
            ),
          }))
          
          return response.milestone
        } catch (error) {
          console.warn('[GlobalGoalsStore] API error, keeping local milestone:', error)
          return newMilestone
        }
      },

      updateMilestone: async (globalGoalId, milestoneId, data) => {
        const milestone = get().milestones.find((m) => m.id === milestoneId)
        if (!milestone) return
        
        const updated: Milestone = {
          ...milestone,
          ...data,
        }
        
        set((state) => ({
          milestones: state.milestones.map((m) =>
            m.id === milestoneId ? updated : m
          ),
        }))
        
        try {
          await updateMilestoneApi(globalGoalId, milestoneId, {
            ...data,
            _version: milestone._version || 0,
          })
        } catch (error) {
          console.warn('[GlobalGoalsStore] API error, keeping local update:', error)
        }
      },

      deleteMilestone: async (globalGoalId, milestoneId) => {
        const milestone = get().milestones.find((m) => m.id === milestoneId)
        if (!milestone) return
        
        set((state) => ({
          milestones: state.milestones.filter((m) => m.id !== milestoneId),
        }))
        
        try {
          await deleteMilestoneApi(globalGoalId, milestoneId)
        } catch (error) {
          console.warn('[GlobalGoalsStore] API error, keeping local delete:', error)
        }
      },

      activateMilestone: async (globalGoalId, milestoneId) => {
        const now = new Date().toISOString()
        
        set((state) => ({
          milestones: state.milestones.map((m) => {
            if (m.globalGoalId !== globalGoalId) return m
            
            if (m.id === milestoneId) {
              return { ...m, isActive: true, enteredAt: now }
            } else if (m.isActive) {
              return { ...m, isActive: false, exitedAt: now }
            }
            return m
          }),
        }))
        
        // Update goal status to in_progress
        const goal = get().globalGoals.find(g => g.id === globalGoalId)
        if (goal && goal.status === "not_started") {
          get().updateGlobalGoal(globalGoalId, { status: "in_progress" })
        }
        
        try {
          await activateMilestoneApi(globalGoalId, milestoneId)
        } catch (error) {
          console.warn('[GlobalGoalsStore] API error, keeping local activation:', error)
        }
      },

      completeMilestone: async (globalGoalId, milestoneId) => {
        const now = new Date().toISOString()
        
        // КРИТИЧНО: НЕ активируем следующий milestone автоматически
        // Пользователь должен сам осознанно начать новый этап
        set((state) => ({
          milestones: state.milestones.map((m) => {
            if (m.globalGoalId !== globalGoalId) return m
            
            if (m.id === milestoneId) {
              return { ...m, isActive: false, isCompleted: true, exitedAt: now }
            }
            return m
          }),
        }))
        
        try {
          await updateMilestoneApi(globalGoalId, milestoneId, {
            isCompleted: true,
            isActive: false,
            _version: 0,
          })
          // НЕ вызываем activateMilestoneApi для следующего milestone
        } catch (error) {
          console.warn('[GlobalGoalsStore] API error, keeping local completion:', error)
        }
      },

      fetchGlobalGoals: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await getGlobalGoalsApi()
          set({
            globalGoals: response.globalGoals,
            isLoaded: true,
            isLoading: false,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: 'Failed to fetch global goals',
          })
        }
      },

      setGlobalGoals: (goals) => {
        set({ globalGoals: goals, isLoaded: true })
      },

      setMilestones: (milestones) => {
        set({ milestones })
      },

      getGlobalGoalById: (id) => {
        return get().globalGoals.find((g) => g.id === id)
      },

      getMilestonesForGoal: (goalId) => {
        return get().milestones
          .filter((m) => m.globalGoalId === goalId)
          .sort((a, b) => a.order - b.order)
      },

      getActiveMilestone: (goalId) => {
        return get().milestones.find((m) => m.globalGoalId === goalId && m.isActive)
      },

      calculateProgress: (globalGoal, linkedGoals, linkedHabits) => {
        const milestones = get().getMilestonesForGoal(globalGoal.id)
        
        switch (globalGoal.type) {
          case "outcome":
            return calculateOutcomeProgress(globalGoal, milestones, linkedGoals)
          case "process":
            return calculateProcessProgress(globalGoal, linkedGoals, linkedHabits)
          case "hybrid":
            return calculateHybridProgress(globalGoal, linkedGoals, linkedHabits)
        }
      },
    }),
    {
      name: "global-goals-storage",
      storage: createJSONStorage(() => {
        return {
          getItem: (name) => {
            if (typeof window === 'undefined') return null
            try {
              return localStorage.getItem(name)
            } catch (error) {
              console.error("Error loading global goals from localStorage:", error)
              return null
            }
          },
          setItem: (name, value) => {
            if (typeof window === 'undefined') return
            try {
              localStorage.setItem(name, value)
            } catch (error) {
              console.error("Error saving global goals to localStorage:", error)
            }
          },
          removeItem: (name) => {
            if (typeof window === 'undefined') return
            try {
              localStorage.removeItem(name)
            } catch (error) {
              console.error("Error removing global goals from localStorage:", error)
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

