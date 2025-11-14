/**
 * Sync Service - сервис для синхронизации данных с бекендом
 * 
 * ПРОСТАЯ НАДЕЖНАЯ АРХИТЕКТУРА:
 * 1. Все изменения → сразу в localStorage (offline-first)
 * 2. Full sync при КАЖДОМ открытии WebApp (покрывает все несинхронизированные изменения)
 * 3. Immediate sync для critical events (close day, reschedule goal, delete habit)
 * 4. Асинхронная работа - не блокирует UI, показывает toast только при ошибках
 */

import type { Goal, Habit, LocalSyncOperation } from "@/lib/types"
import { toast } from "sonner"
import { generateId } from "@/lib/utils/id"

// Типы для синхронизации

// Change item that will be отправлен на backend
export type SyncChange<TPayload> = {
  id: string
  clientUpdatedAt: number
  operation: LocalSyncOperation
  payload: TPayload
}

export type SyncChanges = {
  goals: SyncChange<Omit<Goal, "_localUpdatedAt" | "_localOp">>[]
  habits: SyncChange<Omit<Habit, "_localUpdatedAt" | "_localOp">>[]
}

export type SyncReviewBlock = {
  pendingReviewDates: string[]
  /**
   * Последняя дата и время активности пользователя (ISO datetime string "2025-01-15T14:30:00.000Z")
   * Синхронизируется между устройствами для корректной обработки merge conflicts
   */
  lastActiveDate?: string | null
}

export type SyncRequest = {
  userId: string
  deviceId: string
  /**
   * Время последней успешной синхронизации на клиенте (ms since epoch)
   */
  lastSyncAt: number
  /**
   * Журнал изменений по сущностям
   */
  changes: SyncChanges
  /**
   * Отдельный блок для ревьюшных дат и lastActiveDate
   */
  review: SyncReviewBlock
}

export type Conflict = {
  type: "goal" | "habit"
  id: string
  message: string
  /**
   * Локальная версия сущности (если есть)
   */
  localVersion?: any
  /**
   * Серверная версия сущности (если есть)
   */
  serverVersion?: any
  /**
   * Локальная операция, которая вызвала конфликт
   */
  localOperation?: LocalSyncOperation
}

export type SyncResponse = {
  success: boolean
  conflicts: Conflict[]
  /**
   * Новый lastSyncAt, который клиент должен сохранить
   */
  newLastSyncAt: number
  /**
   * Итоговый список pending review dates и lastActiveDate, как их видит backend
   * (может отличаться от отправленного клиентом)
   */
  review?: SyncReviewBlock
  /**
   * Опционально backend может вернуть данные для bootstrap/обновления
   */
  data?: {
    goals?: Goal[]
    habits?: Habit[]
  }
}

type SyncMeta = {
  deviceId: string
  lastSyncAt: number
}

const SYNC_META_STORAGE_KEY = "sync-meta"
const SYNC_QUEUE_STORAGE_KEY = "sync-queue"

type GoalsApplyHandler = (goals: Goal[]) => void
type HabitsApplyHandler = (habits: Habit[]) => void
type PendingReviewsApplyHandler = (reviewBlock: SyncReviewBlock) => void
type ConflictsHandler = (conflicts: Conflict[]) => void

/**
 * Очередь изменений для синхронизации
 * Хранит только те изменения, которые ещё не были отправлены на backend
 */
type SyncQueue = {
  goals: SyncChange<Omit<Goal, "_localUpdatedAt" | "_localOp">>[]
  habits: SyncChange<Omit<Habit, "_localUpdatedAt" | "_localOp">>[]
}

/**
 * Сервис синхронизации
 */
class SyncService {
  private isSyncing = false
  private lastSyncTimestamp = 0
  private meta: SyncMeta = {
    deviceId: "dev-device-id",
    lastSyncAt: 0,
  }
  private queue: SyncQueue = {
    goals: [],
    habits: [],
  }

  // Handlers for applying server data back into stores
  private applyGoals?: GoalsApplyHandler
  private applyHabits?: HabitsApplyHandler
  private applyPendingReviews?: PendingReviewsApplyHandler
  private conflictsHandler?: ConflictsHandler
  private pendingConflicts: Conflict[] = []

  constructor() {
    this.loadMetaFromStorage()
    this.loadQueueFromStorage()
  }

