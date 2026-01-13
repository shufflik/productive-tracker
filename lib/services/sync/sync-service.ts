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

import type { Goal, Habit, GlobalGoal, Milestone } from "@/lib/types"
import { toast } from "sonner"
import type {
  SyncMeta,
  SyncRequest,
  SyncReviewBlock,
  SyncConflicts,
  SyncResult,
  GoalsApplyHandler,
  HabitsApplyHandler,
  GlobalGoalsApplyHandler,
  MilestonesApplyHandler,
  GoalsDeleteHandler,
  HabitsDeleteHandler,
  GlobalGoalsDeleteHandler,
  MilestonesDeleteHandler,
  PendingReviewsApplyHandler,
  ConflictsHandler,
} from "./types"
import { SyncStorage } from "./storage"
import { SyncQueueManager } from "./queue"
import { PollingManager } from "./polling"
import { RetryManager } from "./retry-manager"
import { syncApi } from "../api-client"
import { processServerChanges, collectConflictedIds, type ChangesHandlers } from "./changes-handler"
import { resolveConflict as resolveConflictFn, hasConflicts, createEmptyConflicts } from "./conflict-handler"

/**
 * Core sync service
 */
export class SyncService {
  private isSyncing = false
  private lastSyncTimestamp = 0
  private lastSuccessfulSyncTime = 0 // Time of last successful sync (ms since epoch)
  private meta: SyncMeta
  private storage: SyncStorage
  private queueManager: SyncQueueManager
  private pollingManager: PollingManager
  private retryManager: RetryManager
  private pendingConflicts: SyncConflicts = { goals: [], habits: [], globalGoals: [], milestones: [] }
  private hasPerformedInitialSync = false

  // Promise-based sync lock to prevent concurrent syncs
  private currentSyncPromise: Promise<SyncResult> | null = null

  // Minimum interval between forced syncs (30 seconds)
  private readonly FORCE_SYNC_INTERVAL_MS = 30000

