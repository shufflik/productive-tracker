"use client"

/**
 * Queue management for sync service
 */

import type { Goal, Habit, GlobalGoal, Milestone, LocalSyncOperation } from "@/lib/types"
import type { SyncQueue } from "./types"
import { SyncStorage } from "./storage"
import { toast } from "sonner"

/**
 * Maximum queue size (goals + habits)
 * Protects against localStorage overflow and excessive network payloads
 */
const MAX_QUEUE_SIZE = 1000

/**
 * Manages sync queue for pending changes
 */
export class SyncQueueManager {
  private queue: SyncQueue = {
    goals: [],
    habits: [],
    globalGoals: [],
    milestones: [],
  }
  private storage: SyncStorage
  private onQueueOverflow?: () => Promise<void>

  constructor(storage: SyncStorage) {
    this.storage = storage
    this.queue = storage.loadQueue()
  }

  /**
   * Set callback for queue overflow (triggers emergency sync)
   */
  setOverflowCallback(callback: () => Promise<void>): void {
    this.onQueueOverflow = callback
  }

  /**
   * Get current queue
   */
  getQueue(): SyncQueue {
    return this.queue
  }

  /**
   * Check if queue has pending changes
   */
  hasPendingChanges(): boolean {
    return (
      this.queue.goals.length > 0 ||
      this.queue.habits.length > 0 ||
      this.queue.globalGoals.length > 0 ||
      this.queue.milestones.length > 0
    )
  }

  /**
   * Clear queue items by IDs (used after successful sync)
   */
  clearSentItems(
    goalIds: Set<string>,
    habitIds: Set<string>,
    globalGoalIds: Set<string>,
    milestoneIds: Set<string>
  ): void {
    this.queue.goals = this.queue.goals.filter(g => !goalIds.has(g.id))
    this.queue.habits = this.queue.habits.filter(h => !habitIds.has(h.id))
    this.queue.globalGoals = this.queue.globalGoals.filter(gg => !globalGoalIds.has(gg.id))
    this.queue.milestones = this.queue.milestones.filter(m => !milestoneIds.has(m.id))
    this.storage.saveQueue(this.queue)
  }

  /**
   * Remove conflicted items from queue
   */
  removeConflictedItems(
    goalIds: Set<string>,
    habitIds: Set<string>,
    globalGoalIds: Set<string> = new Set(),
    milestoneIds: Set<string> = new Set()
  ): void {
    this.queue.goals = this.queue.goals.filter(g => !goalIds.has(g.id))
    this.queue.habits = this.queue.habits.filter(h => !habitIds.has(h.id))
    this.queue.globalGoals = this.queue.globalGoals.filter(gg => !globalGoalIds.has(gg.id))
    this.queue.milestones = this.queue.milestones.filter(m => !milestoneIds.has(m.id))
    this.storage.saveQueue(this.queue)
  }

  /**
   * Update queue item with resolve conflict version
   * Used when user chooses local version during conflict resolution
   */
  updateGoalWithResolveConflict(goalId: string, goal: Goal, resolveConflictVersion: number): void {
    const list = this.queue.goals
    const idx = list.findIndex((item) => item.id === goalId)

    if (idx === -1) {
      console.warn(`[SyncQueueManager] Goal ${goalId} not found in queue for conflict resolution`)
      return
    }

    const { _localUpdatedAt, _localOp, _version, ...payload } = goal

    list[idx] = {
      ...list[idx],
      _resolveConflictVersion: resolveConflictVersion,
      payload,
      clientUpdatedAt: Date.now(),
      version: _version || 0,
    }

    this.storage.saveQueue(this.queue)
  }

  /**
   * Update queue item with resolve conflict version
   * Used when user chooses local version during conflict resolution
   */
  updateHabitWithResolveConflict(habitId: string, habit: Habit, resolveConflictVersion: number): void {
    const list = this.queue.habits
    const idx = list.findIndex((item) => item.id === habitId)

    if (idx === -1) {
      console.warn(`[SyncQueueManager] Habit ${habitId} not found in queue for conflict resolution`)
      return
    }

    const { _localUpdatedAt, _localOp, _version, ...payload } = habit

    list[idx] = {
      ...list[idx],
      _resolveConflictVersion: resolveConflictVersion,
      payload,
      clientUpdatedAt: Date.now(),
      version: _version || 0,
    }

    this.storage.saveQueue(this.queue)
  }

