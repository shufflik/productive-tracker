"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
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
  const updateGlobalGoal = useGlobalGoalsStore((state) => state.updateGlobalGoal)
  const goals = useGoalsStore((state) => state.goals)
  const habits = useHabitsStore((state) => state.habits)

  const linkedGoals = useMemo(() => goals.filter(g => g.globalGoalId === goal.id), [goals, goal.id])
  const linkedHabits = useMemo(() => habits.filter(h => h.globalGoalId === goal.id), [habits, goal.id])

  const isNotStarted = goal.status === "not_started"

  const handleStartGoal = async () => {
    await updateGlobalGoal(goal.id, { status: "in_progress" })
  }

  return (
    <div className="space-y-6">
      {/* Start Goal Button */}
      {isNotStarted && (
        <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Play className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-blue-600">Готовы начать работу над целью?</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartGoal}
              className="flex-shrink-0 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
            >
              Начать
            </Button>
          </div>
        </div>
      )}
      {/* Activity Status + Chart */}
      <ActivityStatusBlock
        activityStatus={progress.activityStatus}
        activitySignal={progress.activitySignal}
        trend={progress.trend}
        linkedGoals={linkedGoals}
        linkedHabits={linkedHabits}
        createdAt={goal.createdAt}
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
