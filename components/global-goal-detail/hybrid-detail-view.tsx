"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Layers, Pencil, Play } from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import type { GlobalGoal, HybridProgress } from "@/lib/types"
import { ActivityStatusBlock } from "./activity-status-block"
import { LinkedItemsList } from "./linked-items-list"

type HybridDetailViewProps = {
  goal: GlobalGoal
  progress: HybridProgress
}

export function HybridDetailView({ goal, progress }: HybridDetailViewProps) {
  const updateGlobalGoal = useGlobalGoalsStore((state) => state.updateGlobalGoal)
  const goals = useGoalsStore((state) => state.goals)
  const habits = useHabitsStore((state) => state.habits)

  const linkedGoals = useMemo(() => goals.filter(g => g.globalGoalId === goal.id), [goals, goal.id])
  const linkedHabits = useMemo(() => habits.filter(h => h.globalGoalId === goal.id), [habits, goal.id])

  const [editingValue, setEditingValue] = useState(false)
  const [newValue, setNewValue] = useState(String(progress.objectiveResult.current))

  const isNotStarted = goal.status === "not_started"

  const handleStartGoal = async () => {
    await updateGlobalGoal(goal.id, { status: "in_progress" })
  }

  const handleUpdateValue = () => {
    const value = Number(newValue)
    if (!isNaN(value) && value >= 0) {
      updateGlobalGoal(goal.id, { currentValue: value })
    }
    setEditingValue(false)
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
      {/* Объективный результат */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-600">Измеримый результат</span>
        </div>

        <div className="flex items-center justify-between">
          {editingValue ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-24 h-10"
                autoFocus
              />
              <span className="text-lg text-muted-foreground">/ {progress.objectiveResult.target} {progress.objectiveResult.unit}</span>
              <Button size="sm" onClick={handleUpdateValue}>Сохранить</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingValue(false)}>Отмена</Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNewValue(String(progress.objectiveResult.current))
                setEditingValue(true)
              }}
              className="text-2xl font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <span>{progress.objectiveResult.current}</span>
              <span className="text-muted-foreground font-normal">/ {progress.objectiveResult.target}</span>
              <span className="text-sm text-muted-foreground font-normal">{progress.objectiveResult.unit}</span>
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Ритм работы + График */}
      <ActivityStatusBlock
        activityStatus={progress.processRhythm.activityStatus}
        activitySignal={progress.processRhythm.activitySignal}
        trend={progress.processRhythm.trend}
        linkedGoals={linkedGoals}
        linkedHabits={linkedHabits}
        createdAt={goal.createdAt}
      />

      {/* Linked items */}
      <div className="space-y-3">
        <h3 className="font-medium text-foreground">Связанные действия</h3>
        <LinkedItemsList linkedGoals={linkedGoals} linkedHabits={linkedHabits} />
      </div>
    </div>
  )
}
