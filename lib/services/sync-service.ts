/**
 * Sync Service - сервис для синхронизации данных с бекендом
 * 
 * ПРОСТАЯ НАДЕЖНАЯ АРХИТЕКТУРА:
 * 1. Все изменения → сразу в localStorage (offline-first)
 * 2. Full sync при КАЖДОМ открытии WebApp (покрывает все несинхронизированные изменения)
 * 3. Immediate sync для critical events (close day, reschedule goal, delete habit)
 * 4. Асинхронная работа - не блокирует UI, показывает toast только при ошибках
 */

import type { Goal, Habit, DayCompletion } from "@/lib/types"
import { toast } from "sonner"

// Типы для синхронизации
export type SyncData = {
  goals: Goal[]
  habits: Habit[]
  habitCompletions: DayCompletion[]
  dayStates: Record<string, { date: string; isEndDay: boolean }>
  pendingReviewDates: string[]
}

export type SyncRequest = {
  userId: string
  lastSyncTimestamp: number
  data: SyncData
}

export type SyncResponse = {
  success: boolean
  conflicts: Array<{ type: string; message: string }>
  newSyncTimestamp: number
}

/**
 * Сервис синхронизации
 */
class SyncService {
  private isSyncing = false
  private lastSyncTimestamp = 0

  /**
   * Основной метод синхронизации
   * Отправляет ВСЕ данные на сервер
   * 
   * Вызывается:
   * - При открытии WebApp (всегда)
   * - После critical events (close day, reschedule goal, delete habit)
   * 
   * Работает асинхронно, не блокирует UI
   * Показывает toast только при ошибках
   */
  async sync(): Promise<void> {
    // Если уже синхронизируемся - пропускаем
    if (this.isSyncing) {
      console.log("[SyncService] Sync already in progress, skipping")
      return
    }

    this.isSyncing = true
    console.log("[SyncService] Starting full sync...")

    try {
      const data = this.collectAllData()
      const userId = this.getUserId()

      const request: SyncRequest = {
        userId,
        lastSyncTimestamp: this.lastSyncTimestamp,
        data,
      }

      // ЗАГЛУШКА: В реальном приложении это будет fetch к backend
      const response = await this.mockBackendSync(request)

      if (response.success) {
        this.lastSyncTimestamp = response.newSyncTimestamp
        console.log("[SyncService] Sync completed successfully", {
          timestamp: response.newSyncTimestamp,
          conflicts: response.conflicts.length,
        })

        if (response.conflicts.length > 0) {
          console.warn("[SyncService] Conflicts detected:", response.conflicts)
          // При конфликтах можно показать toast, но не критично
        }
      } else {
        console.error("[SyncService] Sync failed")
        this.showErrorToast("Ошибка синхронизации")
      }
    } catch (error) {
      console.error("[SyncService] Sync error:", error)
      this.showErrorToast("Ошибка синхронизации")
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Показать toast с ошибкой
   */
  private showErrorToast(title: string): void {
    // Проверяем что находимся в браузере
    if (typeof window === "undefined") return

    toast.error(title, {
      duration: 4000,
    })
  }

  /**
   * Получить userId из Telegram WebApp
   */
  private getUserId(): string {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      return String(window.Telegram.WebApp.initDataUnsafe.user.id)
    }
    // Fallback для разработки
    return "dev-user-id"
  }

  /**
   * Собрать все данные из stores
   */
  private collectAllData(): SyncData {
    if (typeof window === "undefined") {
      return {
        goals: [],
        habits: [],
        habitCompletions: [],
        dayStates: {},
        pendingReviewDates: [],
      }
    }

    // Получаем данные из localStorage напрямую
    const goalsData = localStorage.getItem("goals-storage")
    const habitsData = localStorage.getItem("habits-storage")
    const dayStateData = localStorage.getItem("day-state-storage")

    const goals = goalsData ? JSON.parse(goalsData).state?.goals || [] : []
    const habitsState = habitsData ? JSON.parse(habitsData).state : null
    const dayState = dayStateData ? JSON.parse(dayStateData).state : null

    return {
      goals,
      habits: habitsState?.goals || [],
      habitCompletions: habitsState?.dayCompletions || [],
      dayStates: dayState?.dayStates || {},
      pendingReviewDates: dayState?.pendingReviewDates || [],
    }
  }

  /**
   * ЗАГЛУШКА: Имитация backend sync
   * 
   * В реальном приложении заменить на:
   * 
   * const response = await fetch('/api/sync', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify(request)
   * })
   * return response.json()
   */
  private async mockBackendSync(request: SyncRequest): Promise<SyncResponse> {
    // Имитация сетевой задержки
    await new Promise((resolve) => setTimeout(resolve, 300))

    console.log("[MockBackend] Received sync request:", {
      userId: request.userId,
      goalsCount: request.data.goals.length,
      habitsCount: request.data.habits.length,
      dayStatesCount: Object.keys(request.data.dayStates).length,
      pendingReviews: request.data.pendingReviewDates.length,
    })

    // Имитация обработки на backend
    // Backend бы здесь:
    // 1. Сохранил данные в БД
    // 2. Обновил метаданные для notifications:
    //    - last_sync_timestamp
    //    - last_day_ended_date
    //    - pending_review_dates
    //    - current_streak
    //    - total_goals_count
    //    - total_habits_count
    // 3. Проверил конфликты (если есть)
    // 4. Вернул новый timestamp

    // ⚠️ ДЛЯ ТЕСТИРОВАНИЯ TOAST: раскомментируй один из вариантов ниже
    
    // Вариант 1: Имитация ошибки сервера
    return {
      success: false,
      conflicts: [],
      newSyncTimestamp: Date.now(),
    }
    
    // Вариант 2: Имитация network error
    // throw new Error("Нет соединения с сервером")
    
    // Вариант 3: Имитация timeout
    // throw new Error("Превышено время ожидания ответа")

    // // Нормальная работа (успех)
    // return {
    //   success: true,
    //   conflicts: [],
    //   newSyncTimestamp: Date.now(),
    // }
  }

  /**
   * Проверка статуса синхронизации
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSyncDate: this.lastSyncTimestamp
        ? new Date(this.lastSyncTimestamp).toLocaleString()
        : "Never",
    }
  }
}

// Экспорт singleton
export const syncService = new SyncService()

/**
 * Глобальный тип для Telegram WebApp
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id: number
            first_name?: string
            last_name?: string
            username?: string
          }
        }
        ready: () => void
        expand: () => void
        disableVerticalSwipes?: () => void
      }
    }
  }
}

