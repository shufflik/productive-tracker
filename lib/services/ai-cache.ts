"use client"

/**
 * AI Statistics Cache Manager
 *
 * Caches AI analysis data (weekly and monthly) with 1-day TTL
 * Keys:
 * - Weekly (array per month): "ai-weekly-{year}-{month}" (e.g., "ai-weekly-2025-12")
 * - Monthly: "ai-monthly-{year}-{month}" (e.g., "ai-monthly-2025-12")
 */

// ============ Weekly Analysis Types ============

export type GlobalGoalAnalysis = {
  id: string
  title: string
  classification: "on_track" | "at_risk" | "unlikely" | "missed"
  blocking_factors: string[]
}

export type FocusAnalysis = {
  shift_detected: boolean
  cause: "overload" | "fatigue" | "intentional" | "unclear" | null
}

export type LoadAnalysis = {
  level: "sustainable" | "elevated" | "critical"
  signals: string[]
  action: string | null
}

export type WeeklyAnalysisContent = {
  analysis: {
    global_goals: GlobalGoalAnalysis[]
    focus: FocusAnalysis
    load: LoadAnalysis
  }
  message: {
    review: string
    assessment: string
    recommendation: string
  }
}

// ============ Monthly Analysis Types ============

export type MonthlyGoalProgress = {
  id: string
  title: string
  progress: "advancing" | "stalled" | "regressing"
  momentum: string
  strategic_risk: string | null
}

export type MonthlyAnalysisContent = {
  analysis: {
    goals_progress: MonthlyGoalProgress[]
    overall_direction: "on_course" | "drifting" | "off_course"
    key_insight: string
  }
  message: {
    summary: string
    strategic_assessment: string
    next_month_focus: string
  }
}

// ============ Union Types ============

export type WeeklyAnalysisData = {
  id: string
  type: "weekly"
  periodStart: string
  periodEnd: string
  content: WeeklyAnalysisContent
  isUseful: boolean | null
  createdAt: string
}

export type MonthlyAnalysisData = {
  id: string
  type: "monthly"
  periodStart: string
  periodEnd: string
  content: MonthlyAnalysisContent
  isUseful: boolean | null
  createdAt: string
}

export type AIAnalysisData = WeeklyAnalysisData | MonthlyAnalysisData

type AICacheEntry = {
  data: AIAnalysisData
  cachedAt: number
}

type AIWeeklyCacheEntry = {
  data: AIAnalysisData[]
  cachedAt: number
}

type AI404CacheEntry = {
  cachedAt: number
}

const CACHE_PREFIX_WEEKLY = 'ai-weekly-'
const CACHE_PREFIX_MONTHLY = 'ai-monthly-'
const CACHE_PREFIX_404_MONTHLY = 'ai-404-monthly-'
const TTL = 24 * 60 * 60 * 1000 // 1 day in milliseconds

// ============ Date Utilities ============

/**
 * Get the previous month
 */
export function getPreviousMonth(): { year: number; month: number } {
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { year: prevMonth.getFullYear(), month: prevMonth.getMonth() + 1 }
}

// ============ Cache Key Utilities ============

function getWeeklyKey(year: number, month: number): string {
  return `${CACHE_PREFIX_WEEKLY}${year}-${String(month).padStart(2, '0')}`
}

function getMonthlyKey(year: number, month: number): string {
  return `${CACHE_PREFIX_MONTHLY}${year}-${String(month).padStart(2, '0')}`
}

// ============ Generic Cache Operations ============

function getCache(key: string): AICacheEntry | null {
  if (typeof window === 'undefined') return null

  const cached = localStorage.getItem(key)
  if (!cached) return null

  try {
    return JSON.parse(cached)
  } catch (error) {
    console.error('[AICache] Failed to parse cache:', error)
    return null
  }
}

function setCache(key: string, data: AIAnalysisData): void {
  if (typeof window === 'undefined') return

  const entry: AICacheEntry = {
    data,
    cachedAt: Date.now(),
  }

  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (error) {
    console.error('[AICache] Failed to save cache:', error)
  }
}

