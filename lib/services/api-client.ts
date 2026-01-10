"use client"

/**
 * Unified API client for all backend requests
 * Handles Telegram WebApp authentication (initData) in PROD mode
 * Skips initData in DEV mode for local development
 */

import type { SyncRequest, SyncResponse } from "./sync/types"
import type { Goal } from "@/lib/types"
import type { AIAnalysisData } from "./ai-cache"

export type LinkedGoalsResponse = {
  items: Goal[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL


/**
 * Check if we're in production mode
 * In production, we should send initData for Telegram auth
 * In development, we skip it for easier local debugging
 */
function isProductionMode(): boolean {
  // Check NODE_ENV first
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return true
  }

  // Also check if we're actually running in Telegram WebApp
  // If we're in Telegram, we're in production mode
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp
    const isRealTelegram = tg.initDataUnsafe !== undefined && Object.keys(tg.initDataUnsafe).length > 0
    if (isRealTelegram) {
      return true
    }
  }

  return false
}

/**
 * Get initData from Telegram WebApp
 * Returns null if not available or in DEV mode
 */
function getInitData(): string | null {
  // In DEV mode, skip initData
  if (!isProductionMode()) {
    return null
  }

  // Get initData from Telegram WebApp
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData
  }

  return null
}

/**
 * Get headers for backend requests
 * Includes initData in PROD mode, Content-Type always
 */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const initData = getInitData()
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData
  }

  return headers
}

/**
 * Make a request to backend
 */
async function fetchBackend(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
): Promise<Response> {
  if (!BACKEND_URL) {
    throw new Error('BACKEND_URL is not configured')
  }

  const url = `${BACKEND_URL}${endpoint}`
  const headers = {
    ...getHeaders(),
    ...options.headers,
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
  }

  if (options.body) {
    fetchOptions.body = typeof options.body === 'string'
      ? options.body
      : JSON.stringify(options.body)
  }

  return fetch(url, fetchOptions)
}

/**
 * Sync API
 */
export async function syncApi(request: SyncRequest): Promise<SyncResponse> {
  const response = await fetchBackend('/api/sync', {
    method: 'POST',
    body: request,
  })

  if (!response.ok) {
    const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`)
    error.status = response.status
    error.response = response

    try {
      error.data = await response.json()
    } catch (e) {
      // Ignore JSON parse errors
    }

    throw error
  }

  return response.json()
}

/**
 * End day API (POST)
 */
export async function endDayApi(request: any): Promise<any> {
  const response = await fetchBackend('/api/end-day', {
    method: 'POST',
    body: request,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Cancel end day API (DELETE)
 */
export async function cancelEndDayApi(request: { date: string; deviceId: string }): Promise<any> {
  const response = await fetchBackend('/api/end-day', {
    method: 'DELETE',
    body: request,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get stats range API (GET /stats/range)
 * Returns array of days with full information
 */
export async function getStatsRangeApi(params: {
  start_date: string  // "2025-01-01"
  end_date: string     // "2025-01-31"
}): Promise<any> {
  const queryParams = new URLSearchParams({
    start_date: params.start_date,
    end_date: params.end_date,
  })

  const response = await fetchBackend(`/api/stats/range?${queryParams.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 404) {
      return []
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get linked goals API (GET /api/goals)
 * Returns paginated list of goals filtered by globalGoalId and optionally milestoneId
 */
export async function getLinkedGoalsApi(params: {
  globalGoalId: string
  milestoneId?: string
  page?: number
  limit?: number
}): Promise<LinkedGoalsResponse> {
  const queryParams = new URLSearchParams({
    globalGoalId: params.globalGoalId,
    page: String(params.page ?? 0),
    limit: String(params.limit ?? 20),
    includeDeleted: 'true',
  })

  if (params.milestoneId) {
    queryParams.set('milestoneId', params.milestoneId)
  }

  const response = await fetchBackend(`/api/goals?${queryParams.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

// ============ AI Analysis API ============

/**
 * Get AI weekly analyses for a month
 * Returns array of weekly analyses (empty array if none)
 */
export async function getAIWeeklyApi(params: {
  year: number
  month: number
}): Promise<AIAnalysisData[]> {
  const queryParams = new URLSearchParams({
    year: String(params.year),
    month: String(params.month),
  })

  const response = await fetchBackend(`/api/ai/weekly?${queryParams.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get AI monthly analysis
 * Returns null for 404 (silently ignored per requirements)
 */
export async function getAIMonthlyApi(params: {
  year: number
  month: number
}): Promise<AIAnalysisData | null> {
  const queryParams = new URLSearchParams({
    year: String(params.year),
    month: String(params.month),
  })

  const response = await fetchBackend(`/api/ai/monthly?${queryParams.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null // Silently ignore 404
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Submit feedback for AI analysis
 */
export async function submitAIFeedbackApi(params: {
  analysisId: string
  isUseful: boolean
}): Promise<{ success: boolean; message: string }> {
  const response = await fetchBackend(`/api/ai/${params.analysisId}/feedback`, {
    method: 'POST',
    body: { isUseful: params.isUseful },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}
