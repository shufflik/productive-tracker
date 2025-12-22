"use client"

import { useMemo } from "react"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import type { GlobalGoal, ProcessProgress } from "@/lib/types"
import { ActivityStatusBlock } from "./activity-status-block"
import { LinkedItemsList } from "./linked-items-list"

type ProcessDetailViewProps = {
  goal: GlobalGoal
  progress: ProcessProgress
}

export function ProcessDetailView({ goal, progress }: ProcessDetailViewProps) {
  const goals = useGoalsStore((state) => state.goals)
  const habits = useHabitsStore((state) => state.habits)

  const linkedGoals = useMemo(() => goals.filter(g => g.globalGoalId === goal.id), [goals, goal.id])
  const linkedHabits = useMemo(() => habits.filter(h => h.globalGoalId === goal.id), [habits, goal.id])

  return (
    <div className="space-y-6">
      {/* Activity Status + Chart */}
      <ActivityStatusBlock
        activityStatus={progress.activityStatus}
        activitySignal={progress.activitySignal}
        trend={progress.trend}
        linkedGoals={linkedGoals}
        linkedHabits={linkedHabits}
      />

      {/* Weekly Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold text-foreground">{progress.weeklyActivity.goalsCompleted}</p>
          <p className="text-xs text-muted-foreground">Задач за неделю</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold text-foreground">{progress.weeklyActivity.habitsCompleted}</p>
          <p className="text-xs text-muted-foreground">Привычек за неделю</p>
        </div>
      </div>

      {/* Linked items */}
      <div className="space-y-3">
        <h3 className="font-medium text-foreground">Связанные действия</h3>
        <LinkedItemsList linkedGoals={linkedGoals} linkedHabits={linkedHabits} />
      </div>
    </div>
  )
}
