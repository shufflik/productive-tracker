"use client"

/**
 * Stats Cache Manager
 *
 * Manages client-side caching for statistics data
 * - TTL: 30 minutes
 * - Invalidation: manual via clearStatsCache() on end-day operations
 * - Offline support: shows stale data if available
 */

/**
 * Month overview data (lightweight)
 * Used for calendar coloring
 */
export type MonthStatsData = {
  days: Array<{
    date: string  // "2025-01-15"
    dayStatus: "good" | "average" | "poor" | "bad"
  }>
}

/**
 * Day detail data (full information)
 * NOT cached - fetched on demand
 */
export type DayDetailData = {
  date: string
  dayStatus: "good" | "average" | "poor" | "bad"
  distractions: "no" | "little" | "sometimes" | "often" | "constantly"
  completedGoals: Array<{
    id: string
    title: string
    label: string
  }>
  incompleteReasons: Array<{
    goalId: string
    goalTitle: string
    reason: string
    customReason?: string
    action: string
    percentReady: number
    note?: string
  }>
}

// Backward compatibility alias
export type StatsData = MonthStatsData

export type StatsCache = {
  data: StatsData
  cachedAt: number
}

const CACHE_KEY = 'stats-cache'
const TTL = 30 * 60 * 1000  // 30 minutes in milliseconds

/**
 * Get cached stats data
 */
export function getStatsCache(): StatsCache | null {
  if (typeof window === 'undefined') return null

  const cached = localStorage.getItem(CACHE_KEY)
  if (!cached) return null

  try {
    return JSON.parse(cached)
  } catch (error) {
    console.error('[StatsCache] Failed to parse cache:', error)
    return null
  }
}

/**
 * Save stats to cache
 */
export function setStatsCache(data: StatsData): void {
  if (typeof window === 'undefined') return

  const cache: StatsCache = {
    data,
    cachedAt: Date.now(),
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('[StatsCache] Failed to save cache:', error)
  }
}

/**
 * Clear stats cache
 */
export function clearStatsCache(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(CACHE_KEY)
  console.log('[StatsCache] Cache cleared')
}

/**
 * Check if cache is still valid (within TTL)
 */
export function isCacheValid(cache: StatsCache | null): boolean {
  if (!cache) return false

  const age = Date.now() - cache.cachedAt
  return age < TTL
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(cache: StatsCache | null): number | null {
  if (!cache) return null

  return Date.now() - cache.cachedAt
}

/**
 * Format cache age for display
 */
export function formatCacheAge(cache: StatsCache | null): string {
  const age = getCacheAge(cache)
  if (age === null) return 'No cache'

  const minutes = Math.floor(age / 60000)
  const seconds = Math.floor((age % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s ago`
  }
  return `${seconds}s ago`
}
