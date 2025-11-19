"use client"

/**
 * Unified API client for all backend requests
 * Handles Telegram WebApp authentication (initData) in PROD mode
 * Skips initData in DEV mode for local development
 */

import type { SyncRequest, SyncResponse } from "./sync/types"

const BACKEND_URL = process.env.BACKEND_URL

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
 * Get stats API (GET)
 */
export async function getStatsApi(params: {
  year: number
  month: number
  day?: number
}): Promise<any> {
  const queryParams = new URLSearchParams({
    year: String(params.year),
    month: String(params.month),
  })
  
  if (params.day !== undefined) {
    queryParams.append('day', String(params.day))
  }
  
  const response = await fetchBackend(`/api/stats?${queryParams.toString()}`, {
    method: 'GET',
  })
  
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}