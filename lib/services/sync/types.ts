/**
 * Type definitions for sync service
 */

import type { Goal, Habit, LocalSyncOperation } from "@/lib/types"

/**
 * Change item that will be sent to backend
 */
export type SyncChange<TPayload> = {
  id: string
  clientUpdatedAt: number
  operation: LocalSyncOperation
  /**
   * Version of the entity on client (for optimistic locking)
   * Backend uses this to detect conflicts
   */
  version?: number
  /**
   * Version from server used for conflict resolution
   * When user resolves conflict, this field contains server's version
   * Backend checks if this version matches current DB version before applying
   */
  _resolveConflictVersion?: number
  payload: TPayload
}

export type SyncChanges = {
  goals: SyncChange<Omit<Goal, "_localUpdatedAt" | "_localOp" | "_version">>[]
  habits: SyncChange<Omit<Habit, "_localUpdatedAt" | "_localOp" | "_version">>[]
}

export type SyncReviewBlock = {
  pendingReviewDates: string[]
  /**
   * Last user activity date and time (ISO datetime string "2025-01-15T14:30:00.000Z")
   * Synchronized between devices for correct merge conflict handling
   */
  lastActiveDate?: string | null
}

export type SyncRequest = {
  userId: string
  deviceId: string
  /**
   * Time of last successful sync on client (ms since epoch)
   * Used by backend to determine which changes to return to client
   */
  lastSyncAt: number
  /**
   * Current client time (UTC timestamp ms)
   * Used to detect clock skew
   */
  clientTimestamp: number
  /**
   * Client timezone (IANA timezone, e.g. "Europe/Moscow" or "America/New_York")
   * Used for correct date handling (targetDate, lastCompletedDate, etc.)
   */
  clientTimezone: string
  /**
   * Change log by entities
   */
  changes: SyncChanges
  /**
   * Separate block for review dates and lastActiveDate
   */
  review: SyncReviewBlock
}

export type GoalConflict = {
  id: string
  message: string
  /**
   * Full local goal entity
   */
  localEntity?: Goal
  /**
   * Full server goal entity
   */
  serverEntity?: Goal
  /**
   * Local operation that caused the conflict
   */
  localOperation?: LocalSyncOperation
  /**
   * Client version number (for optimistic locking)
   */
  clientVersion?: number
  /**
   * Server version number (for optimistic locking)
   */
  serverVersion?: number
}

export type HabitConflict = {
  id: string
  message: string
  /**
   * Full local habit entity
   */
  localEntity?: Habit
  /**
   * Full server habit entity
   */
  serverEntity?: Habit
  /**
   * Local operation that caused the conflict
   */
  localOperation?: LocalSyncOperation
  /**
   * Client version number (for optimistic locking)
   */
  clientVersion?: number
  /**
   * Server version number (for optimistic locking)
   */
  serverVersion?: number
}

export type SyncConflicts = {
  goals: GoalConflict[]
  habits: HabitConflict[]
}

export type SyncResponse = {
  success: boolean
  conflicts: SyncConflicts
  /**
   * New lastSyncAt that client should save
   */
  newLastSyncAt: number
  /**
   * Server time (UTC timestamp ms)
   * Used to synchronize client clocks
   */
  serverTimestamp: number
  /**
   * Difference between server and client time (ms)
   * Positive value = client is behind, negative = client is ahead
   */
  clockSkew?: number
  /**
   * Final list of pending review dates and lastActiveDate as seen by backend
   * (may differ from what client sent)
   */
  review?: SyncReviewBlock
  /**
   * BIDIRECTIONAL SYNC: Changes from backend since client's lastSyncAt
   * Backend returns all entities that were changed on other devices
   * or directly on server since client's last sync
   */
  changes?: {
    /**
     * Goals that were changed on server since lastSyncAt
     * deleted: true for deleted goals (client should delete locally)
     */
    goals?: Array<Goal | { id: string; deleted: true }>
    /**
     * Habits that were changed on server since lastSyncAt
     * deleted: true for deleted habits (client should delete locally)
     */
    habits?: Array<Habit | { id: string; deleted: true }>
  }
}

/**
 * Sync metadata stored in localStorage
 */
export type SyncMeta = {
  deviceId: string
  lastSyncAt: number
}

/**
 * Sync queue for pending changes
 * Stores only changes that haven't been sent to backend yet
 */
export type SyncQueue = {
  goals: SyncChange<Omit<Goal, "_localUpdatedAt" | "_localOp" | "_version">>[]
  habits: SyncChange<Omit<Habit, "_localUpdatedAt" | "_localOp" | "_version">>[]
}

/**
 * Handler types for applying server data back into stores
 */
export type GoalsApplyHandler = (goals: Goal[]) => void
export type HabitsApplyHandler = (habits: Habit[]) => void
export type GoalsDeleteHandler = (ids: string[]) => void
export type HabitsDeleteHandler = (ids: string[]) => void
export type PendingReviewsApplyHandler = (reviewBlock: SyncReviewBlock) => void
export type ConflictsHandler = (conflicts: SyncConflicts) => void