  /**
   * Регистрация обработчиков применения данных от backend в zustand-сторы
   * Эти методы вызываются из сторов, чтобы избежать циклических импортов
   */
  registerGoalsApplyHandler(handler: GoalsApplyHandler) {
    this.applyGoals = handler
  }

  registerHabitsApplyHandler(handler: HabitsApplyHandler) {
    this.applyHabits = handler
  }

  registerPendingReviewsApplyHandler(handler: PendingReviewsApplyHandler) {
    this.applyPendingReviews = handler
  }

  registerConflictsHandler(handler: ConflictsHandler) {
    this.conflictsHandler = handler
  }

  onConflictsResolved() {
    // Вызывается после разрешения конфликтов пользователем
    this.pendingConflicts = []
  }

  /**
   * Получить lastSyncAt для сторов (нужно для определения новых сущностей)
   */
  getLastSyncAt() {
    return this.meta.lastSyncAt
  }

  /**
   * Загрузить метаданные синхронизации из localStorage
   */
  private loadMetaFromStorage() {
    if (typeof window === "undefined") return

    try {
      const raw = window.localStorage.getItem(SYNC_META_STORAGE_KEY)
      if (!raw) {
        // Новый девайс / первый запуск
        const deviceId = generateId()
        this.meta = { deviceId, lastSyncAt: 0 }
        window.localStorage.setItem(SYNC_META_STORAGE_KEY, JSON.stringify(this.meta))
        return
      }

      const parsed = JSON.parse(raw) as SyncMeta
      if (!parsed.deviceId) {
        parsed.deviceId = generateId()
      }
      if (typeof parsed.lastSyncAt !== "number") {
        parsed.lastSyncAt = 0
      }
      this.meta = parsed
      this.lastSyncTimestamp = parsed.lastSyncAt
    } catch (error) {
      console.error("[SyncService] Failed to load sync meta:", error)
      // Фоллбэк: создаем новый deviceId
      const deviceId = generateId()
      this.meta = { deviceId, lastSyncAt: 0 }
    }
  }

