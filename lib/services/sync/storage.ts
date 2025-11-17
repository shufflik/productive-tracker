"use client"

/**
 * LocalStorage operations for sync service
 */

import { generateId } from "@/lib/utils/id"
import type { SyncMeta, SyncQueue, SyncConflicts } from "./types"

const SYNC_META_STORAGE_KEY = "sync-meta"
const SYNC_QUEUE_STORAGE_KEY = "sync-queue"
const PENDING_CONFLICTS_STORAGE_KEY = "sync-pending-conflicts"

/**
 * Manages localStorage operations for sync service
 */
export class SyncStorage {
  /**
   * Load sync metadata from localStorage
   */
  loadMeta(): SyncMeta {
    if (typeof window === "undefined") {
      return { deviceId: "ssr-device-id", lastSyncAt: 0 }
    }

    try {
      const raw = window.localStorage.getItem(SYNC_META_STORAGE_KEY)
      if (!raw) {
        // New device / first launch
        const deviceId = generateId()
        const meta: SyncMeta = { deviceId, lastSyncAt: 0 }
        this.saveMeta(meta)
        return meta
      }

      const parsed = JSON.parse(raw) as SyncMeta
      if (!parsed.deviceId) {
        parsed.deviceId = generateId()
      }
      if (typeof parsed.lastSyncAt !== "number") {
        parsed.lastSyncAt = 0
      }
      return parsed
    } catch (error) {
      console.error("[SyncStorage] Failed to load sync meta:", error)
      // Fallback: create new deviceId
      const deviceId = generateId()
      return { deviceId, lastSyncAt: 0 }
    }
  }

  /**
   * Save sync metadata to localStorage
   */
  saveMeta(meta: SyncMeta): void {
    if (typeof window === "undefined") return

    try {
      window.localStorage.setItem(SYNC_META_STORAGE_KEY, JSON.stringify(meta))
    } catch (error) {
      console.error("[SyncStorage] Failed to save sync meta:", error)
    }
  }

  /**
   * Load sync queue from localStorage
   */
  loadQueue(): SyncQueue {
    if (typeof window === "undefined") {
      return { goals: [], habits: [] }
    }

    try {
      const raw = window.localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)
      if (!raw) {
        return { goals: [], habits: [] }
      }

      const parsed = JSON.parse(raw) as SyncQueue
      const result = {
        goals: parsed.goals || [],
        habits: parsed.habits || [],
      }


      return result
    } catch (error) {
      console.error("[SyncStorage] Failed to load sync queue:", error)
      return { goals: [], habits: [] }
    }
  }

  /**
   * Save sync queue to localStorage
   */
  saveQueue(queue: SyncQueue): void {
    if (typeof window === "undefined") return

    try {

      window.localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue))
    } catch (error) {
      console.error("[SyncStorage] Failed to save sync queue:", error)
    }
  }

  /**
   * Load pending conflicts from localStorage
   */
  loadPendingConflicts(): SyncConflicts {
    if (typeof window === "undefined") {
      return { goals: [], habits: [] }
    }

    try {
      const raw = window.localStorage.getItem(PENDING_CONFLICTS_STORAGE_KEY)
      if (!raw) {
        return { goals: [], habits: [] }
      }

      const parsed = JSON.parse(raw) as SyncConflicts
      return {
        goals: parsed.goals || [],
        habits: parsed.habits || [],
      }
    } catch (error) {
      console.error("[SyncStorage] Failed to load pending conflicts:", error)
      return { goals: [], habits: [] }
    }
  }

  /**
   * Save pending conflicts to localStorage
   */
  savePendingConflicts(conflicts: SyncConflicts): void {
    if (typeof window === "undefined") return

    try {
      if (conflicts.goals.length === 0 && conflicts.habits.length === 0) {
        window.localStorage.removeItem(PENDING_CONFLICTS_STORAGE_KEY)
      } else {
        window.localStorage.setItem(
          PENDING_CONFLICTS_STORAGE_KEY,
          JSON.stringify(conflicts)
        )
      }
    } catch (error) {
      console.error("[SyncStorage] Failed to save pending conflicts:", error)
    }
  }
}
