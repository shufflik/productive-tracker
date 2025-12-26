"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  GlobalGoal,
  GlobalGoalType,
  GlobalGoalStatus,
  Milestone,
  GlobalGoalProgress,
  Goal,
  Habit
} from "@/lib/types"
import { generateId } from "@/lib/utils/id"
import { syncService } from "@/lib/services/sync"
import {
  calculateOutcomeProgress,
  calculateProcessProgress,
  calculateHybridProgress,
} from "@/lib/utils/progress-calculator"

// ============================================
// Types
// ============================================

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
    periodStart: string
    periodEnd?: string
    targetValue?: number
    unit?: string
    initialMilestones?: { title: string; description?: string }[]
  }) => Promise<GlobalGoal>

  updateGlobalGoal: (id: string, data: {
    title?: string
    description?: string
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
  swapMilestoneOrders: (globalGoalId: string, milestoneId1: string, milestoneId2: string) => Promise<void>
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
        const id = generateId()
        const now = new Date().toISOString()

        const newGoal: GlobalGoal = {
          id,
          type: data.type,
          title: data.title,
          description: data.description,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          status: "not_started",
          targetValue: data.targetValue,
          currentValue: 0,
          unit: data.unit,
          createdAt: now,
          _version: 0,
          _localUpdatedAt: Date.now(),
          _localOp: "create",
        }

        const newMilestones: Milestone[] = []
        if (data.type === "outcome" && data.initialMilestones) {
          data.initialMilestones.forEach((m, index) => {
            newMilestones.push({
              id: generateId(),
              globalGoalId: id,
              title: m.title,
              description: m.description,
              order: index,
              isActive: false,
              isCompleted: false,
              enteredAt: undefined,
              _version: 0,
              _localUpdatedAt: Date.now(),
              _localOp: "create",
            })
          })
        }

        set((state) => ({
          globalGoals: [...state.globalGoals, newGoal],
          milestones: [...state.milestones, ...newMilestones],
        }))

        syncService.enqueueGlobalGoalChange("create", newGoal)
        for (const milestone of newMilestones) {
          syncService.enqueueMilestoneChange("create", milestone)
        }

        return newGoal
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
          _localUpdatedAt: Date.now(),
          _localOp: "update",
        }

        set((state) => ({
          globalGoals: state.globalGoals.map((g) =>
            g.id === id ? updatedGoal : g
          ),
        }))

        syncService.enqueueGlobalGoalChange("update", updatedGoal)
      },

      deleteGlobalGoal: async (id) => {
        const goal = get().globalGoals.find((g) => g.id === id)
        if (!goal) return

        // Remove from local state (milestones are removed locally but not sent to server -
        // server handles cascade deletion automatically)
        set((state) => ({
          globalGoals: state.globalGoals.filter((g) => g.id !== id),
          milestones: state.milestones.filter((m) => m.globalGoalId !== id),
        }))

        syncService.enqueueGlobalGoalChange("delete", { ...goal, _localUpdatedAt: Date.now(), _localOp: "delete" })
      },

      addMilestone: async (globalGoalId, title, description) => {
        const existingMilestones = get().milestones.filter(m => m.globalGoalId === globalGoalId)
        const id = generateId()

        const newMilestone: Milestone = {
          id,
          globalGoalId,
          title,
          description,
          order: existingMilestones.length,
          isActive: false,
          isCompleted: false,
          enteredAt: undefined,
          _version: 0,
          _localUpdatedAt: Date.now(),
          _localOp: "create",
        }

        set((state) => ({
          milestones: [...state.milestones, newMilestone],
        }))

        syncService.enqueueMilestoneChange("create", newMilestone)

        return newMilestone
      },

      updateMilestone: async (_globalGoalId, milestoneId, data) => {
        const milestone = get().milestones.find((m) => m.id === milestoneId)
        if (!milestone) return

        const updated: Milestone = {
          ...milestone,
          ...data,
          _localUpdatedAt: Date.now(),
          _localOp: "update",
        }

        set((state) => ({
          milestones: state.milestones.map((m) =>
            m.id === milestoneId ? updated : m
          ),
        }))

        syncService.enqueueMilestoneChange("update", updated)
      },

      swapMilestoneOrders: async (_globalGoalId, milestoneId1, milestoneId2) => {
        const milestone1 = get().milestones.find((m) => m.id === milestoneId1)
        const milestone2 = get().milestones.find((m) => m.id === milestoneId2)
        if (!milestone1 || !milestone2) return

        const order1 = milestone1.order
        const order2 = milestone2.order

        const updated1: Milestone = { ...milestone1, order: order2, _localUpdatedAt: Date.now(), _localOp: "update" }
        const updated2: Milestone = { ...milestone2, order: order1, _localUpdatedAt: Date.now(), _localOp: "update" }

        set((state) => ({
          milestones: state.milestones.map((m) => {
            if (m.id === milestoneId1) return updated1
            if (m.id === milestoneId2) return updated2
            return m
          }),
        }))

        syncService.enqueueMilestoneChange("update", updated1)
        syncService.enqueueMilestoneChange("update", updated2)
      },

      deleteMilestone: async (_globalGoalId, milestoneId) => {
        const milestone = get().milestones.find((m) => m.id === milestoneId)
        if (!milestone) return

        set((state) => ({
          milestones: state.milestones.filter((m) => m.id !== milestoneId),
        }))

        syncService.enqueueMilestoneChange("delete", { ...milestone, _localUpdatedAt: Date.now(), _localOp: "delete" })
      },

      activateMilestone: async (globalGoalId, milestoneId) => {
        const now = new Date().toISOString()
        const updatedMilestones: Milestone[] = []

        set((state) => {
          const newMilestones = state.milestones.map((m) => {
            if (m.globalGoalId !== globalGoalId) return m

            if (m.id === milestoneId) {
              const updated = { ...m, isActive: true, enteredAt: now, _localUpdatedAt: Date.now(), _localOp: "update" as const }
              updatedMilestones.push(updated)
              return updated
            } else if (m.isActive) {
              const updated = { ...m, isActive: false, exitedAt: now, _localUpdatedAt: Date.now(), _localOp: "update" as const }
              updatedMilestones.push(updated)
              return updated
            }
            return m
          })
          return { milestones: newMilestones }
        })

        const goal = get().globalGoals.find(g => g.id === globalGoalId)
        if (goal && goal.status === "not_started") {
          await get().updateGlobalGoal(globalGoalId, { status: "in_progress" })
        }

        for (const m of updatedMilestones) {
          syncService.enqueueMilestoneChange("update", m)
        }
      },

      completeMilestone: async (_globalGoalId, milestoneId) => {
        const now = new Date().toISOString()
        const milestone = get().milestones.find(m => m.id === milestoneId)
        if (!milestone) return

        const updated: Milestone = {
          ...milestone,
          isActive: false,
          isCompleted: true,
          exitedAt: now,
          _localUpdatedAt: Date.now(),
          _localOp: "update",
        }

        set((state) => ({
          milestones: state.milestones.map((m) =>
            m.id === milestoneId ? updated : m
          ),
        }))

        syncService.enqueueMilestoneChange("update", updated)
      },

      fetchGlobalGoals: async () => {
        set({ isLoaded: true })
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

// Initialize sync handlers (imported as side effect)
import "./global-goals-sync"
