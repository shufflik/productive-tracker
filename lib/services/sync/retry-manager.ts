"use client"

/**
 * Retry manager with exponential backoff
 */

export type ErrorType = 'recoverable' | 'non-recoverable' | 'conflict'

/**
 * Determines if error is recoverable (should retry)
 */
export function classifyError(error: any): ErrorType {
  // Network errors - recoverable
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'recoverable'
  }

  // HTTP errors
  if (error.status || error.response?.status) {
    const status = error.status || error.response?.status

    // Server errors - recoverable (temporary issues)
    if (status >= 500 && status < 600) {
      return 'recoverable'
    }

    // Conflict - handled separately
    if (status === 409) {
      return 'conflict'
    }

    // Client errors - non-recoverable (bad request, auth, etc)
    if (status >= 400 && status < 500) {
      return 'non-recoverable'
    }
  }

  // Unknown errors - treat as recoverable (safer to retry)
  return 'recoverable'
}

/**
 * Manages retry logic with exponential backoff
 */
export class RetryManager {
  private retryCount = 0
  private readonly maxRetries: number
  private readonly baseDelay: number
  private readonly maxDelay: number

  constructor(maxRetries = 5, baseDelay = 1000, maxDelay = 60000) {
    this.maxRetries = maxRetries
    this.baseDelay = baseDelay
    this.maxDelay = maxDelay
  }

  /**
   * Get current retry count
   */
  getRetryCount(): number {
    return this.retryCount
  }

  /**
   * Check if should retry
   */
  shouldRetry(error: any): boolean {
    const errorType = classifyError(error)

    // Never retry non-recoverable errors
    if (errorType === 'non-recoverable') {
      console.warn('[RetryManager] Non-recoverable error, will not retry:', error)
      return false
    }

    // Conflicts handled separately (not counted as retry)
    if (errorType === 'conflict') {
      return false
    }

    // Check retry limit
    if (this.retryCount >= this.maxRetries) {
      console.warn(`[RetryManager] Max retries (${this.maxRetries}) reached`)
      return false
    }

    return true
  }

  /**
   * Calculate delay for next retry (exponential backoff)
   */
  getNextDelay(): number {
    // Exponential backoff: baseDelay * 2^retryCount
    // Example: 1s, 2s, 4s, 8s, 16s, 32s, 60s (capped)
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.retryCount),
      this.maxDelay
    )

    return delay
  }

  /**
   * Increment retry count
   */
  incrementRetry(): void {
    this.retryCount++
  }

  /**
   * Reset retry count (after successful sync)
   */
  reset(): void {
    if (this.retryCount > 0) {
      this.retryCount = 0
    }
  }

  /**
   * Check if max retries exceeded
   */
  isMaxRetriesExceeded(): boolean {
    return this.retryCount >= this.maxRetries
  }

  /**
   * Get delay for polling based on retry state
   * Returns longer delay when retrying (exponential backoff)
   * Returns normal delay when not retrying
   */
  getPollingDelay(normalDelay: number): number {
    if (this.retryCount === 0) {
      return normalDelay
    }

    // Use exponential backoff delay during retries
    return this.getNextDelay()
  }
}