function isCacheEntryValid(entry: { cachedAt: number } | null): boolean {
  if (!entry) return false
  const age = Date.now() - entry.cachedAt
  return age < TTL
}

// ============ Weekly Analysis Accessors (array per month) ============

function getWeeklyCache(key: string): AIWeeklyCacheEntry | null {
  if (typeof window === 'undefined') return null

  const cached = localStorage.getItem(key)
  if (!cached) return null

  try {
    return JSON.parse(cached)
  } catch (error) {
    console.error('[AICache] Failed to parse weekly cache:', error)
    return null
  }
}

function setWeeklyCache(key: string, data: AIAnalysisData[]): void {
  if (typeof window === 'undefined') return

  const entry: AIWeeklyCacheEntry = {
    data,
    cachedAt: Date.now(),
  }

  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (error) {
    console.error('[AICache] Failed to save weekly cache:', error)
  }
}

/**
 * Get weekly analyses for a month (array)
 */
export function getWeeklyAnalyses(year: number, month: number): AIAnalysisData[] {
  const key = getWeeklyKey(year, month)
  const entry = getWeeklyCache(key)
  if (!entry) return []
  return entry.data
}

/**
 * Set weekly analyses for a month (array)
 */
export function setWeeklyAnalyses(year: number, month: number, data: AIAnalysisData[]): void {
  const key = getWeeklyKey(year, month)
  setWeeklyCache(key, data)
  console.log(`[AICache] Weekly analyses cached for ${year}-${month} (${data.length} items)`)

  // Handle cross-month weeks: save to adjacent month cache if week spans two months
  data.forEach(analysis => {
    if (!analysis.periodStart || !analysis.periodEnd) return

    const startDate = new Date(analysis.periodStart)
    const endDate = new Date(analysis.periodEnd)
    const startMonth = startDate.getMonth() + 1
    const startYear = startDate.getFullYear()
    const endMonth = endDate.getMonth() + 1
    const endYear = endDate.getFullYear()

    // If week spans two months, also save to the other month's cache
    if (startYear !== endYear || startMonth !== endMonth) {
      // Determine the adjacent month
      const adjacentYear = (startYear === year && startMonth === month) ? endYear : startYear
      const adjacentMonth = (startYear === year && startMonth === month) ? endMonth : startMonth

      // Get existing cache for adjacent month and add this week if not already present
      const adjacentKey = getWeeklyKey(adjacentYear, adjacentMonth)
      const existingCache = getWeeklyCache(adjacentKey)
      const existingData = existingCache?.data || []

      // Check if this analysis is already in adjacent cache
      const alreadyExists = existingData.some(item => item.id === analysis.id)
      if (!alreadyExists) {
        const updatedData = [...existingData, analysis]
        setWeeklyCache(adjacentKey, updatedData)
        console.log(`[AICache] Cross-month week also cached for ${adjacentYear}-${adjacentMonth}`)
      }
    }
  })
}

/**
 * Check if weekly cache is valid for a month
 */
export function hasValidWeeklyCache(year: number, month: number): boolean {
  const key = getWeeklyKey(year, month)
  const entry = getWeeklyCache(key)
  return isCacheEntryValid(entry)
}

/**
 * Get all weekly analyses that include days from a given month
 * Checks current month cache plus adjacent months for cross-month weeks
 */
export function getWeeklyAnalysesForMonth(year: number, month: number): AIAnalysisData[] {
  const result: AIAnalysisData[] = []
  const seenIds = new Set<string>()

  const addAnalysis = (analysis: AIAnalysisData) => {
    if (!seenIds.has(analysis.id) && weekIncludesMonth(analysis, year, month)) {
      seenIds.add(analysis.id)
      result.push(analysis)
    }
  }

  // Check current month
  const currentData = getWeeklyAnalyses(year, month)
  currentData.forEach(addAnalysis)

  // Check previous month for cross-month weeks
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevData = getWeeklyAnalyses(prevYear, prevMonth)
  prevData.forEach(addAnalysis)

  // Check next month for cross-month weeks
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextData = getWeeklyAnalyses(nextYear, nextMonth)
  nextData.forEach(addAnalysis)

  // Sort by periodStart
  result.sort((a, b) => {
    if (!a.periodStart || !b.periodStart) return 0
    return new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
  })

  return result
}

