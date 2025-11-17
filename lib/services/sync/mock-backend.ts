"use client"

/**
 * Backend sync handler
 *
 * Uses real backend if NEXT_PUBLIC_BACKEND_URL is set,
 * otherwise falls back to mock implementation
 */

import type { SyncRequest, SyncResponse } from "./types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export async function mockBackendSync(request: SyncRequest): Promise<SyncResponse> {
  // Use real backend if URL is configured
  if (BACKEND_URL) {
    return await realBackendSync(request)
  }

  // Otherwise use mock backend
  return await mockBackendSyncImpl(request)
}

/**
 * Real backend implementation
 */
async function realBackendSync(request: SyncRequest): Promise<SyncResponse> {

  try {
    const response = await fetch(`${BACKEND_URL}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      // Create error with status for proper classification
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`)
      error.status = response.status
      error.response = response

      // Try to get error details from response body
      try {
        const errorData = await response.json()
        error.data = errorData
      } catch (e) {
        // Ignore JSON parse errors
      }

      throw error
    }

    const data = await response.json()

    return data
  } catch (error: any) {
    console.error("[RealBackend] Sync request failed:", error)

    // Ensure network errors have proper classification
    if (error.name === 'TypeError' && !error.status) {
      error.message = `Network error: ${error.message}`
    }

    throw error
  }
}

/**
 * Mock backend implementation
 */
async function mockBackendSyncImpl(request: SyncRequest): Promise<SyncResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  const serverTimestamp = Date.now()
  const clockSkew = serverTimestamp - request.clientTimestamp


  // Simulate backend processing
  // Real backend would:
  // 1. Save data to DB
  // 2. Update metadata for notifications:
  //    - last_sync_timestamp
  //    - last_day_ended_date (takes newest from all devices)
  //    - pending_review_dates (merge from all devices)
  //    - current_streak
  //    - total_goals_count
  //    - total_habits_count
  // 3. Check for conflicts (if any)
  // 4. Return new timestamp and up-to-date data

  // ⚠️ FOR TESTING:
  // - Toast: can temporarily return success: false or throw error
  // - Conflicts: can add conflicts to conflicts array for UI testing
  //   Example in comments below

  // Simulate: backend stores newest lastActiveDate and merges all pendingReviewDates
  // In reality backend would do this based on data from all devices
  // Here we just return what client sent (in reality would be merged with data from other devices)
  const now = new Date().toISOString()

  // If client sent lastActiveDate, compare with current time and take newer
  // In reality backend would compare with its lastActiveDate from DB
  let serverLastActiveDate = request.review.lastActiveDate || now
  if (request.review.lastActiveDate) {
    const clientDate = new Date(request.review.lastActiveDate)
    const serverDate = new Date(now)
    // Take newer date (in reality backend would store newest from all devices)
    serverLastActiveDate = serverDate > clientDate ? now : request.review.lastActiveDate
  }

  // ⚠️ CONFLICT TESTING:
  // Uncomment block below to test conflict UI
  // Create some goals/habits in app, then enable this code and refresh page

  // const testGoalConflicts: GoalConflict[] = []
  // const testHabitConflicts: HabitConflict[] = []

  // // Generate conflicts for all goals from request (max 3 for testing)
  // const goalsToTest = request.changes.goals.slice(0, 3)
  // goalsToTest.forEach((goal, index) => {
  //   testGoalConflicts.push({
  //     id: goal.id,
  //     message: `Conflict #${index + 1}: goal "${goal.payload.title}" was changed on another device`,
  //     localEntity: goal.payload,
  //     serverEntity: {
  //       ...goal.payload,
  //       title: goal.payload.title + " (server version)",
  //       description: goal.payload.description
  //         ? goal.payload.description + " [Changed on Device #2]"
  //         : "This version was changed on Device #2",
  //       _version: (goal.version || 0) + 5,
  //     },
  //     localOperation: goal.operation,
  //     clientVersion: goal.version,
  //     serverVersion: (goal.version || 0) + 5,
  //   })
  // })

  // if (testGoalConflicts.length > 0 || testHabitConflicts.length > 0) {
  //   return {
  //     success: true,
  //     conflicts: { goals: testGoalConflicts, habits: testHabitConflicts },
  //     newLastSyncAt: Date.now(),
  //     serverTimestamp,
  //     clockSkew,
  //     review: {
  //       pendingReviewDates: request.review.pendingReviewDates,
  //       lastActiveDate: serverLastActiveDate,
  //     },
  //     changes: undefined,
  //   }
  // }

  // Normal operation (success)
  return {
    success: true,
    conflicts: { goals: [], habits: [] },
    newLastSyncAt: Date.now(),
    serverTimestamp,
    clockSkew,
    review: {
      // In reality backend would merge pendingReviewDates from all devices
      // Here we return what client sent (for testing)
      pendingReviewDates: request.review.pendingReviewDates,
      // Return lastActiveDate (in reality backend would store newest)
      lastActiveDate: serverLastActiveDate,
    },
    // BIDIRECTIONAL SYNC: In real backend this would be changes from other devices
    // For testing can uncomment block below and add test changes
    changes: undefined,
  }
}
