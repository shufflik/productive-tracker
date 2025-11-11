// Core types for the application

export type GoalType = "habit" | "temporary"
export type RepeatType = "daily" | "weekly"

// Base type for common properties
type BaseItem = {
  id: string
  title: string
  completed: boolean
  important?: boolean
}

// Goal (temporary task with deadline)
export type Goal = BaseItem & {
  type: "temporary"
  description?: string
  targetDate?: string
  label?: string
}

// Habit (recurring task with streak tracking, no description)
export type Habit = BaseItem & {
  type: "habit"
  repeatType: RepeatType
  repeatDays?: number[] // 0-6, where 0 is Sunday
  currentStreak: number
  maxStreak: number
  lastCompletedDate?: string
}

// Union type for both
export type TaskItem = Goal | Habit

export type DayCompletion = {
  date: string
  goals: {
    id: string
    completed: boolean
  }[]
}

export type DayReason = {
  date: string
  reason: string
  rating: number
}

export type DayStatus = "productive" | "normal" | "unproductive" | null

