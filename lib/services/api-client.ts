"use client"

/**
 * Unified API client for all backend requests
 * Handles Telegram WebApp authentication (initData) in PROD mode
 * Skips initData in DEV mode for local development
 */

import type { SyncRequest, SyncResponse } from "./sync/types"
import type { 
  GlobalGoal, 
  GlobalGoalType, 
  GlobalGoalStatus, 
  Milestone 
} from "@/lib/types"

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

// ============================================
// Global Goals API
// ============================================

export type CreateGlobalGoalRequest = {
  type: GlobalGoalType
  title: string
  description?: string
  icon?: string
  periodStart: string
  periodEnd?: string
  // Для HYBRID целей
  targetValue?: number
  unit?: string
  // Начальные milestones для OUTCOME
  milestones?: { title: string; description?: string }[]
}

export type UpdateGlobalGoalRequest = {
  title?: string
  description?: string
  icon?: string
  status?: GlobalGoalStatus
  periodEnd?: string
  // Для HYBRID
  currentValue?: number
  _version: number
}

/**
 * Get all global goals
 */
export async function getGlobalGoalsApi(params?: {
  type?: GlobalGoalType
  status?: GlobalGoalStatus
}): Promise<{ globalGoals: GlobalGoal[] }> {
  const queryParams = new URLSearchParams()
  if (params?.type) queryParams.set('type', params.type)
  if (params?.status) queryParams.set('status', params.status)
  
  const queryString = queryParams.toString()
  const url = queryString ? `/api/global-goals?${queryString}` : '/api/global-goals'
  
  const response = await fetchBackend(url, { method: 'GET' })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Get single global goal with milestones
 */
export async function getGlobalGoalApi(id: string): Promise<{ 
  globalGoal: GlobalGoal
  milestones: Milestone[]
}> {
  const response = await fetchBackend(`/api/global-goals/${id}`, { method: 'GET' })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Create new global goal
 */
export async function createGlobalGoalApi(
  data: CreateGlobalGoalRequest
): Promise<{ success: boolean; globalGoal: GlobalGoal; milestones?: Milestone[] }> {
  const response = await fetchBackend('/api/global-goals', {
    method: 'POST',
    body: data,
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Update global goal
 */
export async function updateGlobalGoalApi(
  id: string,
  data: UpdateGlobalGoalRequest
): Promise<{ success: boolean; globalGoal: GlobalGoal }> {
  const response = await fetchBackend(`/api/global-goals/${id}`, {
    method: 'PUT',
    body: data,
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Delete global goal (soft delete)
 */
export async function deleteGlobalGoalApi(id: string): Promise<{ success: boolean }> {
  const response = await fetchBackend(`/api/global-goals/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

// ============================================
// Milestones API
// ============================================

export type CreateMilestoneRequest = {
  globalGoalId: string
  title: string
  description?: string
  order?: number
}

export type UpdateMilestoneRequest = {
  title?: string
  description?: string
  order?: number
  isActive?: boolean
  isCompleted?: boolean
  _version: number
}

/**
 * Get milestones for a global goal
 */
export async function getMilestonesApi(globalGoalId: string): Promise<{ milestones: Milestone[] }> {
  const response = await fetchBackend(`/api/global-goals/${globalGoalId}/milestones`, { 
    method: 'GET' 
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Create milestone
 */
export async function createMilestoneApi(
  data: CreateMilestoneRequest
): Promise<{ success: boolean; milestone: Milestone }> {
  const response = await fetchBackend(`/api/global-goals/${data.globalGoalId}/milestones`, {
    method: 'POST',
    body: data,
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Update milestone
 */
export async function updateMilestoneApi(
  globalGoalId: string,
  milestoneId: string,
  data: UpdateMilestoneRequest
): Promise<{ success: boolean; milestone: Milestone }> {
  const response = await fetchBackend(`/api/global-goals/${globalGoalId}/milestones/${milestoneId}`, {
    method: 'PUT',
    body: data,
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Delete milestone
 */
export async function deleteMilestoneApi(
  globalGoalId: string, 
  milestoneId: string
): Promise<{ success: boolean }> {
  const response = await fetchBackend(`/api/global-goals/${globalGoalId}/milestones/${milestoneId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Activate milestone (enter this phase)
 */
export async function activateMilestoneApi(
  globalGoalId: string,
  milestoneId: string
): Promise<{ success: boolean; milestone: Milestone }> {
  const response = await fetchBackend(`/api/global-goals/${globalGoalId}/milestones/${milestoneId}/activate`, {
    method: 'POST',
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

// ============================================
// Goal Linking API
// ============================================

/**
 * Link daily goal to global goal / milestone
 */
export async function linkGoalApi(
  goalId: string,
  data: {
    globalGoalId?: string | null
    milestoneId?: string | null
  }
): Promise<{ success: boolean }> {
  const response = await fetchBackend(`/api/goals/${goalId}/link`, {
    method: 'POST',
    body: data,
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Link habit to global goal
 */
export async function linkHabitApi(
  habitId: string,
  globalGoalId: string | null
): Promise<{ success: boolean }> {
  const response = await fetchBackend(`/api/habits/${habitId}/link`, {
    method: 'POST',
    body: { globalGoalId },
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}
