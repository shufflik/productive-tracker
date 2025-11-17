"use client"

/**
 * Sync Service - Core synchronization logic
 *
 * ARCHITECTURE:
 * 1. Online-first with offline queue: All changes saved to localStorage and added to sync queue
 * 2. Asynchronous sync: sync() doesn't block UI, works in background
 * 3. Delta sync: Only send changes from queue (not all data)
 * 4. Bidirectional sync: Send changes and receive updates from other devices in one request
 * 5. Backend-authoritative versioning: Backend increments _version, client only sends current version
 * 6. User-driven conflict resolution: Show form on conflicts, user chooses which version to keep
 * 7. Silent operation: No loading indicators (except conflict form)
 * 8. Error notifications only: Toast appears only if sync failed
 */

import type { Goal, Habit } from "@/lib/types"
import { toast } from "sonner"
import type {
  SyncMeta,
  SyncRequest,
  SyncResponse,
  SyncReviewBlock,
  SyncConflicts,
  GoalConflict,
  HabitConflict,
  GoalsApplyHandler,
  HabitsApplyHandler,
  GoalsDeleteHandler,
  HabitsDeleteHandler,
  PendingReviewsApplyHandler,
  ConflictsHandler,
} from "./types"
import { SyncStorage } from "./storage"
import { SyncQueueManager } from "./queue"
import { PollingManager } from "./polling"
import { RetryManager } from "./retry-manager"
import { mockBackendSync } from "./mock-backend"

/**
 * Core sync service
 */
export class SyncService {
  private isSyncing = false
  private lastSyncTimestamp = 0
  private meta: SyncMeta
  private storage: SyncStorage
  private queueManager: SyncQueueManager
  private pollingManager: PollingManager
  private retryManager: RetryManager
  private pendingConflicts: SyncConflicts = { goals: [], habits: [] }

  // Promise-based sync lock to prevent concurrent syncs
  private currentSyncPromise: Promise<void> | null = null

  // Handlers for applying server data back into stores
  private applyGoals?: GoalsApplyHandler
  private applyHabits?: HabitsApplyHandler
  private deleteGoals?: GoalsDeleteHandler
  private deleteHabits?: HabitsDeleteHandler
  private applyPendingReviews?: PendingReviewsApplyHandler
  private conflictsHandler?: ConflictsHandler

  constructor() {
    this.storage = new SyncStorage()
    this.queueManager = new SyncQueueManager(this.storage)
    this.pollingManager = new PollingManager(5000) // 5 seconds
    this.retryManager = new RetryManager(5, 1000, 60000) // 5 retries, 1s base, 60s max

    // Load state from storage
    this.meta = this.storage.loadMeta()
    this.lastSyncTimestamp = this.meta.lastSyncAt
    this.pendingConflicts = this.storage.loadPendingConflicts()

    // Set queue overflow callback
    this.queueManager.setOverflowCallback(() => this.sync())

    // Show pending conflicts if any
    const hasConflicts = this.pendingConflicts.goals.length > 0 || this.pendingConflicts.habits.length > 0
    if (hasConflicts && this.conflictsHandler) {
      this.conflictsHandler(this.pendingConflicts)
    }
  }

  /**
   * Register handlers for applying data from backend into stores
   */
  registerGoalsApplyHandler(handler: GoalsApplyHandler): void {
    this.applyGoals = handler
  }

  registerHabitsApplyHandler(handler: HabitsApplyHandler): void {
    this.applyHabits = handler
  }

  registerGoalsDeleteHandler(handler: GoalsDeleteHandler): void {
    this.deleteGoals = handler
  }

  registerHabitsDeleteHandler(handler: HabitsDeleteHandler): void {
    this.deleteHabits = handler
  }

  registerPendingReviewsApplyHandler(handler: PendingReviewsApplyHandler): void {
    this.applyPendingReviews = handler
  }

  registerConflictsHandler(handler: ConflictsHandler): void {
    this.conflictsHandler = handler
  }

