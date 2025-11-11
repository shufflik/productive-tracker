// Core types for the application

export type GoalType = "habit" | "temporary"
export type RepeatType = "daily" | "weekly"

export type Goal = {
  id: string
  title: string
  description?: string
  type: GoalType
  completed: boolean
  repeatType?: RepeatType
  repeatDays?: number[] // 0-6, where 0 is Sunday
  targetDate?: string
  important?: boolean
  label?: string
}

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