  /**
   * Сохранить метаданные синхронизации в localStorage
   */
  private saveMetaToStorage() {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(SYNC_META_STORAGE_KEY, JSON.stringify(this.meta))
    } catch (error) {
      console.error("[SyncService] Failed to save sync meta:", error)
    }
  }

  /**
   * Загрузить очередь изменений из localStorage
   */
  private loadQueueFromStorage() {
    if (typeof window === "undefined") return

    try {
      const raw = window.localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)
      if (!raw) {
        this.queue = { goals: [], habits: [] }
        return
      }

      const parsed = JSON.parse(raw) as SyncQueue
      this.queue = {
        goals: parsed.goals || [],
        habits: parsed.habits || [],
      }
    } catch (error) {
      console.error("[SyncService] Failed to load sync queue:", error)
      this.queue = { goals: [], habits: [] }
    }
  }

  /**
   * Сохранить очередь изменений в localStorage
   */
  private saveQueueToStorage() {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error("[SyncService] Failed to save sync queue:", error)
    }
  }

  /**
   * Основной метод синхронизации
   * Отправляет изменения из очереди на сервер
   * 
   * Вызывается:
   * - При открытии WebApp (если есть изменения или первый запуск)
   * - После critical events (close day, reschedule goal, delete habit)
   * 
   * Работает асинхронно, не блокирует UI
   * Показывает toast только при ошибках
   */
  async sync(): Promise<void> {
    // Если уже синхронизируемся - ждем завершения текущей синхронизации
    if (this.isSyncing) {
      console.log("[SyncService] Sync already in progress, waiting...")
      // Ждем завершения текущей синхронизации (максимум 10 секунд)
      const maxWait = 10000
      const startTime = Date.now()
      while (this.isSyncing && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (this.isSyncing) {
        console.warn("[SyncService] Sync wait timeout")
      }
      return
    }

    const hasChanges =
      this.queue.goals.length > 0 ||
      this.queue.habits.length > 0

    const isFirstSync = this.meta.lastSyncAt === 0

    // Если нет изменений и это не первый sync - пропускаем
    if (!isFirstSync && !hasChanges) {
      console.log("[SyncService] No local changes, skipping sync")
      return
    }

    this.isSyncing = true
    console.log("[SyncService] Starting sync...", {
      goals: this.queue.goals.length,
      habits: this.queue.habits.length,
      isFirstSync,
    })

    try {
      const reviewBlock = this.collectReviewBlock()
      const userId = this.getUserId()

      const request: SyncRequest = {
        userId,
        deviceId: this.meta.deviceId,
        lastSyncAt: this.meta.lastSyncAt,
        changes: this.buildChangesFromQueue(),
        review: reviewBlock,
      }

      // ЗАГЛУШКА: В реальном приложении это будет fetch к backend
      const response = await this.mockBackendSync(request)

      if (response.success) {
        this.lastSyncTimestamp = response.newLastSyncAt
        this.meta.lastSyncAt = response.newLastSyncAt

        console.log("[SyncService] Sync completed successfully", {
          timestamp: response.newLastSyncAt,
          conflicts: response.conflicts.length,
        })

        // Очищаем очередь после успешной синхронизации
        this.queue = { goals: [], habits: [] }
        this.saveQueueToStorage()

        // Применяем review блок от backend (merge pendingReviewDates и lastActiveDate)
        if (response.review && this.applyPendingReviews) {
          this.applyPendingReviews(response.review)
        }

        // Применяем данные от backend (bootstrap / authoritative update)
        if (response.data) {
          if (response.data.goals && this.applyGoals) {
            this.applyGoals(response.data.goals)
          }
          if (response.data.habits && this.applyHabits) {
            this.applyHabits(response.data.habits)
          }
        }

        this.saveMetaToStorage()

        if (response.conflicts.length > 0) {
          console.warn("[SyncService] Conflicts detected:", response.conflicts)
          // Сохраняем конфликты и показываем диалог
          this.pendingConflicts = response.conflicts
          if (this.conflictsHandler) {
            this.conflictsHandler(response.conflicts)
          }
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
   * Собрать pendingReviewDates и lastActiveDate из day-state-store
   */
  private collectReviewBlock(): SyncReviewBlock {
    if (typeof window === "undefined") {
      return { pendingReviewDates: [] }
    }

    try {
      const dayStateData = localStorage.getItem("day-state-storage")
      if (!dayStateData) return { pendingReviewDates: [] }

      const dayState = JSON.parse(dayStateData).state
      return {
        pendingReviewDates: dayState?.pendingReviewDates || [],
        lastActiveDate: dayState?.lastActiveDate || null,
      }
    } catch (error) {
      console.error("[SyncService] Failed to collect review block:", error)
      return { pendingReviewDates: [] }
    }
  }

  /**
   * Построить changes-блок для backend из очереди изменений
   */
  private buildChangesFromQueue(): SyncChanges {
    return {
      goals: this.queue.goals,
      habits: this.queue.habits,
    }
  }

  /**
   * Добавить изменение goal в очередь
   */
  enqueueGoalChange(operation: LocalSyncOperation, goal: Goal) {
    const list = this.queue.goals
    const idx = list.findIndex((item) => item.id === goal.id)
    const now = Date.now()

    // Убираем метаданные из payload
    const { _localUpdatedAt, _localOp, ...payload } = goal

    if (idx === -1) {
      // Новое изменение
      list.push({
        id: goal.id,
        clientUpdatedAt: now,
        operation,
        payload,
      })
    } else {
      const prev = list[idx].operation

      // create + delete до синка → удаляем из очереди (бэкенд не должен знать)
      if (prev === "create" && operation === "delete") {
        list.splice(idx, 1)
        this.saveQueueToStorage()
        return
      }

      // create + update → оставляем create, но обновляем payload
      if (prev === "create" && (operation === "update" || operation === "upsert")) {
        list[idx] = {
          ...list[idx],
          payload,
          clientUpdatedAt: now,
        }
      } else {
        // Всё остальное → последняя операция побеждает
        list[idx] = {
          id: goal.id,
          clientUpdatedAt: now,
          operation,
          payload,
        }
      }
    }

    this.saveQueueToStorage()
  }

  /**
   * Добавить изменение habit в очередь
   */
  enqueueHabitChange(operation: LocalSyncOperation, habit: Habit) {
    const list = this.queue.habits
    const idx = list.findIndex((item) => item.id === habit.id)
    const now = Date.now()

    const { _localUpdatedAt, _localOp, ...payload } = habit

    if (idx === -1) {
      list.push({
        id: habit.id,
        clientUpdatedAt: now,
        operation,
        payload,
      })
    } else {
      const prev = list[idx].operation

      if (prev === "create" && operation === "delete") {
        list.splice(idx, 1)
        this.saveQueueToStorage()
        return
      }

      if (prev === "create" && (operation === "update" || operation === "upsert")) {
        list[idx] = {
          ...list[idx],
          payload,
          clientUpdatedAt: now,
        }
      } else {
        list[idx] = {
          id: habit.id,
          clientUpdatedAt: now,
          operation,
          payload,
        }
      }
    }

    this.saveQueueToStorage()
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
      deviceId: request.deviceId,
      lastSyncAt: request.lastSyncAt,
      goalsChanges: request.changes.goals.length,
      habitsChanges: request.changes.habits.length,
      pendingReviews: request.review.pendingReviewDates.length,
      lastActiveDate: request.review.lastActiveDate,
    })

    // Имитация обработки на backend
    // Backend бы здесь:
    // 1. Сохранил данные в БД
    // 2. Обновил метаданные для notifications:
    //    - last_sync_timestamp
    //    - last_day_ended_date (берет самую новую из всех устройств)
    //    - pending_review_dates (merge всех устройств)
    //    - current_streak
    //    - total_goals_count
    //    - total_habits_count
    // 3. Проверил конфликты (если есть)
    // 4. Вернул новый timestamp и актуальные данные

    // ⚠️ ДЛЯ ТЕСТИРОВАНИЯ:
    // - Toast: можно временно вернуть success: false или бросить ошибку
    // - Конфликты: можно добавить конфликты в массив conflicts для тестирования UI
    //   Пример:
    //   conflicts: [{
    //     type: "goal",
    //     id: "test-goal-id",
    //     message: "Конфликт: цель была изменена на другом устройстве",
    //     localVersion: request.changes.goals[0]?.payload,
    //     serverVersion: { id: "test-goal-id", title: "Серверная версия", ... },
    //     localOperation: "update"
    //   }]

    // Имитация: бэкенд хранит самую новую lastActiveDate и merge всех pendingReviewDates
    // В реальности бэкенд бы делал это на основе данных всех устройств
    // Здесь просто возвращаем то, что прислал клиент (в реальности был бы merge с данными других устройств)
    const now = new Date().toISOString()
    
    // Если клиент прислал lastActiveDate, сравниваем с текущим временем и берем более новую
    // В реальности бэкенд сравнивал бы со своей lastActiveDate из БД
    let serverLastActiveDate = request.review.lastActiveDate || now
    if (request.review.lastActiveDate) {
      const clientDate = new Date(request.review.lastActiveDate)
      const serverDate = new Date(now)
      // Берем более новую дату (в реальности бэкенд хранил бы самую новую из всех устройств)
      serverLastActiveDate = serverDate > clientDate ? now : request.review.lastActiveDate
    }

    // ⚠️ ТЕСТИРОВАНИЕ КОНФЛИКТОВ:
    // Раскомментируйте блок ниже для тестирования UI конфликтов
    // Создайте несколько goals/habits в приложении, затем включите этот код и обновите страницу
    
    // const testConflicts: Conflict[] = []
    
    // // Генерируем конфликты для всех goals из запроса (максимум 3 для теста)
    // const goalsToTest = request.changes.goals.slice(0, 3)
    // goalsToTest.forEach((goal, index) => {
    //   testConflicts.push({
    //     type: "goal",
    //     id: goal.id,
    //     message: `Конфликт #${index + 1}: цель "${goal.payload.title}" была изменена на другом устройстве`,
    //     localVersion: goal.payload,
    //     serverVersion: {
    //       ...goal.payload,
    //       title: goal.payload.title + " (серверная версия)",
    //       description: goal.payload.description 
    //         ? goal.payload.description + " [Изменено на Device №2]"
    //         : "Эта версия была изменена на Device №2",
    //       _localUpdatedAt: Date.now() - 10000, // Старше локальной
    //     },
    //     localOperation: goal.operation,
    //   })
    // })
    
    // // Генерируем конфликты для всех habits из запроса (максимум 2 для теста)
    // const habitsToTest = request.changes.habits.slice(0, 2)
    // habitsToTest.forEach((habit, index) => {
    //   testConflicts.push({
    //     type: "habit",
    //     id: habit.id,
    //     message: `Конфликт: привычка "${habit.payload.title}" была изменена на другом устройстве`,
    //     localVersion: habit.payload,
    //     serverVersion: {
    //       ...habit.payload,
    //       title: habit.payload.title + " (серверная версия)",
    //       currentStreak: (habit.payload.currentStreak || 0) + 5,
    //       maxStreak: Math.max((habit.payload.maxStreak || 0), (habit.payload.currentStreak || 0) + 5),
    //       _localUpdatedAt: Date.now() - 10000, // Старше локальной
    //     },
    //     localOperation: habit.operation,
    //   })
    // })
    
    // // Если нет изменений в запросе, создаем тестовые конфликты с фиктивными данными
    // if (testConflicts.length === 0) {
    //   testConflicts.push(
    //     {
    //       type: "goal",
    //       id: "test-goal-1",
    //       message: "Конфликт: цель была изменена на другом устройстве",
    //       localVersion: {
    //         id: "test-goal-1",
    //         type: "temporary",
    //         title: "Локальная версия цели",
    //         description: "Это локальная версия, измененная на Device №1",
    //         completed: false,
    //         targetDate: new Date().toDateString(),
    //         label: "Работа",
    //         _localUpdatedAt: Date.now(),
    //       },
    //       serverVersion: {
    //         id: "test-goal-1",
    //         type: "temporary",
    //         title: "Серверная версия цели",
    //         description: "Это серверная версия, измененная на Device №2",
    //         completed: true,
    //         targetDate: new Date().toDateString(),
    //         label: "Работа",
    //         _localUpdatedAt: Date.now() - 10000,
    //       },
    //       localOperation: "update",
    //     },
    //     {
    //       type: "goal",
    //       id: "test-goal-2",
    //       message: "Конфликт: другая цель была изменена на другом устройстве",
    //       localVersion: {
    //         id: "test-goal-2",
    //         type: "temporary",
    //         title: "Вторая локальная цель",
    //         description: "Локальное описание",
    //         completed: false,
    //         targetDate: new Date().toDateString(),
    //         label: "Личное",
    //         _localUpdatedAt: Date.now(),
    //       },
    //       serverVersion: {
    //         id: "test-goal-2",
    //         type: "temporary",
    //         title: "Вторая серверная цель",
    //         description: "Серверное описание",
    //         completed: false,
    //         targetDate: new Date().toDateString(),
    //         label: "Личное",
    //         _localUpdatedAt: Date.now() - 5000,
    //       },
    //       localOperation: "update",
    //     },
    //     {
    //       type: "habit",
    //       id: "test-habit-1",
    //       message: "Конфликт: привычка была изменена на другом устройстве",
    //       localVersion: {
    //         id: "test-habit-1",
    //         type: "habit",
    //         title: "Локальная привычка",
    //         completed: false,
    //         repeatType: "daily",
    //         currentStreak: 5,
    //         maxStreak: 10,
    //         completions: {},
    //         _localUpdatedAt: Date.now(),
    //       },
    //       serverVersion: {
    //         id: "test-habit-1",
    //         type: "habit",
    //         title: "Серверная привычка",
    //         completed: false,
    //         repeatType: "daily",
    //         currentStreak: 12,
    //         maxStreak: 15,
    //         completions: {},
    //         _localUpdatedAt: Date.now() - 10000,
    //       },
    //       localOperation: "update",
    //     }
    //   )
    // }
    
    // if (testConflicts.length > 0) {
    //   return {
    //     success: true,
    //     conflicts: testConflicts,
    //     newLastSyncAt: Date.now(),
    //     review: {
    //       pendingReviewDates: request.review.pendingReviewDates,
    //       lastActiveDate: serverLastActiveDate,
    //     },
    //     data: undefined,
    //   }
    // }

    // Нормальная работа (успех)
    return {
      success: true,
      conflicts: [],
      newLastSyncAt: Date.now(),
      review: {
        // В реальности бэкенд бы делал merge pendingReviewDates со всех устройств
        // Здесь возвращаем то, что прислал клиент (для тестирования)
        pendingReviewDates: request.review.pendingReviewDates,
        // Возвращаем lastActiveDate (в реальности бэкенд хранил бы самую новую)
        lastActiveDate: serverLastActiveDate,
      },
      data: undefined,
    }
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
        isExpanded?: boolean
        HapticFeedback?: {
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
          selectionChanged: () => void
        }
      }
    }
  }
}

