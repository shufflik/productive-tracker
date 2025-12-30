/**
 * Sync handlers for Global Goals store
 * Registers handlers with syncService to apply server changes
 */

import type { GlobalGoal, Milestone } from "@/lib/types"
import { syncService } from "@/lib/services/sync"
import { useGlobalGoalsStore } from "./global-goals-store"

/**
 * Initialize sync handlers for global goals
 * Call this once on app startup
 */
export function initGlobalGoalsSyncHandlers(): void {
  // Apply global goals from server (merge by _version)
  syncService.registerGlobalGoalsApplyHandler((serverGlobalGoals) => {
    useGlobalGoalsStore.setState((state) => {
      const localGoals = state.globalGoals || []
      const serverGoalsMap = new Map(serverGlobalGoals.map(g => [g.id, g]))
      const mergedGoals: GlobalGoal[] = []
      const processedIds = new Set<string>()

      for (const localGoal of localGoals) {
        const serverGoal = serverGoalsMap.get(localGoal.id)

        if (serverGoal) {
          const localVersion = localGoal._version || 0
          const serverVersion = serverGoal._version || 0

          let selectedGoal: GlobalGoal
          if (serverVersion > localVersion) {
            selectedGoal = serverGoal
          } else if (serverVersion === localVersion) {
            const localUpdatedAt = localGoal._localUpdatedAt || 0
            const serverUpdatedAt = serverGoal._localUpdatedAt || 0
            selectedGoal = localUpdatedAt > serverUpdatedAt ? localGoal : serverGoal
          } else {
            selectedGoal = localGoal
          }

          mergedGoals.push(selectedGoal)
          processedIds.add(localGoal.id)
        } else {
          mergedGoals.push(localGoal)
          processedIds.add(localGoal.id)
        }
      }

      for (const serverGoal of serverGlobalGoals) {
        if (!processedIds.has(serverGoal.id)) {
          mergedGoals.push(serverGoal)
        }
      }

      return { globalGoals: mergedGoals, isLoaded: true }
    })
  })

  // Apply milestones from server (merge by _version)
  syncService.registerMilestonesApplyHandler((serverMilestones) => {
    useGlobalGoalsStore.setState((state) => {
      const localMilestones = state.milestones || []
      const serverMilestonesMap = new Map(serverMilestones.map(m => [m.id, m]))
      const mergedMilestones: Milestone[] = []
      const processedIds = new Set<string>()

      for (const localMilestone of localMilestones) {
        const serverMilestone = serverMilestonesMap.get(localMilestone.id)

        if (serverMilestone) {
          const localVersion = localMilestone._version || 0
          const serverVersion = serverMilestone._version || 0

          let selectedMilestone: Milestone
          if (serverVersion > localVersion) {
            selectedMilestone = serverMilestone
          } else if (serverVersion === localVersion) {
            const localUpdatedAt = localMilestone._localUpdatedAt || 0
            const serverUpdatedAt = serverMilestone._localUpdatedAt || 0
            selectedMilestone = localUpdatedAt > serverUpdatedAt ? localMilestone : serverMilestone
          } else {
            selectedMilestone = localMilestone
          }

          mergedMilestones.push(selectedMilestone)
          processedIds.add(localMilestone.id)
        } else {
          mergedMilestones.push(localMilestone)
          processedIds.add(localMilestone.id)
        }
      }

      for (const serverMilestone of serverMilestones) {
        if (!processedIds.has(serverMilestone.id)) {
          mergedMilestones.push(serverMilestone)
        }
      }

      return { milestones: mergedMilestones }
    })
  })

  // Delete global goals from server
  syncService.registerGlobalGoalsDeleteHandler((ids) => {
    useGlobalGoalsStore.setState((state) => ({
      globalGoals: state.globalGoals.filter(g => !ids.includes(g.id)),
      milestones: state.milestones.filter(m => !ids.includes(m.globalGoalId)),
    }))
  })

  // Delete milestones from server
  syncService.registerMilestonesDeleteHandler((ids) => {
    useGlobalGoalsStore.setState((state) => ({
      milestones: state.milestones.filter(m => !ids.includes(m.id)),
    }))
  })
}

// Auto-initialize when module is imported
initGlobalGoalsSyncHandlers()
