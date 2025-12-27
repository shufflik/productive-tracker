// Core types for the application

export type GoalType = "habit" | "goal"
export type RepeatType = "daily" | "weekly"

// ============================================
// Global Goals System
// ============================================

/**
 * Тип глобальной цели (определяется автоматически)
 * 
 * OUTCOME - цель с дискретным результатом (достигнута или нет)
 *   Примеры: "Устроиться на работу", "Запустить продукт"
 *   
 * PROCESS - цель-процесс без конечной точки
 *   Примеры: "Быть продуктивнее", "Улучшить форму"
 *   
 * HYBRID - измеримый результат + процесс
 *   Примеры: "Сбросить 10 кг", "Выучить язык до B2"
 */
export type GlobalGoalType = "outcome" | "process" | "hybrid"

/**
 * Статус глобальной цели
 */
export type GlobalGoalStatus = "not_started" | "in_progress" | "achieved"

/**
 * Глобальная цель
 */
export type GlobalGoal = {
  id: string
  type: GlobalGoalType
  title: string
  description?: string

  // Период
  periodStart: string  // ISO date
  periodEnd?: string   // ISO date (optional for process goals)

  // Статус
  status: GlobalGoalStatus
  statusChangedAt?: string

  // Для HYBRID целей - измеримый прогресс
  targetValue?: number      // например, 10 (кг)
  currentValue?: number     // например, 3 (кг)
  unit?: string             // например, "кг"

  // Метаданные
  createdAt: string

  // Soft delete flag for sync
  deleted?: boolean
} & LocalSyncMeta

/**
 * Milestone (этап) для OUTCOME целей
 * 
 * Отражает фазу пути, а не список задач
 * Не имеет процента выполнения
 */
export type Milestone = {
  id: string
  globalGoalId: string
  title: string
  description?: string
  order: number

  // Когда пользователь вошёл в этот этап
  enteredAt?: string
  // Когда вышел из этапа (перешёл на следующий)
  exitedAt?: string

  // Статус этапа
  isActive: boolean
  isCompleted: boolean

  // Soft delete flag for sync
  deleted?: boolean
} & LocalSyncMeta

/**
 * Связь daily goal с глобальной целью / milestone
 */
export type GoalLink = {
  globalGoalId: string
  milestoneId?: string  // опционально, для outcome-целей
}

// ============================================
// Local sync metadata for offline-first
// ============================================

export type LocalSyncOperation = "create" | "update" | "delete" | "upsert"

export type LocalSyncMeta = {
  _localUpdatedAt?: number
  _localOp?: LocalSyncOperation
  _version?: number
}

// ============================================
// Daily Goals & Tasks
// ============================================

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
  
  // Связь с глобальной целью
  globalGoalId?: string
  milestoneId?: string
  
  // Уровень усилий (для process прогресса)
  effortLevel?: "low" | "medium" | "high"
}

// Habit (recurring task with streak tracking, no description)
export type Habit = BaseItem & {
  repeatType: RepeatType
  repeatDays?: number[] // 0-6, where 0 is Sunday
  currentStreak: number
  maxStreak: number
  lastCompletedDate?: string
  completions?: Record<string, boolean>
  
  // Связь с глобальной целью (для process целей)
  globalGoalId?: string
}

// Union type for both
export type TaskItem = Goal | Habit

// ============================================
// Day Review & Statistics
// ============================================

export type DayReason = {
  date: string
  reason: string
  rating: number
}

export type DayStatus = "productive" | "normal" | "unproductive" | null

// ============================================
// Progress Calculation Types
// ============================================

/**
 * Статус активности для process-целей
 * Показывается вместо процентов
 */
export type ActivityStatus = "active" | "unstable" | "weak" | "collecting"

/**
 * Прогресс для OUTCOME цели
 * 
 * ЗАПРЕЩЕНО показывать:
 * - процент выполнения
 * - milestonesCompleted/totalMilestones как прогресс
 * 
 * РАЗРЕШЕНО показывать:
 * - текущий активный milestone
 * - время в текущем milestone
 * - историю переходов
 */
export type OutcomeProgress = {
  type: "outcome"
  // Текущий активный этап
  currentMilestone?: Milestone
  // Дней в текущем этапе
  timeInCurrentMilestone: number
  // История - только для контекста, НЕ для прогресса
  milestoneHistory: {
    id: string
    title: string
    enteredAt?: string
    exitedAt?: string
    daysSpent: number
    isCompleted: boolean
  }[]
  // Распределение активности по milestones (контекст, не прогресс)
  activityByMilestone: Record<string, {
    goalsCompleted: number
    goalsTotal: number
    daysActive: number
  }>
}

/**
 * Прогресс для PROCESS цели
 * 
 * Activity Index - внутренний показатель
 * В UI показываем ТОЛЬКО текстовый статус
 */
export type ProcessProgress = {
  type: "process"
  // Внутренний индекс (0-100), НЕ показываем в UI напрямую
  _activityIndex: number
  // Текстовый статус для UI
  activityStatus: ActivityStatus
  // Краткий сигнал (опционально)
  activitySignal?: string
  // Тренд
  trend: "up" | "down" | "stable"
  // Статистика без процентов
  streakDays: number
  lastActiveDate?: string
  // Агрегированные данные
  weeklyActivity: {
    goalsCompleted: number
    habitsCompleted: number
  }
}

/**
 * Прогресс для HYBRID цели
 * 
 * ДВА НЕЗАВИСИМЫХ показателя:
 * 1. Объективный результат (current/target) - БЕЗ интерпретации как прогресс цели
 * 2. Процессный ритм - как у process цели
 * 
 * ЗАПРЕЩЕНО:
 * - объединять показатели
 * - показывать два процента
 * - вычислять "общий прогресс"
 */
export type HybridProgress = {
  type: "hybrid"
  // Объективный результат - только факты, без процентов
  objectiveResult: {
    current: number
    target: number
    unit: string
  }
  // Процессный ритм - тот же формат что и ProcessProgress
  processRhythm: {
    activityStatus: ActivityStatus
    activitySignal?: string
    trend: "up" | "down" | "stable"
    streakDays: number
  }
}

export type GlobalGoalProgress = OutcomeProgress | ProcessProgress | HybridProgress
