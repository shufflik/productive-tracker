/**
 * Handler for processing server changes during sync
 */

import type { Goal, Habit, GlobalGoal, Milestone } from "@/lib/types"
import type { SyncResponse } from "./types"

export type ChangesHandlers = {
  applyGoals?: (goals: Goal[]) => void
  applyHabits?: (habits: Habit[]) => void
  applyGlobalGoals?: (globalGoals: GlobalGoal[]) => void
  applyMilestones?: (milestones: Milestone[]) => void
  deleteGoals?: (ids: string[]) => void
  deleteHabits?: (ids: string[]) => void
  deleteGlobalGoals?: (ids: string[]) => void
  deleteMilestones?: (ids: string[]) => void
}

export type ConflictedIds = {
  goals: Set<string>
  habits: Set<string>
  globalGoals: Set<string>
  milestones: Set<string>
}

/**
 * Process server changes and apply to local stores
 */
export function processServerChanges(
  changes: SyncResponse['changes'],
  conflictedIds: ConflictedIds,
  handlers: ChangesHandlers
): void {
  if (!changes) return

  // Process goals
  if (changes.goals && changes.goals.length > 0) {
    const goalsToApply = changes.goals
      .filter((g): g is Goal => g.deleted !== true)
      .filter(g => !conflictedIds.goals.has(g.id))

    const goalsToDelete = changes.goals
      .filter((g): g is { id: string; deleted: true } => g.deleted === true)
      .map(g => g.id)
      .filter(id => !conflictedIds.goals.has(id))

    if (goalsToApply.length > 0 && handlers.applyGoals) {
      handlers.applyGoals(goalsToApply)
    }

    if (goalsToDelete.length > 0) {
      if (handlers.deleteGoals) {
        handlers.deleteGoals(goalsToDelete)
      } else {
        console.warn("[SyncService] deleteGoals handler not registered!")
      }
    }
  }

  // Process habits
  if (changes.habits && changes.habits.length > 0) {
    const habitsToApply = changes.habits
      .filter((h): h is Habit => h.deleted !== true)
      .filter(h => !conflictedIds.habits.has(h.id))

    const habitsToDelete = changes.habits
      .filter((h): h is { id: string; deleted: true } => h.deleted === true)
      .map(h => h.id)
      .filter(id => !conflictedIds.habits.has(id))

    if (habitsToApply.length > 0 && handlers.applyHabits) {
      handlers.applyHabits(habitsToApply)
    }

    if (habitsToDelete.length > 0) {
      if (handlers.deleteHabits) {
        handlers.deleteHabits(habitsToDelete)
      } else {
        console.warn("[SyncService] deleteHabits handler not registered!")
      }
    }
  }

  // Process global goals
  if (changes.globalGoals && changes.globalGoals.length > 0) {
    const globalGoalsToApply = changes.globalGoals
      .filter((gg): gg is GlobalGoal => gg.deleted !== true)
      .filter(gg => !conflictedIds.globalGoals.has(gg.id))

    const globalGoalsToDelete = changes.globalGoals
      .filter((gg): gg is { id: string; deleted: true } => gg.deleted === true)
      .map(gg => gg.id)
      .filter(id => !conflictedIds.globalGoals.has(id))

    if (globalGoalsToApply.length > 0 && handlers.applyGlobalGoals) {
      handlers.applyGlobalGoals(globalGoalsToApply)
    }

    if (globalGoalsToDelete.length > 0) {
      if (handlers.deleteGlobalGoals) {
        handlers.deleteGlobalGoals(globalGoalsToDelete)
      } else {
        console.warn("[SyncService] deleteGlobalGoals handler not registered!")
      }
    }
  }

  // Process milestones
  if (changes.milestones && changes.milestones.length > 0) {
    const milestonesToApply = changes.milestones
      .filter((m): m is Milestone => m.deleted !== true)
      .filter(m => !conflictedIds.milestones.has(m.id))

    const milestonesToDelete = changes.milestones
      .filter((m): m is { id: string; deleted: true } => m.deleted === true)
      .map(m => m.id)
      .filter(id => !conflictedIds.milestones.has(id))

    if (milestonesToApply.length > 0 && handlers.applyMilestones) {
      handlers.applyMilestones(milestonesToApply)
    }

    if (milestonesToDelete.length > 0) {
      if (handlers.deleteMilestones) {
        handlers.deleteMilestones(milestonesToDelete)
      } else {
        console.warn("[SyncService] deleteMilestones handler not registered!")
      }
    }
  }
}

/**
 * Collect conflicted entity IDs from response
 */
export function collectConflictedIds(conflicts: SyncResponse['conflicts']): ConflictedIds {
  const result: ConflictedIds = {
    goals: new Set<string>(),
    habits: new Set<string>(),
    globalGoals: new Set<string>(),
    milestones: new Set<string>(),
  }

  conflicts.goals.forEach(c => result.goals.add(c.id))
  conflicts.habits.forEach(c => result.habits.add(c.id))
  conflicts.globalGoals.forEach(c => result.globalGoals.add(c.id))
  conflicts.milestones.forEach(c => result.milestones.add(c.id))

  return result
}
