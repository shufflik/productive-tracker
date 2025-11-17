"use client"

/**
 * Queue management for sync service
 */

import type { Goal, Habit, LocalSyncOperation } from "@/lib/types"
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
    return this.queue.goals.length > 0 || this.queue.habits.length > 0
  }

  /**
   * Clear queue items by IDs (used after successful sync)
   */
  clearSentItems(goalIds: Set<string>, habitIds: Set<string>): void {
    console.log('[SyncQueueManager] clearSentItems called:', {
      goalIdsToRemove: Array.from(goalIds),
      habitIdsToRemove: Array.from(habitIds),
      queueBeforeClear: {
        goals: this.queue.goals.map(g => ({ id: g.id, op: g.operation })),
        habits: this.queue.habits.map(h => ({ id: h.id, op: h.operation })),
      },
    })

    const goalsBeforeCount = this.queue.goals.length
    const habitsBeforeCount = this.queue.habits.length

    this.queue.goals = this.queue.goals.filter(g => !goalIds.has(g.id))
    this.queue.habits = this.queue.habits.filter(h => !habitIds.has(h.id))

    console.log('[SyncQueueManager] clearSentItems result:', {
      goalsRemoved: goalsBeforeCount - this.queue.goals.length,
      habitsRemoved: habitsBeforeCount - this.queue.habits.length,
      queueAfterClear: {
        goals: this.queue.goals.map(g => ({ id: g.id, op: g.operation })),
        habits: this.queue.habits.map(h => ({ id: h.id, op: h.operation })),
      },
    })

    this.storage.saveQueue(this.queue)
    console.log('[SyncQueueManager] Queue saved to storage')
  }

  /**
   * Remove conflicted items from queue
   */
  removeConflictedItems(goalIds: Set<string>, habitIds: Set<string>): void {
    this.queue.goals = this.queue.goals.filter(g => !goalIds.has(g.id))
    this.queue.habits = this.queue.habits.filter(h => !habitIds.has(h.id))
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
    console.log(`[SyncQueueManager] enqueueGoalChange called:`, {
      operation,
      goalId: goal.id,
      goalTitle: goal.title,
      currentQueueSize: this.queue.goals.length,
    })

    // Check queue size before adding
    this.checkQueueSizeAndSync()

    const list = this.queue.goals
    const idx = list.findIndex((item) => item.id === goal.id)
    const now = Date.now()

    // Remove metadata from payload
    const { _localUpdatedAt, _localOp, _version, ...payload } = goal

    console.log(`[SyncQueueManager] Goal payload being queued:`, {
      id: goal.id,
      title: goal.title,
      targetDate: goal.targetDate,
    })

    // Send current version (backend will check it for conflicts)
    const version = _version || 0

    if (idx === -1) {
      // New change
      console.log(`[SyncQueueManager] Adding NEW goal to queue:`, goal.id)
      list.push({
        id: goal.id,
        clientUpdatedAt: now,
        operation,
        version,
        payload,
      })
    } else {
      console.log(`[SyncQueueManager] Updating EXISTING goal in queue:`, {
        goalId: goal.id,
        prevOperation: list[idx].operation,
        newOperation: operation,
      })
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

    console.log(`[SyncQueueManager] Queue after enqueue:`, {
      totalGoals: this.queue.goals.length,
      goalIds: this.queue.goals.map(g => ({ id: g.id, op: g.operation })),
    })

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
    console.log(`[SyncQueueManager] enqueueHabitChange called:`, {
      operation,
      habitId: habit.id,
      habitTitle: habit.title,
      currentQueueSize: this.queue.habits.length,
    })

    // Check queue size before adding
    this.checkQueueSizeAndSync()

    const list = this.queue.habits
    const idx = list.findIndex((item) => item.id === habit.id)
    const now = Date.now()

    const { _localUpdatedAt, _localOp, _version, ...payload } = habit

    // Send current version (backend will check it for conflicts)
    const version = _version || 0

    if (idx === -1) {
      console.log(`[SyncQueueManager] Adding NEW habit to queue:`, habit.id)
      list.push({
        id: habit.id,
        clientUpdatedAt: now,
        operation,
        version,
        payload,
      })
    } else {
      console.log(`[SyncQueueManager] Updating EXISTING habit in queue:`, {
        habitId: habit.id,
        prevOperation: list[idx].operation,
        newOperation: operation,
      })
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

    console.log(`[SyncQueueManager] Queue after enqueue:`, {
      totalHabits: this.queue.habits.length,
      habitIds: this.queue.habits.map(h => ({ id: h.id, op: h.operation })),
    })

    this.storage.saveQueue(this.queue)
  }

  /**
   * Check queue size and trigger emergency sync if needed
   */
  private checkQueueSizeAndSync(): void {
    const totalQueueSize = this.queue.goals.length + this.queue.habits.length

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