  /**
   * Enqueue goal change
   *
   * IMPORTANT: Backend increments versions, NOT client!
   *
   * Flow:
   * 1. Store sends goal with current _version
   * 2. Backend checks version - if conflict, returns conflict
   * 3. Backend increments version on successful apply
   * 4. Store updates _version from backend response (via applyGoals handler)
   */
  enqueueGoalChange(operation: LocalSyncOperation, goal: Goal): void {
    // Check queue size before adding
    this.checkQueueSizeAndSync()

    const list = this.queue.goals
    const idx = list.findIndex((item) => item.id === goal.id)
    const now = Date.now()

    // Remove metadata from payload
    const { _localUpdatedAt, _localOp, _version, ...payload } = goal

    // Send current version (backend will check it for conflicts)
    const version = _version || 0

    if (idx === -1) {
      // New change
      list.push({
        id: goal.id,
        clientUpdatedAt: now,
        operation,
        version,
        payload,
      })
    } else {
      const prev = list[idx].operation

      // create + delete before sync → remove from queue (backend shouldn't know)
      if (prev === "create" && operation === "delete") {
        list.splice(idx, 1)
        this.storage.saveQueue(this.queue)
        return
      }

      // create + update → keep create, but update payload and version
      if (prev === "create" && (operation === "update" || operation === "upsert")) {
        list[idx] = {
          ...list[idx],
          payload,
          clientUpdatedAt: now,
          version,
        }
      } else {
        // Everything else → last operation wins
        list[idx] = {
          id: goal.id,
          clientUpdatedAt: now,
          operation,
          version,
          payload,
        }
      }
    }

    this.storage.saveQueue(this.queue)
  }

  /**
   * Enqueue habit change
   *
   * IMPORTANT: Backend increments versions, NOT client!
   *
   * Flow:
   * 1. Store sends habit with current _version
   * 2. Backend checks version - if conflict, returns conflict
   * 3. Backend increments version on successful apply
   * 4. Store updates _version from backend response (via applyHabits handler)
   */
  enqueueHabitChange(operation: LocalSyncOperation, habit: Habit): void {
    // Check queue size before adding
    this.checkQueueSizeAndSync()

    const list = this.queue.habits
    const idx = list.findIndex((item) => item.id === habit.id)
    const now = Date.now()

    const { _localUpdatedAt, _localOp, _version, ...payload } = habit

    // Send current version (backend will check it for conflicts)
    const version = _version || 0

    if (idx === -1) {
      list.push({
        id: habit.id,
        clientUpdatedAt: now,
        operation,
        version,
        payload,
      })
    } else {
      const prev = list[idx].operation

      if (prev === "create" && operation === "delete") {
        list.splice(idx, 1)
        this.storage.saveQueue(this.queue)
        return
      }

      if (prev === "create" && (operation === "update" || operation === "upsert")) {
        list[idx] = {
          ...list[idx],
          payload,
          clientUpdatedAt: now,
          version,
        }
      } else {
        list[idx] = {
          id: habit.id,
          clientUpdatedAt: now,
          operation,
          version,
          payload,
        }
      }
    }

    this.storage.saveQueue(this.queue)
  }

  /**
   * Enqueue global goal change
   */
  enqueueGlobalGoalChange(operation: LocalSyncOperation, globalGoal: GlobalGoal): void {
    this.checkQueueSizeAndSync()

    const list = this.queue.globalGoals
    const idx = list.findIndex((item) => item.id === globalGoal.id)
    const now = Date.now()

    const { _localUpdatedAt, _localOp, _version, ...payload } = globalGoal
    const version = _version || 0

    if (idx === -1) {
      list.push({
        id: globalGoal.id,
        clientUpdatedAt: now,
        operation,
        version,
        payload,
      })
    } else {
      const prev = list[idx].operation

      if (prev === "create" && operation === "delete") {
        list.splice(idx, 1)
        this.storage.saveQueue(this.queue)
        return
      }

      if (prev === "create" && (operation === "update" || operation === "upsert")) {
        list[idx] = {
          ...list[idx],
          payload,
          clientUpdatedAt: now,
          version,
        }
      } else {
        list[idx] = {
          id: globalGoal.id,
          clientUpdatedAt: now,
          operation,
          version,
          payload,
        }
      }
    }

    this.storage.saveQueue(this.queue)
  }