  /**
   * Apply user's choice for conflict resolution
   */
  resolveConflict(conflictId: string, chosenVersion: 'local' | 'server'): void {
    // Try to find conflict in goals first
    let goalConflict = this.pendingConflicts.goals.find(c => c.id === conflictId)
    let habitConflict: HabitConflict | undefined
    let isGoal = !!goalConflict

    // If not found in goals, try habits
    if (!goalConflict) {
      habitConflict = this.pendingConflicts.habits.find(c => c.id === conflictId)
      if (!habitConflict) {
        console.warn(`[SyncService] Conflict ${conflictId} not found in pending conflicts`)
        return
      }
    }

    const conflict = goalConflict || habitConflict!

    if (chosenVersion === 'server') {
      // User chose server version
      if (isGoal && conflict.serverEntity && this.applyGoals) {
        this.applyGoals([conflict.serverEntity as Goal])
      } else if (!isGoal && conflict.serverEntity && this.applyHabits) {
        this.applyHabits([conflict.serverEntity as Habit])
      }

      // Remove local change from queue (server version already on server)
      const goalIds = isGoal ? new Set([conflictId]) : new Set<string>()
      const habitIds = !isGoal ? new Set([conflictId]) : new Set<string>()
      this.queueManager.removeConflictedItems(goalIds, habitIds)
    } else {
      // User chose local version
      // Apply local version in localStorage
      if (isGoal && conflict.localEntity && this.applyGoals) {
        this.applyGoals([conflict.localEntity as Goal])
      } else if (!isGoal && conflict.localEntity && this.applyHabits) {
        this.applyHabits([conflict.localEntity as Habit])
      }

      // Update queue item with _resolveConflictVersion
      // This will be sent to backend with server's version for atomic conflict resolution
      const serverVersion = conflict.serverEntity?._version
      if (serverVersion !== undefined) {
        if (isGoal && conflict.localEntity) {
          this.queueManager.updateGoalWithResolveConflict(
            conflictId,
            conflict.localEntity as Goal,
            serverVersion
          )
        } else if (!isGoal && conflict.localEntity) {
          this.queueManager.updateHabitWithResolveConflict(
            conflictId,
            conflict.localEntity as Habit,
            serverVersion
          )
        }
      }
    }

    // Remove resolved conflict from pending
    if (isGoal) {
      this.pendingConflicts.goals = this.pendingConflicts.goals.filter(c => c.id !== conflictId)
    } else {
      this.pendingConflicts.habits = this.pendingConflicts.habits.filter(c => c.id !== conflictId)
    }
    this.storage.savePendingConflicts(this.pendingConflicts)

    console.log(`[SyncService] Conflict ${conflictId} resolved with ${chosenVersion} version`)
  }

  onConflictsResolved(): void {
    // Called after user resolved all conflicts
    this.pendingConflicts = { goals: [], habits: [] }
    this.storage.savePendingConflicts(this.pendingConflicts)

    // Trigger sync to send resolved conflicts
    // This will update lastSyncAt if successful (no new conflicts)
    this.sync().then(() => {
      // Resume polling after sync completes
      if (!this.pollingManager.isRunning()) {
        this.pollingManager.start(
          () => this.queueManager.hasPendingChanges(),
          () => this.sync(),
          () => this.retryManager.getPollingDelay(5000)
        )
      }
    }).catch(error => {
      console.error("[SyncService] Sync after conflict resolution failed:", error)
      // Resume polling even if sync failed
      if (!this.pollingManager.isRunning()) {
        this.pollingManager.start(
          () => this.queueManager.hasPendingChanges(),
          () => this.sync(),
          () => this.retryManager.getPollingDelay(5000)
        )
      }
    })
  }

  /**
   * Get lastSyncAt for stores (needed to determine new entities)
   */
  getLastSyncAt(): number {
    return this.meta.lastSyncAt
  }

  /**
   * Main synchronization method
   * Sends changes from queue to server
   *
   * Called:
   * - On WebApp open (if there are changes or first launch)
   * - After critical events (close day, reschedule goal, delete habit)
   * - By polling (every 5 seconds if there are pending changes)
   *
   * Works asynchronously, doesn't block UI
   * Shows toast only on errors
   */
  async sync(): Promise<void> {
    // If already syncing - wait for current sync to complete
    if (this.currentSyncPromise) {
      console.log("[SyncService] Sync already in progress, waiting for completion...")
      try {
        await this.currentSyncPromise
      } catch (error) {
        // Ignore errors from previous sync
        console.log("[SyncService] Previous sync failed, continuing with new sync")
      }
    }

    const hasChanges = this.queueManager.hasPendingChanges()
    const isFirstSync = this.meta.lastSyncAt === 0

    // If no changes and not first sync - skip
    if (!isFirstSync && !hasChanges) {
      console.log("[SyncService] No local changes, skipping sync")
      return
    }

    // Create promise for sync and save it
    this.currentSyncPromise = this.performSync()

    try {
      await this.currentSyncPromise
    } finally {
      this.currentSyncPromise = null
    }
  }

