/**
 * Progress calculation utilities for Global Goals
 */

import { format } from "date-fns"
import type {
  GlobalGoal,
  Milestone,
  Goal,
  Habit,
  OutcomeProgress,
  ProcessProgress,
  HybridProgress,
  ActivityStatus,
} from "@/lib/types"

// Helper to format date to ISO format (YYYY-MM-DD)
const toISODateString = (date: Date): string => format(date, "yyyy-MM-dd")

/** Grace period in days before activity status is calculated */
const ACTIVITY_GRACE_PERIOD_DAYS = 14

/**
 * Calculates days since goal was created
 */
function getDaysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt)
  created.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Determines text activity status based on activity index
 * Returns "collecting" if goal is younger than grace period
 */
export function getActivityStatus(activityIndex: number, createdAt?: string): ActivityStatus {
  // If goal is younger than grace period, show neutral status
  if (createdAt) {
    const daysSinceCreation = getDaysSinceCreation(createdAt)
    if (daysSinceCreation < ACTIVITY_GRACE_PERIOD_DAYS) {
      return "collecting"
    }
  }

  if (activityIndex >= 60) return "active"
  if (activityIndex >= 30) return "unstable"
  return "weak"
}

/**
 * Generates short activity signal
 */
export function getActivitySignal(
  activityIndex: number,
  trend: "up" | "down" | "stable",
  streakDays: number
): string | undefined {
  if (trend === "up" && activityIndex >= 50) {
    return "Активность выше обычного"
  }
  if (streakDays >= 7) {
    return `Серия ${streakDays} дней`
  }
  if (trend === "down" && activityIndex < 40) {
    return "Активность снижается"
  }
  return undefined
}

/**
 * Calculate progress for OUTCOME type goals
 */
