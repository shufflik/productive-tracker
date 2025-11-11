/**
 * Sync Service - сервис для синхронизации данных с бекендом
 * 
 * Текущая реализация - заглушка для будущей интеграции с бекендом
 * В будущем здесь будет полная логика синхронизации
 */

import type { TaskItem } from "@/lib/types"
import type { DayCompletion } from "@/lib/types"

// Метаданные синхронизации
export type SyncMetadata = {
  lastSyncTimestamp: number | null
  isSyncing: boolean
  pendingChanges: Change[]
}

// Типы изменений для офлайн-режима
export type Change = {
  id: string
  timestamp: number
  type: "goals" | "habits" | "day-reviews" | "day-states"
  action: "create" | "update" | "delete"
  data: any
}

// Конфликты при синхронизации
export type Conflict = {
  id: string
  localData: any
  serverData: any
  timestamp: number
}

// Запрос синхронизации
export type SyncRequest = {
  lastSyncTimestamp: number | null
  pendingChanges: Change[]
}

// Ответ от сервера
export type SyncResponse = {
  serverData: any
  conflicts: Conflict[]
  newSyncTimestamp: number
}

/**
 * Сервис синхронизации данных
 * 
 * АРХИТЕКТУРА:
 * 1. Offline-first подход - все изменения сначала в локальный store
 * 2. Периодическая синхронизация с бекендом
 * 3. Conflict resolution через timestamp (last-write-wins)
 * 4. Очередь pendingChanges для офлайн изменений
 */
class SyncService {
  private syncMetadata: SyncMetadata = {
    lastSyncTimestamp: null,
    isSyncing: false,
    pendingChanges: [],
  }

  /**
   * Синхронизация при старте приложения
   * Вызывается один раз при загрузке приложения
   */
  async syncOnAppStart(): Promise<void> {
    console.log("[SyncService] syncOnAppStart called")
    
    // TODO: Реализация при подключении бекенда
    // 1. Проверить наличие интернета
    // 2. Загрузить данные с сервера
    // 3. Мерджить с локальными данными
    // 4. Отправить pendingChanges на сервер
    // 5. Обновить lastSyncTimestamp
    
    // Заглушка - ничего не делаем
    return Promise.resolve()
  }

  /**
   * Мердж локальных и серверных данных
   * Стратегия: last-write-wins (по timestamp)
   */
  mergeData<T extends { id: string }>(
    local: T[],
    remote: T[],
    getTimestamp: (item: T) => number
  ): T[] {
    const merged = new Map<string, T>()

    // Добавляем все локальные данные
    local.forEach((item) => merged.set(item.id, item))

    // Мерджим с серверными данными
    remote.forEach((remoteItem) => {
      const localItem = merged.get(remoteItem.id)
      
      if (!localItem) {
        // Нет локально - берем серверную версию
        merged.set(remoteItem.id, remoteItem)
      } else {
        // Есть и локально и на сервере - сравниваем timestamp
        const localTimestamp = getTimestamp(localItem)
        const remoteTimestamp = getTimestamp(remoteItem)
        
        if (remoteTimestamp > localTimestamp) {
          // Серверная версия новее
          merged.set(remoteItem.id, remoteItem)
        }
        // Иначе оставляем локальную версию
      }
    })

    return Array.from(merged.values())
  }

  /**
   * Отправка изменений на сервер
   */
  async pushChanges(): Promise<void> {
    console.log("[SyncService] pushChanges called")
    
    if (this.syncMetadata.isSyncing) {
      console.log("[SyncService] Sync already in progress")
      return
    }

    if (this.syncMetadata.pendingChanges.length === 0) {
      console.log("[SyncService] No pending changes")
      return
    }

    // TODO: Реализация при подключении бекенда
    // 1. Установить isSyncing = true
    // 2. Отправить POST /api/sync с pendingChanges
    // 3. Обработать conflicts если есть
    // 4. Очистить pendingChanges
    // 5. Обновить lastSyncTimestamp
    // 6. Установить isSyncing = false
    
    // Заглушка - ничего не делаем
    return Promise.resolve()
  }

  /**
   * Добавление изменения в очередь
   */
  addPendingChange(change: Change): void {
    this.syncMetadata.pendingChanges.push(change)
    console.log(`[SyncService] Added pending change: ${change.type} ${change.action}`, change)
    
    // TODO: При подключении бекенда - попытаться синхронизировать
    // if (navigator.onLine) {
    //   this.pushChanges()
    // }
  }

  /**
   * Получение метаданных синхронизации
   */
  getSyncMetadata(): SyncMetadata {
    return { ...this.syncMetadata }
  }

  /**
   * Проверка наличия несинхронизированных изменений
   */
  hasPendingChanges(): boolean {
    return this.syncMetadata.pendingChanges.length > 0
  }

  /**
   * API endpoints для будущей интеграции
   */
  private readonly API_ENDPOINTS = {
    SYNC_GOALS: "/api/sync/goals",
    SYNC_HABITS: "/api/sync/habits",
    SYNC_DAY_REVIEWS: "/api/sync/day-reviews",
    SYNC_DAY_STATES: "/api/sync/day-states",
  }
}

// Экспорт singleton instance
export const syncService = new SyncService()

/**
 * ИНСТРУКЦИЯ ПО ИНТЕГРАЦИИ С БЕКЕНДОМ:
 * 
 * 1. Создать API endpoints:
 *    - POST /api/sync/goals
 *    - POST /api/sync/habits
 *    - POST /api/sync/day-reviews
 *    - POST /api/sync/day-states
 * 
 * 2. Формат запроса:
 *    {
 *      lastSyncTimestamp: number | null,
 *      pendingChanges: Change[]
 *    }
 * 
 * 3. Формат ответа:
 *    {
 *      serverData: any[],
 *      conflicts: Conflict[],
 *      newSyncTimestamp: number
 *    }
 * 
 * 4. Интегрировать вызовы sync в stores:
 *    - После каждого изменения: syncService.addPendingChange(...)
 *    - При старте приложения: syncService.syncOnAppStart()
 * 
 * 5. Добавить UI для индикации синхронизации и конфликтов
 */