  /**
   * Internal method for performing sync
   * Called from sync() with proper lock management
   */
  private async performSync(): Promise<void> {
    this.isSyncing = true
    const queue = this.queueManager.getQueue()

    console.log("[SyncService] Starting sync...", {
      goals: queue.goals.length,
      habits: queue.habits.length,
      isFirstSync: this.meta.lastSyncAt === 0,
      goalDetails: queue.goals.map(g => ({ id: g.id, op: g.operation, title: g.payload.title })),
    })

    // CRITICAL: Take snapshot of changes that will be sent
    // This protects from losing changes added during sync request
    const snapshotGoals = [...queue.goals]
    const snapshotHabits = [...queue.habits]
    const snapshotGoalIds = new Set(snapshotGoals.map(g => g.id))
    const snapshotHabitIds = new Set(snapshotHabits.map(h => h.id))

    try {
      const reviewBlock = this.collectReviewBlock()
      const userId = this.getUserId()
      const clientTimestamp = Date.now()
      const clientTimezone = this.getClientTimezone()

      const request: SyncRequest = {
        userId,
        deviceId: this.meta.deviceId,
        lastSyncAt: this.meta.lastSyncAt,
        clientTimestamp,
        clientTimezone,
        changes: {
          goals: snapshotGoals,
          habits: snapshotHabits,
        },
        review: reviewBlock,
      }

      // PLACEHOLDER: In real app this would be fetch to backend
      const response = await mockBackendSync(request)

      if (response.success) {
        // Check for conflicts FIRST before updating lastSyncAt
        const hasConflicts = (response.conflicts.goals.length > 0 || response.conflicts.habits.length > 0)

        // Check clock skew (only log, don't show toast)
        if (response.clockSkew && Math.abs(response.clockSkew) > 60000) {
          // More than 1 minute difference
          const skewMinutes = Math.round(response.clockSkew / 60000)
          console.warn(`[SyncService] Clock skew detected: ${skewMinutes} minutes`)
        }

        console.log("[SyncService] Sync completed successfully", {
          timestamp: response.newLastSyncAt,
          conflicts: {
            goals: response.conflicts.goals.length,
            habits: response.conflicts.habits.length,
          },
          serverChanges: {
            goals: response.changes?.goals?.length || 0,
            habits: response.changes?.habits?.length || 0,
          },
          clockSkew: response.clockSkew,
        })

        // CRITICAL: Only update lastSyncAt and clear queue if NO conflicts
        if (!hasConflicts) {
          console.log('[SyncService] No conflicts detected, clearing queue', {
            snapshotGoalIds: Array.from(snapshotGoalIds),
            snapshotHabitIds: Array.from(snapshotHabitIds),
          })

          this.lastSyncTimestamp = response.newLastSyncAt
          this.meta.lastSyncAt = response.newLastSyncAt

          // Remove only sent changes from queue
          // New changes added during sync stay in queue
          this.queueManager.clearSentItems(snapshotGoalIds, snapshotHabitIds)

          // Save metadata only if no conflicts
          this.storage.saveMeta(this.meta)

          console.log('[SyncService] lastSyncAt updated to:', response.newLastSyncAt)

          // Reset retry count on successful sync
          this.retryManager.reset()
        } else {
          console.warn("[SyncService] Conflicts detected - NOT updating lastSyncAt and NOT clearing queue")
        }

        // Apply review block from backend (merge pendingReviewDates and lastActiveDate)
        if (response.review && this.applyPendingReviews) {
          this.applyPendingReviews(response.review)
        }

        // CRITICAL: Collect IDs of conflicted entities for filtering
        // If entity is in both conflicts and changes - priority goes to conflicts
        const conflictedGoalIds = new Set<string>()
        const conflictedHabitIds = new Set<string>()

        if (hasConflicts) {
          console.log('[SyncService] Conflicts detected:', {
            goals: response.conflicts.goals.map(c => ({
              id: c.id,
              localVersion: c.localEntity?._version,
              serverVersion: c.serverEntity?._version,
            })),
            habits: response.conflicts.habits.map(c => ({
              id: c.id,
              localVersion: c.localEntity?._version,
              serverVersion: c.serverEntity?._version,
            }))
          })

          response.conflicts.goals.forEach(conflict => {
            conflictedGoalIds.add(conflict.id)
          })

          response.conflicts.habits.forEach(conflict => {
            conflictedHabitIds.add(conflict.id)
          })

          console.log('[SyncService] Conflicted IDs:', {
            goals: Array.from(conflictedGoalIds),
            habits: Array.from(conflictedHabitIds),
          })
        }

        // BIDIRECTIONAL SYNC: Apply changes from backend (changes from other devices)
        console.log('[SyncService] Processing response.changes:', {
          hasChanges: !!response.changes,
          goalsCount: response.changes?.goals?.length || 0,
          habitsCount: response.changes?.habits?.length || 0,
        })

        if (response.changes) {
          if (response.changes.goals && response.changes.goals.length > 0) {
            console.log('[SyncService] Received goals from backend:',
              response.changes.goals.map(g => ({
                id: g.id,
                title: g.title,
                version: g._version,
                deleted: 'deleted' in g,
                isConflicted: conflictedGoalIds.has(g.id)
              })))

            // Filter deleted goals and regular goals
            // IMPORTANT: Exclude conflicted goals (they're processed separately)
            // Check VALUE of deleted field, not just presence of key
            const goalsBeforeDeleteFilter = response.changes.goals.filter((g): g is Goal => g.deleted !== true)
            console.log('[SyncService] Goals after delete filter:', goalsBeforeDeleteFilter.length,
              'removed:', response.changes.goals.length - goalsBeforeDeleteFilter.length)

            const goalsToApply = goalsBeforeDeleteFilter.filter(g => !conflictedGoalIds.has(g.id))
            console.log('[SyncService] Goals after conflict filter:', goalsToApply.length,
              'removed:', goalsBeforeDeleteFilter.length - goalsToApply.length)

            console.log('[SyncService] Final goals to apply:',
              goalsToApply.map(g => ({ id: g.id, title: g.title, version: g._version })))

            const goalsToDelete = response.changes.goals
              .filter((g): g is { id: string; deleted: true } => g.deleted === true)
              .map(g => g.id)
              .filter(id => !conflictedGoalIds.has(id))  // ← Exclude conflicts

            if (goalsToApply.length > 0 && this.applyGoals) {
              console.log(`[SyncService] Applying ${goalsToApply.length} goals from server`,
                goalsToApply.map(g => ({ id: g.id, title: g.title, version: g._version })))
              this.applyGoals(goalsToApply)
            }

            if (goalsToDelete.length > 0) {
              console.log(`[SyncService] Deleting ${goalsToDelete.length} goals requested by server:`, goalsToDelete)
              if (this.deleteGoals) {
                this.deleteGoals(goalsToDelete)
              } else {
                console.warn("[SyncService] deleteGoals handler not registered! Goals will not be deleted locally.")
              }
            }
          }

          if (response.changes.habits && response.changes.habits.length > 0) {
            // IMPORTANT: Exclude conflicted habits (they're processed separately)
            // Check VALUE of deleted field, not just presence of key
            const habitsToApply = response.changes.habits
              .filter((h): h is Habit => h.deleted !== true)
              .filter(h => !conflictedHabitIds.has(h.id))  // ← Exclude conflicts

            const habitsToDelete = response.changes.habits
              .filter((h): h is { id: string; deleted: true } => h.deleted === true)
              .map(h => h.id)
              .filter(id => !conflictedHabitIds.has(id))  // ← Exclude conflicts

            if (habitsToApply.length > 0 && this.applyHabits) {
              console.log(`[SyncService] Applying ${habitsToApply.length} habits from server`)
              this.applyHabits(habitsToApply)
            }

            if (habitsToDelete.length > 0) {
              console.log(`[SyncService] Deleting ${habitsToDelete.length} habits requested by server:`, habitsToDelete)
              if (this.deleteHabits) {
                this.deleteHabits(habitsToDelete)
              } else {
                console.warn("[SyncService] deleteHabits handler not registered! Habits will not be deleted locally.")
              }
            }
          }
        }

        // CRITICAL: Handle conflicts - show form for user to choose version
        if (hasConflicts) {
          console.warn("[SyncService] Conflicts detected:", response.conflicts)

          // Stop polling - blocking UI state
          this.pollingManager.stop()

          // Save conflicts for user resolution
          // DO NOT automatically apply either version!
          // User will choose via conflict resolution form
          this.pendingConflicts = response.conflicts
          this.storage.savePendingConflicts(this.pendingConflicts)

          // Call handler to show form to user
          if (this.conflictsHandler) {
            this.conflictsHandler(response.conflicts)
          }
        }
      } else {
        console.error("[SyncService] Sync failed - response.success = false")
        this.handleSyncError(new Error("Sync failed"))
      }
    } catch (error) {
      console.error("[SyncService] Sync error:", error)
      this.handleSyncError(error)
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Handle sync error with retry logic
   */
  private handleSyncError(error: any): void {
    // Check if should retry
    if (this.retryManager.shouldRetry(error)) {
      this.retryManager.incrementRetry()
      const retryCount = this.retryManager.getRetryCount()

      console.warn(`[SyncService] Sync failed, will retry (attempt ${retryCount}/5)`)
      this.showErrorToast(`Ошибка синхронизации (попытка ${retryCount}/5)`)

      // Polling will automatically retry with exponential backoff
    } else {
      // Max retries exceeded or non-recoverable error
      if (this.retryManager.isMaxRetriesExceeded()) {
        console.error("[SyncService] Max retries exceeded, stopping polling")
        this.pollingManager.stop()
        this.showErrorToast("Не удалось синхронизировать. Проверьте подключение и перезагрузите приложение.")
      } else {
        console.error("[SyncService] Non-recoverable error, stopping sync")
        this.showErrorToast("Ошибка синхронизации. Проверьте данные.")
      }
    }
  }

  /**
   * Enqueue goal change
   */
  enqueueGoalChange(operation: Parameters<SyncQueueManager['enqueueGoalChange']>[0], goal: Goal): void {
    this.queueManager.enqueueGoalChange(operation, goal)
  }

  /**
   * Enqueue habit change
   */
  enqueueHabitChange(operation: Parameters<SyncQueueManager['enqueueHabitChange']>[0], habit: Habit): void {
    this.queueManager.enqueueHabitChange(operation, habit)
  }

  /**
   * Start polling for automatic sync
   */
  startPolling(): void {
    this.pollingManager.start(
      () => this.queueManager.hasPendingChanges(),
      () => this.sync(),
      () => this.retryManager.getPollingDelay(5000) // Dynamic interval with exponential backoff
    )
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    this.pollingManager.stop()
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSyncDate: this.lastSyncTimestamp
        ? new Date(this.lastSyncTimestamp).toLocaleString()
        : "Never",
      isPolling: this.pollingManager.isRunning(),
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

  /**
   * Get userId from Telegram WebApp
   */
  private getUserId(): string {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      return String(window.Telegram.WebApp.initDataUnsafe.user.id)
    }
    // Fallback for development
    return "dev-user-id"
  }

  /**
   * Get client timezone (IANA timezone)
   */
  private getClientTimezone(): string {
    if (typeof window === "undefined") {
      return "UTC"
    }
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (error) {
      console.error("[SyncService] Failed to get timezone:", error)
      return "UTC"
    }
  }

  /**
   * Collect pendingReviewDates and lastActiveDate from day-state-store
   */
  private collectReviewBlock(): SyncReviewBlock {
    if (typeof window === "undefined") {
      return { pendingReviewDates: [] }
    }

    try {
      const dayStateData = localStorage.getItem("day-state-storage")
      if (!dayStateData) return { pendingReviewDates: [] }

      const dayState = JSON.parse(dayStateData).state
      return {
        pendingReviewDates: dayState?.pendingReviewDates || [],
        lastActiveDate: dayState?.lastActiveDate || null,
      }
    } catch (error) {
      console.error("[SyncService] Failed to collect review block:", error)
      return { pendingReviewDates: [] }
    }
  }
}

/**
 * Global type for Telegram WebApp
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id: number
            first_name?: string
            last_name?: string
            username?: string
          }
        }
        ready: () => void
        expand: () => void
        disableVerticalSwipes?: () => void
        isExpanded?: boolean
        HapticFeedback?: {
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
          selectionChanged: () => void
        }
      }
    }
  }
}
