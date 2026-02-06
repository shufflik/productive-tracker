"use client"

/**
 * Stats Cache Manager
 *
 * Manages client-side caching for statistics data
 * - TTL: 30 minutes
 * - Multi-month storage: each month cached independently
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

export type MonthCacheEntry = {
  data: DayStatsData[]
  cachedAt: number
  startDate: string
  endDate: string
}

// Keep for isCacheValid compatibility
export type StatsCache = MonthCacheEntry

type MultiStatsCache = {
  months: Record<string, MonthCacheEntry>
}

const CACHE_KEY = 'stats-cache'
const TTL = 30 * 60 * 1000  // 30 minutes in milliseconds

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7) // "2025-01"
}

/**
 * Get full multi-month cache from localStorage
 */
function getFullCache(): MultiStatsCache | null {
  if (typeof window === 'undefined') return null

  const cached = localStorage.getItem(CACHE_KEY)
  if (!cached) return null

  try {
    const parsed = JSON.parse(cached)

    // Migration: old single-month format → multi-month
    if (parsed.data && Array.isArray(parsed.data)) {
      const monthKey = parsed.startDate?.substring(0, 7)
      if (monthKey) {
        const migrated: MultiStatsCache = {
          months: {
            [monthKey]: {
              data: parsed.data,
              cachedAt: parsed.cachedAt,
              startDate: parsed.startDate,
              endDate: parsed.endDate,
            }
          }
        }
        setFullCache(migrated)
        return migrated
      }
      return null
    }

    return parsed
  } catch (error) {
    console.error('[StatsCache] Failed to parse cache:', error)
    return null
  }
}

/**
 * Save full multi-month cache to localStorage
 */
function setFullCache(cache: MultiStatsCache): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('[StatsCache] Failed to save cache:', error)
  }
}

/**
 * Get cached stats for a specific month range
 */
export function getMonthCache(startDate: string, endDate: string): MonthCacheEntry | null {
  const full = getFullCache()
  if (!full) return null

  const monthKey = getMonthKey(startDate)
  return full.months[monthKey] || null
}

/**
 * Save stats to cache (merges with existing months)
 */
export function setStatsCache(data: DayStatsData[], startDate: string, endDate: string): void {
  const full = getFullCache() || { months: {} }
  const monthKey = getMonthKey(startDate)

  full.months[monthKey] = {
    data,
    cachedAt: Date.now(),
    startDate,
    endDate,
  }

  setFullCache(full)
}

/**
 * Get day data from cache by date
 */
export function getDayFromCache(date: string): DayStatsData | null {
  const full = getFullCache()
  if (!full) return null

  const monthKey = getMonthKey(date)
  const entry = full.months[monthKey]
  if (!entry) return null

  return entry.data.find(day => day.date === date) || null
}

/**
 * Clear entire stats cache (all months)
 */
export function clearStatsCache(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(CACHE_KEY)
  console.log('[StatsCache] Cache cleared')
}

/**
 * Remove specific day from cache (only affects its month)
 */
export function removeDayFromCache(date: string): void {
  if (typeof window === 'undefined') return

  const full = getFullCache()
  if (!full) return

  const monthKey = getMonthKey(date)
  const entry = full.months[monthKey]
  if (!entry) return

  const filteredData = entry.data.filter(day => day.date !== date)

  if (filteredData.length === 0) {
    delete full.months[monthKey]
  } else {
    full.months[monthKey] = { ...entry, data: filteredData }
  }

  if (Object.keys(full.months).length === 0) {
    clearStatsCache()
  } else {
    setFullCache(full)
  }

  console.log(`[StatsCache] Day ${date} removed from month ${monthKey}`)
}

/**
 * Check if cache entry is still valid (within TTL)
 */
export function isCacheValid(cache: MonthCacheEntry | null): boolean {
  if (!cache) return false

  const age = Date.now() - cache.cachedAt
  return age < TTL
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(cache: MonthCacheEntry | null): number | null {
  if (!cache) return null

  return Date.now() - cache.cachedAt
}

/**
 * Format cache age for display
 */
export function formatCacheAge(cache: MonthCacheEntry | null): string {
  const age = getCacheAge(cache)
  if (age === null) return 'No cache'

  const minutes = Math.floor(age / 60000)
  const seconds = Math.floor((age % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s ago`
  }
  return `${seconds}s ago`
}