export function calculateOutcomeProgress(
  globalGoal: GlobalGoal,
  milestones: Milestone[],
  linkedGoals: Goal[]
): OutcomeProgress {
  const activeMilestone = milestones.find(m => m.isActive)
  const now = new Date()

  // Calculate time in current milestone
  let timeInCurrentMilestone = 0
  if (activeMilestone?.enteredAt) {
    const enteredDate = new Date(activeMilestone.enteredAt)
    timeInCurrentMilestone = Math.floor((now.getTime() - enteredDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Build milestone history
  const milestoneHistory = milestones.map(m => {
    let daysSpent = 0
    if (m.enteredAt) {
      const enteredDate = new Date(m.enteredAt)
      const exitDate = m.exitedAt ? new Date(m.exitedAt) : (m.isActive ? now : enteredDate)
      daysSpent = Math.floor((exitDate.getTime() - enteredDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    return {
      id: m.id,
      title: m.title,
      enteredAt: m.enteredAt,
      exitedAt: m.exitedAt,
      daysSpent,
      isCompleted: m.isCompleted
    }
  })

  // Activity by milestone
  const activityByMilestone: OutcomeProgress['activityByMilestone'] = {}
  for (const milestone of milestones) {
    const goalsForMilestone = linkedGoals.filter(g => g.milestoneId === milestone.id)
    const completedGoals = goalsForMilestone.filter(g => g.completed)

    const activeDates = new Set<string>()
    for (const goal of goalsForMilestone) {
      if (goal.targetDate) {
        activeDates.add(goal.targetDate)
      }
    }

    activityByMilestone[milestone.id] = {
      goalsCompleted: completedGoals.length,
      goalsTotal: goalsForMilestone.length,
      daysActive: activeDates.size
    }
  }

  return {
    type: "outcome",
    currentMilestone: activeMilestone,
    timeInCurrentMilestone,
    milestoneHistory,
    activityByMilestone
  }
}

/**
 * Calculate progress for PROCESS type goals
 */
export function calculateProcessProgress(
  globalGoal: GlobalGoal,
  linkedGoals: Goal[],
  linkedHabits: Habit[],
  excludeMilestoneGoals: boolean = false
): ProcessProgress {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const goalsToCount = excludeMilestoneGoals
    ? linkedGoals.filter(g => !g.milestoneId)
    : linkedGoals

  // Count activity in last 7 days
  const recentGoals = goalsToCount.filter(g => {
    if (!g.targetDate) return false
    const date = new Date(g.targetDate)
    return date >= weekAgo && date <= now
  })

  const recentCompletedGoals = recentGoals.filter(g => g.completed).length

  // Count habit completions in last 7 days
  let recentHabitCompletions = 0
  for (const habit of linkedHabits) {
    if (habit.completions) {
      for (const [dateStr, completed] of Object.entries(habit.completions)) {
        const date = new Date(dateStr)
        if (date >= weekAgo && date <= now && completed) {
          recentHabitCompletions++
        }
      }
    }
  }

  // Calculate activity index (0-100)
  const totalRecentActivity = recentCompletedGoals + recentHabitCompletions
  const maxExpectedActivity = 7 * (1 + linkedHabits.length)
  const activityIndex = maxExpectedActivity > 0
    ? Math.min(100, Math.round((totalRecentActivity / maxExpectedActivity) * 100))
    : 0

  // Calculate trend
  const previousWeekGoals = goalsToCount.filter(g => {
    if (!g.targetDate) return false
    const date = new Date(g.targetDate)
    return date >= twoWeeksAgo && date < weekAgo
  })
  const previousWeekCompletedGoals = previousWeekGoals.filter(g => g.completed).length

  let trend: "up" | "down" | "stable" = "stable"
  if (recentCompletedGoals > previousWeekCompletedGoals + 1) {
    trend = "up"
  } else if (recentCompletedGoals < previousWeekCompletedGoals - 1) {
    trend = "down"
  }

  // Calculate streak
  let streakDays = 0
  let checkDate = new Date(now)
  checkDate.setHours(0, 0, 0, 0)

  while (true) {
    const dateStr = toISODateString(checkDate)
    const hasGoalActivity = goalsToCount.some(g =>
      g.targetDate === dateStr && g.completed
    )
    // Habits still use toDateString format for completions keys
    const habitDateStr = checkDate.toDateString()
    const hasHabitActivity = linkedHabits.some(h =>
      h.completions?.[habitDateStr] === true
    )

    if (hasGoalActivity || hasHabitActivity) {
      streakDays++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // Find last active date
  let lastActiveDate: string | undefined
  const allDates = goalsToCount
    .filter(g => g.completed && g.targetDate)
    .map(g => g.targetDate!)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (allDates.length > 0) {
    lastActiveDate = allDates[0]
  }

  const activityStatus = getActivityStatus(activityIndex, globalGoal.createdAt)
  const activitySignal = getActivitySignal(activityIndex, trend, streakDays)

  return {
    type: "process",
    _activityIndex: activityIndex,
    activityStatus,
    activitySignal,
    trend,
    streakDays,
    lastActiveDate,
    weeklyActivity: {
      goalsCompleted: recentCompletedGoals,
      habitsCompleted: recentHabitCompletions
    }
  }
}

/**
 * Calculate progress for HYBRID type goals
 */
export function calculateHybridProgress(
  globalGoal: GlobalGoal,
  linkedGoals: Goal[],
  linkedHabits: Habit[]
): HybridProgress {
  const processProgress = calculateProcessProgress(globalGoal, linkedGoals, linkedHabits, true)

  const current = globalGoal.currentValue || 0
  const target = globalGoal.targetValue || 1
  const unit = globalGoal.unit || ""

  return {
    type: "hybrid",
    objectiveResult: {
      current,
      target,
      unit
    },
    processRhythm: {
      activityStatus: processProgress.activityStatus,
      activitySignal: processProgress.activitySignal,
      trend: processProgress.trend,
      streakDays: processProgress.streakDays
    }
  }
}