/**
 * Check if a weekly analysis period includes a given month
 */
function weekIncludesMonth(analysis: AIAnalysisData, year: number, month: number): boolean {
  if (!analysis.periodStart || !analysis.periodEnd) return false

  const startDate = new Date(analysis.periodStart)
  const endDate = new Date(analysis.periodEnd)

  // Check if any part of the week falls within the given month
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59)

  return startDate <= monthEnd && endDate >= monthStart
}

/**
 * Check if any weekly analyses exist for a month
 */
export function hasWeeklyAnalyses(year: number, month: number): boolean {
  const key = getWeeklyKey(year, month)
  const entry = getWeeklyCache(key)
  return entry !== null && entry.data.length > 0
}

// ============ Monthly Analysis Accessors ============

export function getMonthlyAnalysis(year: number, month: number): AIAnalysisData | null {
  const key = getMonthlyKey(year, month)
  const entry = getCache(key)
  if (!entry) return null
  return entry.data
}

export function setMonthlyAnalysis(year: number, month: number, data: AIAnalysisData): void {
  const key = getMonthlyKey(year, month)
  setCache(key, data)
  console.log(`[AICache] Monthly analysis cached for ${year}-${month}`)
}

export function hasValidMonthlyCache(year: number, month: number): boolean {
  const key = getMonthlyKey(year, month)
  const entry = getCache(key)
  return isCacheEntryValid(entry)
}

export function hasMonthlyAnalysis(year: number, month: number): boolean {
  const key = getMonthlyKey(year, month)
  const entry = getCache(key)
  return entry !== null
}

// ============ 404 Cache for Monthly (to avoid repeated requests) ============

function getMonthly404Key(year: number, month: number): string {
  return `${CACHE_PREFIX_404_MONTHLY}${year}-${String(month).padStart(2, '0')}`
}

function get404Cache(key: string): AI404CacheEntry | null {
  if (typeof window === 'undefined') return null

  const cached = localStorage.getItem(key)
  if (!cached) return null

  try {
    return JSON.parse(cached)
  } catch (error) {
    return null
  }
}

function set404Cache(key: string): void {
  if (typeof window === 'undefined') return

  const entry: AI404CacheEntry = {
    cachedAt: Date.now(),
  }

  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (error) {
    console.error('[AICache] Failed to save 404 cache:', error)
  }
}

function is404CacheValid(key: string): boolean {
  const entry = get404Cache(key)
  if (!entry) return false
  const age = Date.now() - entry.cachedAt
  return age < TTL
}

/**
 * Mark that monthly API returned 404 (cache for 1 day)
 */
export function setMonthly404(year: number, month: number): void {
  const key = getMonthly404Key(year, month)
  set404Cache(key)
  console.log(`[AICache] Monthly 404 cached for ${year}-${month}`)
}

/**
 * Check if we should skip monthly request (has valid 404 cache)
 */
export function shouldSkipMonthlyRequest(year: number, month: number): boolean {
  if (hasValidMonthlyCache(year, month)) {
    return false
  }
  const key = getMonthly404Key(year, month)
  return is404CacheValid(key)
}

// ============ Utility Functions ============

/**
 * Check if any AI data exists for a given month
 * Used to determine if AI block should be shown
 * Uses getWeeklyAnalysesForMonth which checks adjacent months for cross-month weeks
 */
export function hasAnyAIDataForMonth(year: number, month: number): boolean {
  if (hasMonthlyAnalysis(year, month)) {
    return true
  }
  // getWeeklyAnalysesForMonth handles cross-month weeks automatically
  if (getWeeklyAnalysesForMonth(year, month).length > 0) {
    return true
  }
  return false
}
