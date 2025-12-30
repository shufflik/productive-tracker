"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Layers, Pencil, Play, Info, Trophy } from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import { useLinkedGoals } from "@/lib/hooks/use-linked-goals"
import type { GlobalGoal, HybridProgress } from "@/lib/types"
import { ActivityStatusBlock } from "./activity-status-block"
import { LinkedItemsList } from "./linked-items-list"

type HybridDetailViewProps = {
  goal: GlobalGoal
  progress: HybridProgress
  isEditing?: boolean
}

export function HybridDetailView({ goal, progress, isEditing }: HybridDetailViewProps) {
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

  const [editingValue, setEditingValue] = useState(false)
  const [newValue, setNewValue] = useState(String(progress.objectiveResult.current))

  // Check if measurable result is reached
  const isGoalReached = progress.objectiveResult.current >= progress.objectiveResult.target
  const isAchieved = goal.status === "achieved"

  // State for editing target and unit
  const [editedTargetValue, setEditedTargetValue] = useState(String(goal.targetValue || ""))
  const [editedUnit, setEditedUnit] = useState(goal.unit || "")

  // Reset editing state when isEditing changes
  useEffect(() => {
    if (isEditing) {
      setEditedTargetValue(String(goal.targetValue || ""))
      setEditedUnit(goal.unit || "")
    }
  }, [isEditing, goal.targetValue, goal.unit])

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

  const handleCompleteGoal = async () => {
    await updateGlobalGoal(goal.id, { status: "achieved" })
  }

  // Save target value and unit when exiting edit mode (called from parent)
  useEffect(() => {
    if (!isEditing && editedTargetValue && editedUnit) {
      const targetValue = Number(editedTargetValue)
      if (!isNaN(targetValue) && targetValue > 0 && editedUnit.trim()) {
        // Only update if values changed
        if (targetValue !== goal.targetValue || editedUnit.trim() !== goal.unit) {
          updateGlobalGoal(goal.id, {
            targetValue,
            unit: editedUnit.trim()
          })
        }
      }
    }
  }, [isEditing])

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

      {/* Измеримый результат - editing mode: show target/unit form */}
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Установите измеримую цель. Вы будете отслеживать как объективный результат, так и ежедневную активность.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target">Целевое значение <span className="text-destructive">*</span></Label>
              <Input
                id="target"
                type="number"
                placeholder="e.g., 10"
                value={editedTargetValue}
                onChange={(e) => setEditedTargetValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Единица измерения <span className="text-destructive">*</span></Label>
              <Input
                id="unit"
                placeholder="e.g., kg, hours, books"
                value={editedUnit}
                onChange={(e) => setEditedUnit(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : !isNotStarted && (
        /* Объективный результат - only show when not in not_started status */
        <div className={`p-4 rounded-xl border ${
          isGoalReached
            ? "bg-green-500/10 border-green-500/20"
            : "bg-blue-500/10 border-blue-500/20"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Layers className={`w-4 h-4 ${isGoalReached ? "text-green-500" : "text-blue-500"}`} />
            <span className={`text-sm font-medium ${isGoalReached ? "text-green-600" : "text-blue-600"}`}>
              Измеримый результат {isGoalReached && "— достигнут!"}
            </span>
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
      )}

      {/* Completion prompt - show when goal reached but not yet achieved */}
      {isGoalReached && !isAchieved && !isEditing && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-600">Цель достигнута!</p>
                <p className="text-xs text-muted-foreground">Хотите завершить цель?</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCompleteGoal}
                className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              >
                Да, завершить
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ритм работы + График - hidden in editing mode and when achieved */}
      {!isEditing && !isAchieved && (
        <ActivityStatusBlock
          activityStatus={progress.processRhythm.activityStatus}
          activitySignal={progress.processRhythm.activitySignal}
          trend={progress.processRhythm.trend}
          linkedGoals={goalsFor14Days}
          linkedHabits={linkedHabits}
          createdAt={goal.createdAt}
          isLoadingChart={isLoadingChart}
        />
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