  /**
   * Enqueue milestone change
   */
  enqueueMilestoneChange(operation: LocalSyncOperation, milestone: Milestone): void {
    this.checkQueueSizeAndSync()

    const list = this.queue.milestones
    const idx = list.findIndex((item) => item.id === milestone.id)
    const now = Date.now()

    const { _localUpdatedAt, _localOp, _version, ...payload } = milestone
    const version = _version || 0

    if (idx === -1) {
      list.push({
        id: milestone.id,
        clientUpdatedAt: now,
        operation,
        version,
        payload,
      })
    } else {
      const prev = list[idx].operation

      if (prev === "create" && operation === "delete") {
        list.splice(idx, 1)
        this.storage.saveQueue(this.queue)
        return
      }

      if (prev === "create" && (operation === "update" || operation === "upsert")) {
        list[idx] = {
          ...list[idx],
          payload,
          clientUpdatedAt: now,
          version,
        }
      } else {
        list[idx] = {
          id: milestone.id,
          clientUpdatedAt: now,
          operation,
          version,
          payload,
        }
      }
    }

    this.storage.saveQueue(this.queue)
  }

  /**
   * Update global goal with resolve conflict version
   */
  updateGlobalGoalWithResolveConflict(
    globalGoalId: string,
    globalGoal: GlobalGoal,
    resolveConflictVersion: number
  ): void {
    const list = this.queue.globalGoals
    const idx = list.findIndex((item) => item.id === globalGoalId)

    if (idx === -1) {
      console.warn(`[SyncQueueManager] GlobalGoal ${globalGoalId} not found in queue for conflict resolution`)
      return
    }

    const { _localUpdatedAt, _localOp, _version, ...payload } = globalGoal

    list[idx] = {
      ...list[idx],
      _resolveConflictVersion: resolveConflictVersion,
      payload,
      clientUpdatedAt: Date.now(),
      version: _version || 0,
    }

    this.storage.saveQueue(this.queue)
  }

  /**
   * Update milestone with resolve conflict version
   */
  updateMilestoneWithResolveConflict(
    milestoneId: string,
    milestone: Milestone,
    resolveConflictVersion: number
  ): void {
    const list = this.queue.milestones
    const idx = list.findIndex((item) => item.id === milestoneId)

    if (idx === -1) {
      console.warn(`[SyncQueueManager] Milestone ${milestoneId} not found in queue for conflict resolution`)
      return
    }

    const { _localUpdatedAt, _localOp, _version, ...payload } = milestone

    list[idx] = {
      ...list[idx],
      _resolveConflictVersion: resolveConflictVersion,
      payload,
      clientUpdatedAt: Date.now(),
      version: _version || 0,
    }

    this.storage.saveQueue(this.queue)
  }

  /**
   * Check queue size and trigger emergency sync if needed
   */
  private checkQueueSizeAndSync(): void {
    const totalQueueSize =
      this.queue.goals.length +
      this.queue.habits.length +
      this.queue.globalGoals.length +
      this.queue.milestones.length

    if (totalQueueSize >= MAX_QUEUE_SIZE) {
      console.warn(
        `[SyncQueueManager] Queue overflow detected (${totalQueueSize}/${MAX_QUEUE_SIZE}). ` +
        `Triggering immediate sync to prevent data loss.`
      )

      // Trigger emergency sync (non-blocking)
      if (this.onQueueOverflow) {
        this.onQueueOverflow().catch(error => {
          console.error("[SyncQueueManager] Emergency sync failed:", error)
          this.showErrorToast("Переполнение очереди синхронизации")
        })
      }
    }
  }

  /**
   * Show error toast
   */
  private showErrorToast(title: string): void {
    if (typeof window === "undefined") return

    toast.error(title, {
      duration: 4000,
    })
  }
}
