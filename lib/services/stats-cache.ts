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
 * Day stats data (full information)
 * Now cached - fetched via /stats/range endpoint
 */
export type DayStatsData = {
  date: string  // "2025-01-15"
  dayStatus: "good" | "average" | "poor" | "bad"
  baselineLoadImpact: 0 | 1 | 2 | 3 | 4
  distractions: "no" | "little" | "sometimes" | "often" | "constantly"
  dayReflection: string
  completedGoals: Array<{
    id: string
    title: string
    label: string
    isAdditionalAdded?: boolean
  }>
  incompleteReasons: Array<{
    goalId: string
    goalTitle: string
    label?: string
    reason: string
    customReason?: string
    action: string
    percentReady: number
    note?: string
  }>
}

// Backward compatibility alias
export type DayDetailData = DayStatsData

export type StatsCache = {
  data: DayStatsData[]  // Array of days with full information
  cachedAt: number
  startDate: string  // Range start date for cache validation
  endDate: string    // Range end date for cache validation
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
export function setStatsCache(data: DayStatsData[], startDate: string, endDate: string): void {
  if (typeof window === 'undefined') return

  const cache: StatsCache = {
    data,
    cachedAt: Date.now(),
    startDate,
    endDate,
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('[StatsCache] Failed to save cache:', error)
  }
}

/**
 * Get day data from cache by date
 */
export function getDayFromCache(date: string): DayStatsData | null {
  const cache = getStatsCache()
  if (!cache) return null

  return cache.data.find(day => day.date === date) || null
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
 * Remove specific day from cache
 */
export function removeDayFromCache(date: string): void {
  if (typeof window === 'undefined') return

  const cache = getStatsCache()
  if (!cache) return

  const filteredData = cache.data.filter(day => day.date !== date)
  
  // If no days left, clear entire cache
  if (filteredData.length === 0) {
    clearStatsCache()
    return
  }

  // Update cache with filtered data
  setStatsCache(filteredData, cache.startDate, cache.endDate)
  console.log(`[StatsCache] Day ${date} removed from cache`)
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
