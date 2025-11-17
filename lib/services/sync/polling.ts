"use client"

/**
 * Polling mechanism for automatic sync
 */

/**
 * Manages polling for automatic synchronization of pending changes
 * Uses recursive setTimeout to ensure next poll starts only after previous sync completes
 */
export class PollingManager {
  private timeoutId: NodeJS.Timeout | null = null
  private readonly baseIntervalMs: number
  private isRunning_: boolean = false
  private getIntervalCallback?: () => number

  constructor(intervalMs: number = 10000) {
    this.baseIntervalMs = intervalMs
  }

  /**
   * Start polling
   * @param checkCallback - Returns true if there are pending changes
   * @param syncCallback - Function to call when sync should be triggered
   * @param getIntervalCallback - Optional callback to get dynamic interval (for exponential backoff)
   */
  start(
    checkCallback: () => boolean,
    syncCallback: () => Promise<void>,
    getIntervalCallback?: () => number
  ): void {
    // If polling already running - don't create a new one
    if (this.isRunning_) {
      console.log("[PollingManager] Polling already running")
      return
    }

    this.isRunning_ = true
    this.getIntervalCallback = getIntervalCallback
    console.log(`[PollingManager] Starting polling (base interval: ${this.baseIntervalMs}ms)`)

    // Start first tick
    this.scheduleTick(checkCallback, syncCallback)
  }

  /**
   * Schedule next polling tick (recursive setTimeout)
   */
  private scheduleTick(
    checkCallback: () => boolean,
    syncCallback: () => Promise<void>
  ): void {
    if (!this.isRunning_) {
      return
    }

    // Get current interval (may be dynamic with exponential backoff)
    const currentInterval = this.getIntervalCallback
      ? this.getIntervalCallback()
      : this.baseIntervalMs

    this.timeoutId = setTimeout(async () => {
      const hasPendingChanges = checkCallback()

      if (hasPendingChanges) {
        console.log("[PollingManager] Polling tick - found pending changes, triggering sync")
        try {
          await syncCallback()
        } catch (error) {
          console.error("[PollingManager] Polling sync failed:", error)
        }
      } else {
        console.log("[PollingManager] Polling tick - no pending changes, skipping")
      }

      // Schedule next tick after sync completes
      this.scheduleTick(checkCallback, syncCallback)
    }, currentInterval)
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.isRunning_) {
      console.log("[PollingManager] Stopping polling")
      if (this.timeoutId !== null) {
        clearTimeout(this.timeoutId)
        this.timeoutId = null
      }
      this.isRunning_ = false
    }
  }

  /**
   * Check if polling is running
   */
  isRunning(): boolean {
    return this.isRunning_
  }
}
