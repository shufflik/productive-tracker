"use client"

import { useMemo, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash2, Calendar } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import type { GlobalGoal, OutcomeProgress, ProcessProgress, HybridProgress } from "@/lib/types"
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
  const milestones = useGlobalGoalsStore((state) => state.milestones)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const [editedDescription, setEditedDescription] = useState("")
  const [editedDeadline, setEditedDeadline] = useState("")

  // Reset editing state when goal changes or dialog closes
  useEffect(() => {
    if (!open || !goal) {
      setIsEditing(false)
      setEditedTitle("")
      setEditedDescription("")
      setEditedDeadline("")
      setShowDeleteConfirm(false)
    }
  }, [open, goal?.id])

  const progress = useMemo(() => {
    if (!goal) return null
    const linkedGoals = goals.filter(g => g.globalGoalId === goal.id)
    const linkedHabits = habits.filter(h => h.globalGoalId === goal.id)
    return calculateProgress(goal, linkedGoals, linkedHabits)
  }, [goal, goals, habits, milestones, calculateProgress])

  const handleDelete = async () => {
    if (goal) {
      await deleteGlobalGoal(goal.id)
      onClose()
    }
  }

  const handleStartEditing = () => {
    setEditedTitle(goal?.title || "")
    setEditedDescription(goal?.description || "")
    setEditedDeadline(goal?.periodEnd || "")
    setIsEditing(true)
  }

  const isDeadlineRequired = goal?.type === "outcome" || goal?.type === "hybrid"
  const canSave = editedTitle.trim() && (!isDeadlineRequired || editedDeadline)

  const handleSave = async () => {
    if (goal && canSave) {
      await updateGlobalGoal(goal.id, {
        title: editedTitle.trim(),
        description: editedDescription || undefined,
        periodEnd: editedDeadline || undefined
      })
      setIsEditing(false)
    }
  }

  const handleCancelEditing = () => {
    setIsEditing(false)
    setEditedTitle("")
    setEditedDescription("")
    setEditedDeadline("")
  }

  if (!goal || !progress) return null

  const currentStatus = STATUS_OPTIONS.find(s => s.value === goal.status)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col gap-2 px-6 py-4">
        <DialogHeader className="flex-shrink-0 flex items-center justify-center pt-4">
          {isEditing ? (
            <div className="w-full">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value.slice(0, 35))}
                placeholder="Название цели"
                maxLength={35}
                className="text-center font-semibold bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {editedTitle.length}/35
              </p>
            </div>
          ) : (
            <DialogTitle className="text-lg mb-1 text-center">{goal.title}</DialogTitle>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Status display - hidden in editing mode */}
          {!isEditing && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Статус</span>
              <span
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md"
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
              </span>
            </div>
          )}

          {/* Description */}
          {(isEditing || goal.description) && (
            <div className="mb-4">
              <span className="text-xs font-medium text-muted-foreground block mb-1.5">Описание</span>
              {isEditing ? (
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Опишите вашу мотивацию..."
                  rows={3}
                  className="!field-sizing-fixed resize-none break-words bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
                />
              ) : (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 max-w-full">
                  <div className="max-h-[4.5rem] overflow-y-auto">
                    <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{goal.description}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Deadline */}
          {isEditing ? (
            <div className="mb-4">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Дедлайн
                {(goal.type === "outcome" || goal.type === "hybrid") && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <Input
                type="date"
                value={editedDeadline}
                onChange={(e) => setEditedDeadline(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
              />
            </div>
          ) : goal.periodEnd && (goal.type === "outcome" || goal.type === "hybrid" || goal.type === "process") &&
           (goal.status === "in_progress" || goal.status === "not_started") && (
            <div className="mb-4">
              <DeadlineInfo periodEnd={goal.periodEnd} />
            </div>
          )}

          {progress.type === "outcome" && (
            <OutcomeDetailView goal={goal} progress={progress as OutcomeProgress} isEditing={isEditing} />
          )}
          {progress.type === "process" && (
            <ProcessDetailView goal={goal} progress={progress as ProcessProgress} isEditing={isEditing} />
          )}
          {progress.type === "hybrid" && (
            <HybridDetailView goal={goal} progress={progress as HybridProgress} isEditing={isEditing} />
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
          ) : isEditing ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancelEditing}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave}
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
                onClick={handleStartEditing}
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
