/**
 * Handler for conflict resolution during sync
 */

import type { Goal, Habit, GlobalGoal, Milestone } from "@/lib/types"
import type { SyncConflicts } from "./types"
import type { SyncQueueManager } from "./queue"
import type { SyncStorage } from "./storage"
import type { ChangesHandlers } from "./changes-handler"

type EntityType = 'goal' | 'habit' | 'globalGoal' | 'milestone'

type ConflictEntity = {
  id: string
  localEntity?: Goal | Habit | GlobalGoal | Milestone
  serverEntity?: (Goal | Habit | GlobalGoal | Milestone) & { _version?: number }
}

/**
 * Resolve a single conflict by applying user's choice
 */
export function resolveConflict(
  conflictId: string,
  chosenVersion: 'local' | 'server',
  pendingConflicts: SyncConflicts,
  queueManager: SyncQueueManager,
  storage: SyncStorage,
  handlers: ChangesHandlers
): SyncConflicts {
  // Find conflict type
  let entityType: EntityType | null = null
  let conflict: ConflictEntity | undefined

  if (pendingConflicts.goals.find(c => c.id === conflictId)) {
    entityType = 'goal'
    conflict = pendingConflicts.goals.find(c => c.id === conflictId)
  } else if (pendingConflicts.habits.find(c => c.id === conflictId)) {
    entityType = 'habit'
    conflict = pendingConflicts.habits.find(c => c.id === conflictId)
  } else if (pendingConflicts.globalGoals.find(c => c.id === conflictId)) {
    entityType = 'globalGoal'
    conflict = pendingConflicts.globalGoals.find(c => c.id === conflictId)
  } else if (pendingConflicts.milestones.find(c => c.id === conflictId)) {
    entityType = 'milestone'
    conflict = pendingConflicts.milestones.find(c => c.id === conflictId)
  }

  if (!entityType || !conflict) {
    console.warn(`[SyncService] Conflict ${conflictId} not found in pending conflicts`)
    return pendingConflicts
  }

  if (chosenVersion === 'server') {
    // User chose server version - apply server entity locally
    if (conflict.serverEntity) {
      applyServerEntity(entityType, conflict.serverEntity, handlers)
    }

    // Remove local change from queue (server version already on server)
    const goalIds = entityType === 'goal' ? new Set([conflictId]) : new Set<string>()
    const habitIds = entityType === 'habit' ? new Set([conflictId]) : new Set<string>()
    const globalGoalIds = entityType === 'globalGoal' ? new Set([conflictId]) : new Set<string>()
    const milestoneIds = entityType === 'milestone' ? new Set([conflictId]) : new Set<string>()
    queueManager.removeConflictedItems(goalIds, habitIds, globalGoalIds, milestoneIds)
  } else {
    // User chose local version - apply local entity and update queue with resolve version
    if (conflict.localEntity) {
      applyServerEntity(entityType, conflict.localEntity, handlers)
    }

    // Update queue item with _resolveConflictVersion
    const serverVersion = conflict.serverEntity?._version
    if (serverVersion !== undefined && conflict.localEntity) {
      updateQueueWithResolveVersion(entityType, conflictId, conflict.localEntity, serverVersion, queueManager)
    }
  }

  // Remove resolved conflict from pending
  const newConflicts = removeResolvedConflict(entityType, conflictId, pendingConflicts)
  storage.savePendingConflicts(newConflicts)

  return newConflicts
}

/**
 * Apply server entity to local store
 */
function applyServerEntity(
  entityType: EntityType,
  entity: Goal | Habit | GlobalGoal | Milestone,
  handlers: ChangesHandlers
): void {
  switch (entityType) {
    case 'goal':
      handlers.applyGoals?.([entity as Goal])
      break
    case 'habit':
      handlers.applyHabits?.([entity as Habit])
      break
    case 'globalGoal':
      handlers.applyGlobalGoals?.([entity as GlobalGoal])
      break
    case 'milestone':
      handlers.applyMilestones?.([entity as Milestone])
      break
  }
}

/**
 * Update queue item with resolve conflict version
 */
function updateQueueWithResolveVersion(
  entityType: EntityType,
  id: string,
  entity: Goal | Habit | GlobalGoal | Milestone,
  serverVersion: number,
  queueManager: SyncQueueManager
): void {
  switch (entityType) {
    case 'goal':
      queueManager.updateGoalWithResolveConflict(id, entity as Goal, serverVersion)
      break
    case 'habit':
      queueManager.updateHabitWithResolveConflict(id, entity as Habit, serverVersion)
      break
    case 'globalGoal':
      queueManager.updateGlobalGoalWithResolveConflict(id, entity as GlobalGoal, serverVersion)
      break
    case 'milestone':
      queueManager.updateMilestoneWithResolveConflict(id, entity as Milestone, serverVersion)
      break
  }
}

/**
 * Remove resolved conflict from pending conflicts
 */
function removeResolvedConflict(
  entityType: EntityType,
  conflictId: string,
  pendingConflicts: SyncConflicts
): SyncConflicts {
  const newConflicts = { ...pendingConflicts }

  switch (entityType) {
    case 'goal':
      newConflicts.goals = pendingConflicts.goals.filter(c => c.id !== conflictId)
      break
    case 'habit':
      newConflicts.habits = pendingConflicts.habits.filter(c => c.id !== conflictId)
      break
    case 'globalGoal':
      newConflicts.globalGoals = pendingConflicts.globalGoals.filter(c => c.id !== conflictId)
      break
    case 'milestone':
      newConflicts.milestones = pendingConflicts.milestones.filter(c => c.id !== conflictId)
      break
  }

  return newConflicts
}

/**
 * Check if there are any pending conflicts
 */
export function hasConflicts(conflicts: SyncConflicts): boolean {
  return (
    conflicts.goals.length > 0 ||
    conflicts.habits.length > 0 ||
    conflicts.globalGoals.length > 0 ||
    conflicts.milestones.length > 0
  )
}

/**
 * Create empty conflicts object
 */
export function createEmptyConflicts(): SyncConflicts {
  return { goals: [], habits: [], globalGoals: [], milestones: [] }
}
