// Core types for the application

export type GoalType = "habit" | "goal"
export type RepeatType = "daily" | "weekly"

// Local sync metadata for offline-first
export type LocalSyncOperation = "create" | "update" | "delete" | "upsert"

export type LocalSyncMeta = {
  /**
   * Время последнего локального изменения сущности (ms since epoch)
   * Может присутствовать в данных, пришедших с backend или в старых данных
   */
  _localUpdatedAt?: number
  /**
   * Тип последней локальной операции над сущностью
   * Может присутствовать в данных, пришедших с backend или в старых данных
   */
  _localOp?: LocalSyncOperation
  /**
   * Версия сущности для оптимистичной блокировки (optimistic locking)
   * Инкрементируется при каждом изменении
   * Используется для обнаружения конфликтов при синхронизации
   */
  _version?: number
}

// Base type for common properties
type BaseItem = {
  id: string
  title: string
  completed: boolean
  important?: boolean
  deleted?: boolean
} & LocalSyncMeta

// Goal meta (filled only for incomplete goals when day is ended)
export type GoalMeta = {
  percent?: number
  delta?: number
  isPostponed?: boolean
}

// Goal (temporary task with deadline)
export type Goal = BaseItem & {
  description?: string
  targetDate?: string
  label?: string
  meta?: GoalMeta
}

// Habit (recurring task with streak tracking, no description)
export type Habit = BaseItem & {
  repeatType: RepeatType
  repeatDays?: number[] // 0-6, where 0 is Sunday
  currentStreak: number
  maxStreak: number
  lastCompletedDate?: string
  /**
   * История выполнения привычки по датам
   * Ключ: дата в формате toDateString() (например, "Mon Jan 15 2025")
   * Значение: выполнена ли привычка в этот день
   */
  completions?: Record<string, boolean>
}

// Union type for both
export type TaskItem = Goal | Habit

export type DayReason = {
  date: string
  reason: string
  rating: number
}

export type DayStatus = "productive" | "normal" | "unproductive" | null

