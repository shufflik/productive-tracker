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
export type GlobalGoalStatus = "not_started" | "in_progress" | "blocked" | "achieved" | "abandoned"

/**
 * Глобальная цель
 */
export type GlobalGoal = {
  id: string
  type: GlobalGoalType
  title: string
  description?: string
  icon?: string
  
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
 * Прогресс для OUTCOME цели
 * НЕ показывает процент!
 */
export type OutcomeProgress = {
  type: "outcome"
  currentMilestone?: Milestone
  timeInCurrentMilestone: number  // days
  milestonesCompleted: number
  totalMilestones: number
  activityByMilestone: Record<string, {
    goalsCompleted: number
    goalsTotal: number
    daysActive: number
  }>
}

/**
 * Прогресс для PROCESS цели
 * Скользящий индекс, может расти и падать
 */
export type ProcessProgress = {
  type: "process"
  // Скользящий индекс активности (0-100)
  activityIndex: number
  // Тренд за последнюю неделю
  trend: "up" | "down" | "stable"
  // Статистика
  totalGoalsCompleted: number
  totalHabitsCompleted: number
  streakDays: number
  lastActiveDate?: string
}

/**
 * Прогресс для HYBRID цели
 * Объективный + процессный прогресс ОТДЕЛЬНО
 */
export type HybridProgress = {
  type: "hybrid"
  // Объективный прогресс (измеримый результат)
  objectiveProgress: {
    current: number
    target: number
    unit: string
    percentage: number  // только здесь можно показывать %
  }
  // Процессный прогресс (как для process цели)
  processProgress: ProcessProgress
}

export type GlobalGoalProgress = OutcomeProgress | ProcessProgress | HybridProgress