  // Handlers for applying server data back into stores
  private applyGoals?: GoalsApplyHandler
  private applyHabits?: HabitsApplyHandler
  private applyGlobalGoals?: GlobalGoalsApplyHandler
  private applyMilestones?: MilestonesApplyHandler
  private deleteGoals?: GoalsDeleteHandler
  private deleteHabits?: HabitsDeleteHandler
  private deleteGlobalGoals?: GlobalGoalsDeleteHandler
  private deleteMilestones?: MilestonesDeleteHandler
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
    if (hasConflicts(this.pendingConflicts) && this.conflictsHandler) {
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

  registerGlobalGoalsApplyHandler(handler: GlobalGoalsApplyHandler): void {
    this.applyGlobalGoals = handler
  }

  registerMilestonesApplyHandler(handler: MilestonesApplyHandler): void {
    this.applyMilestones = handler
  }

  registerGlobalGoalsDeleteHandler(handler: GlobalGoalsDeleteHandler): void {
    this.deleteGlobalGoals = handler
  }

  registerMilestonesDeleteHandler(handler: MilestonesDeleteHandler): void {
    this.deleteMilestones = handler
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
    this.pendingConflicts = resolveConflictFn(
      conflictId,
      chosenVersion,
      this.pendingConflicts,
      this.queueManager,
      this.storage,
      this.getChangesHandlers()
    )
  }

  /**
   * Get handlers object for changes-handler and conflict-handler
   */
  private getChangesHandlers(): ChangesHandlers {
    return {
      applyGoals: this.applyGoals,
      applyHabits: this.applyHabits,
      applyGlobalGoals: this.applyGlobalGoals,
      applyMilestones: this.applyMilestones,
      deleteGoals: this.deleteGoals,
      deleteHabits: this.deleteHabits,
      deleteGlobalGoals: this.deleteGlobalGoals,
      deleteMilestones: this.deleteMilestones,
    }
  }

  onConflictsResolved(): void {
    // Called after user resolved all conflicts
    this.pendingConflicts = createEmptyConflicts()
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
   * Get device ID
   */
  getDeviceId(): string {
    return this.meta.deviceId
  }

  /**
   * Check if sync should be forced based on time since last successful sync
   * Returns true if more than 30 seconds passed since last successful sync
   */
  private shouldForceSyncByTime(): boolean {
    if (this.lastSuccessfulSyncTime === 0) {
      return false // First sync hasn't happened yet
    }
    const timeSinceLastSync = Date.now() - this.lastSuccessfulSyncTime
    return timeSinceLastSync >= this.FORCE_SYNC_INTERVAL_MS
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
  async sync(options?: { force?: boolean }): Promise<void> {
    // If already syncing - wait for current sync to complete
    if (this.currentSyncPromise) {
      try {
        await this.currentSyncPromise
      } catch (error) {
        // Ignore errors from previous sync
      }
    }

    const hasChanges = this.queueManager.hasPendingChanges()
    const isFirstSync = this.meta.lastSyncAt === 0
    const forceSync = options?.force === true
    const shouldForceSyncByTime = this.shouldForceSyncByTime()

    // If no changes and not first sync and not forced and not time-based force - skip
    if (!forceSync && !isFirstSync && !hasChanges && !shouldForceSyncByTime) {
      return
    }

    // Create promise for sync and save it
    this.currentSyncPromise = this.performSync()

    try {
      await this.currentSyncPromise
      this.hasPerformedInitialSync = true
    } finally {
      this.currentSyncPromise = null
    }
  }

  /**
   * Sync on app start
   * Always performs sync once per app lifecycle, regardless of queue state
   * This ensures we receive updates from other devices on app launch
   */
  async syncOnAppStart(): Promise<void> {
    if (!this.hasPerformedInitialSync) {
      await this.sync({ force: true })
    }
  }

  /**
   * Sync with result - returns sync status instead of void
   * Used when caller needs to know sync result before proceeding (e.g., before end-day)
   */
  async syncAndWaitResult(options?: { force?: boolean }): Promise<SyncResult> {
    // If already syncing - wait for current sync to complete
    if (this.currentSyncPromise) {
      try {
        await this.currentSyncPromise
      } catch (error) {
        // Ignore errors from previous sync
      }
    }

    const hasChanges = this.queueManager.hasPendingChanges()
    const isFirstSync = this.meta.lastSyncAt === 0
    const forceSync = options?.force === true
    const shouldForceSyncByTime = this.shouldForceSyncByTime()

    // If no changes and not first sync and not forced and not time-based force - return success
    if (!forceSync && !isFirstSync && !hasChanges && !shouldForceSyncByTime) {
      return { status: "success" }
    }

    // Create promise for sync and save it
    this.currentSyncPromise = this.performSync()

    try {
      const result = await this.currentSyncPromise
      this.hasPerformedInitialSync = true
      return result
    } catch (error) {
      return { status: "error", error: error instanceof Error ? error : new Error(String(error)) }
    } finally {
      this.currentSyncPromise = null
    }
  }

  /**
   * Internal method for performing sync
   * Called from sync() with proper lock management
   * Returns SyncResult for callers that need to handle the result
   */
  private async performSync(): Promise<SyncResult> {
    this.isSyncing = true
    const queue = this.queueManager.getQueue()

    // CRITICAL: Take snapshot of changes that will be sent
    // This protects from losing changes added during sync request
    const snapshotGoals = [...queue.goals]
    const snapshotHabits = [...queue.habits]
    const snapshotGlobalGoals = [...queue.globalGoals]
    const snapshotMilestones = [...queue.milestones]
    const snapshotGoalIds = new Set(snapshotGoals.map(g => g.id))
    const snapshotHabitIds = new Set(snapshotHabits.map(h => h.id))
    const snapshotGlobalGoalIds = new Set(snapshotGlobalGoals.map(gg => gg.id))
    const snapshotMilestoneIds = new Set(snapshotMilestones.map(m => m.id))

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
          globalGoals: snapshotGlobalGoals,
          milestones: snapshotMilestones,
        },
        review: reviewBlock,
      }

      const response = await syncApi(request)

      if (response.success) {
        // Check for conflicts FIRST before updating lastSyncAt
        const hasConflictsInResponse = hasConflicts(response.conflicts)

        if (!hasConflictsInResponse) {
          this.lastSyncTimestamp = response.lastSyncAt
          this.meta.lastSyncAt = response.lastSyncAt
          this.lastSuccessfulSyncTime = Date.now() // Update time of last successful sync

          // Remove only sent changes from queue
          // New changes added during sync stay in queue
          this.queueManager.clearSentItems(
            snapshotGoalIds,
            snapshotHabitIds,
            snapshotGlobalGoalIds,
            snapshotMilestoneIds
          )

          // Save metadata only if no conflicts
          this.storage.saveMeta(this.meta)

          // Reset retry count on successful sync
          this.retryManager.reset()
        } else {
          console.warn("[SyncService] Conflicts detected - NOT updating lastSyncAt and NOT clearing queue")
        }

        // Apply review block from backend (pendingReview with goals and dayEnded status)
        if (response.review && this.applyPendingReviews) {
          this.applyPendingReviews(response.review)
        }

        // Collect conflicted IDs for filtering
        const conflictedIds = collectConflictedIds(response.conflicts)

        // BIDIRECTIONAL SYNC: Apply changes from backend (changes from other devices)
        if (response.changes) {
          processServerChanges(response.changes, conflictedIds, this.getChangesHandlers())
        }

        // CRITICAL: Handle conflicts - show form for user to choose version
        if (hasConflictsInResponse) {
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

          return { status: "conflict", conflicts: response.conflicts }
        }

        return { status: "success" }
      } else {
        console.error("[SyncService] Sync failed - response.success = false")
        this.handleSyncError(new Error("Sync failed"))
        return { status: "error", error: new Error("Sync failed") }
      }
    } catch (error) {
      console.error("[SyncService] Sync error:", error)
      this.handleSyncError(error)
      return { status: "error", error: error instanceof Error ? error : new Error(String(error)) }
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
      
      // Show toast on each retry attempt
      this.showErrorToast(`Ошибка синхронизации. Попытка ${retryCount}/5...`)

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
   * Enqueue global goal change
   */
  enqueueGlobalGoalChange(operation: Parameters<SyncQueueManager['enqueueGlobalGoalChange']>[0], globalGoal: GlobalGoal): void {
    this.queueManager.enqueueGlobalGoalChange(operation, globalGoal)
  }

  /**
   * Enqueue milestone change
   */
  enqueueMilestoneChange(operation: Parameters<SyncQueueManager['enqueueMilestoneChange']>[0], milestone: Milestone): void {
    this.queueManager.enqueueMilestoneChange(operation, milestone)
  }

  /**
   * Start polling for automatic sync
   * Checks both queue state and time since last sync
   */
  startPolling(): void {
    this.pollingManager.start(
      () => {
        const hasChanges = this.queueManager.hasPendingChanges()
        const shouldSyncByTime = this.shouldForceSyncByTime()
        return hasChanges || shouldSyncByTime
      },
      () => {
        const shouldForceSyncByTime = this.shouldForceSyncByTime()
        return this.sync(shouldForceSyncByTime ? { force: true } : undefined)
      },
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
   * Collect review block for sync request
   * Note: pendingReview is now generated by backend, client sends empty block
   */
  private collectReviewBlock(): SyncReviewBlock {
    return {}
  }
}

/**
 * Global type for Telegram WebApp
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string
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
        SettingsButton?: {
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
          isVisible: boolean
        }
      }
    }
  }
}
