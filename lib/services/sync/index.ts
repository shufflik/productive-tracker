"use client"

/**
 * Sync service public API
 */

// Export types
export type {
  SyncChange,
  SyncChanges,
  SyncReviewBlock,
  SyncRequest,
  SyncConflicts,
  GoalConflict,
  HabitConflict,
  SyncResponse,
  SyncMeta,
  SyncQueue,
  GoalsApplyHandler,
  HabitsApplyHandler,
  GoalsDeleteHandler,
  HabitsDeleteHandler,
  PendingReviewsApplyHandler,
  ConflictsHandler,
} from "./types"

// Export sync service class
export { SyncService } from "./sync-service"

// Export singleton instance
import { SyncService } from "./sync-service"
export const syncService = new SyncService()
