"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash2, ChevronDown } from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import type { GlobalGoal, GlobalGoalStatus, OutcomeProgress, ProcessProgress, HybridProgress } from "@/lib/types"
import {
  DeadlineInfo,
  OutcomeDetailView,
  ProcessDetailView,
  HybridDetailView,
  STATUS_OPTIONS
} from "./global-goal-detail"

type GlobalGoalDetailDialogProps = {
  open: boolean
  onClose: () => void
  goal: GlobalGoal | null
}

export function GlobalGoalDetailDialog({
  open,
  onClose,
  goal
}: GlobalGoalDetailDialogProps) {
  const updateGlobalGoal = useGlobalGoalsStore((state) => state.updateGlobalGoal)
  const deleteGlobalGoal = useGlobalGoalsStore((state) => state.deleteGlobalGoal)
  const calculateProgress = useGlobalGoalsStore((state) => state.calculateProgress)

  const goals = useGoalsStore((state) => state.goals)
  const habits = useHabitsStore((state) => state.habits)

  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState("")

  const progress = useMemo(() => {
    if (!goal) return null
    const linkedGoals = goals.filter(g => g.globalGoalId === goal.id)
    const linkedHabits = habits.filter(h => h.globalGoalId === goal.id)
    return calculateProgress(goal, linkedGoals, linkedHabits)
  }, [goal, goals, habits, calculateProgress])

  const handleStatusChange = (status: GlobalGoalStatus) => {
    if (goal) {
      updateGlobalGoal(goal.id, { status })
    }
    setShowStatusMenu(false)
  }

  const handleDelete = async () => {
    if (goal) {
      await deleteGlobalGoal(goal.id)
      onClose()
    }
  }

  const handleStartEditDescription = () => {
    setEditedDescription(goal?.description || "")
    setIsEditingDescription(true)
  }

  const handleSaveDescription = async () => {
    if (goal) {
      await updateGlobalGoal(goal.id, { description: editedDescription || undefined })
      setIsEditingDescription(false)
    }
  }

  const handleCancelEditDescription = () => {
    setIsEditingDescription(false)
    setEditedDescription("")
  }

  if (!goal || !progress) return null

  const currentStatus = STATUS_OPTIONS.find(s => s.value === goal.status)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col gap-2 px-6 py-4">
        <DialogHeader className="flex-shrink-0 flex items-center justify-center">
          <DialogTitle className="text-lg mb-1 text-center">{goal.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Status selector */}
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">Статус</span>
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors w-fit"
                style={{
                  backgroundColor: `${currentStatus?.color}15`,
                  color: currentStatus?.color,
                  border: `1px solid ${currentStatus?.color}30`
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentStatus?.color }}
                />
                {currentStatus?.label}
                <ChevronDown className="w-3 h-3" />
              </button>

              {showStatusMenu && (
                <div className="absolute top-full mt-1 left-0 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleStatusChange(status.value)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {(isEditingDescription || goal.description) && (
            <div className="mb-4">
              <span className="text-xs font-medium text-muted-foreground block mb-1.5">Описание</span>
              {isEditingDescription ? (
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Опишите вашу мотивацию..."
                  rows={3}
                  className="bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
                  autoFocus
                />
              ) : (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="max-h-20 overflow-y-auto">
                    <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{goal.description}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Deadline */}
          {goal.periodEnd && (goal.type === "outcome" || goal.type === "hybrid") &&
           (goal.status === "in_progress" || goal.status === "not_started") && (
            <div className="mb-4">
              <DeadlineInfo periodEnd={goal.periodEnd} />
            </div>
          )}

          {progress.type === "outcome" && (
            <OutcomeDetailView goal={goal} progress={progress as OutcomeProgress} isEditing={isEditingDescription} />
          )}
          {progress.type === "process" && (
            <ProcessDetailView goal={goal} progress={progress as ProcessProgress} />
          )}
          {progress.type === "hybrid" && (
            <HybridDetailView goal={goal} progress={progress as HybridProgress} />
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 pt-2 border-t border-border">
          {showDeleteConfirm ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="flex-1 bg-destructive hover:bg-destructive/90"
              >
                Delete Goal
              </Button>
            </div>
          ) : isEditingDescription ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancelEditDescription}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSaveDescription}
                className="flex-1"
              >
                Сохранить
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleStartEditDescription}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
