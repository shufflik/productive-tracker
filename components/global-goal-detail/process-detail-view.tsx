"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import { useLinkedGoals } from "@/lib/hooks/use-linked-goals"
import type { GlobalGoal, ProcessProgress } from "@/lib/types"
import { ActivityStatusBlock } from "./activity-status-block"
import { LinkedItemsList } from "./linked-items-list"

type ProcessDetailViewProps = {
  goal: GlobalGoal
  progress: ProcessProgress
  isEditing?: boolean
}

export function ProcessDetailView({ goal, progress, isEditing }: ProcessDetailViewProps) {
  const updateGlobalGoal = useGlobalGoalsStore((state) => state.updateGlobalGoal)
  const habits = useHabitsStore((state) => state.habits)

  // Load linked goals from API
  const {
    goals: linkedGoals,
    goalsFor14Days,
    isLoading,
    isLoadingChart,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useLinkedGoals({ globalGoalId: goal.id })

  // Habits still from store (temporary solution)
  const linkedHabits = useMemo(
    () => habits.filter((h) => h.globalGoalId === goal.id),
    [habits, goal.id]
  )

  const isNotStarted = goal.status === "not_started"

  const handleStartGoal = async () => {
    await updateGlobalGoal(goal.id, { status: "in_progress" })
  }

  return (
    <div className="space-y-6">
      {/* Start Goal Button - hidden in editing mode */}
      {isNotStarted && !isEditing && (
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

      {/* Activity Status + Chart + Weekly Stats - hidden in editing mode */}
      {!isEditing && (
        <div className="space-y-4">
          <ActivityStatusBlock
            activityStatus={progress.activityStatus}
            activitySignal={progress.activitySignal}
            trend={progress.trend}
            linkedGoals={goalsFor14Days}
            linkedHabits={linkedHabits}
            createdAt={goal.createdAt}
            isLoadingChart={isLoadingChart}
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
        </div>
      )}

      {/* Linked items - hidden in editing mode */}
      {!isEditing && (
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Связанные действия</h3>
          <LinkedItemsList
            linkedGoals={linkedGoals}
            linkedHabits={linkedHabits}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            onLoadMore={fetchNextPage}
          />
        </div>
      )}
    </div>
  )
}
