"use client"

import { useMemo, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash2, Calendar, CheckCircle2, AlertTriangle, TrendingDown, XCircle, X, Sparkles } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import type { GlobalGoal, OutcomeProgress, ProcessProgress, HybridProgress } from "@/lib/types"
import { getWeeklyAnalyses, type GlobalGoalAnalysis } from "@/lib/services/ai-cache"
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

// AI Classification config
const AI_CLASSIFICATION_CONFIG: Record<string, {
  icon: typeof CheckCircle2
  bgColor: string
  textColor: string
  borderColor: string
  label: string
}> = {
  on_track: {
    icon: CheckCircle2,
    bgColor: "bg-green-500/5 dark:bg-green-500/10",
    textColor: "text-green-600 dark:text-green-500",
    borderColor: "border-green-500/20",
    label: "На пути к цели"
  },
  at_risk: {
    icon: AlertTriangle,
    bgColor: "bg-yellow-500/5 dark:bg-yellow-500/10",
    textColor: "text-yellow-600 dark:text-yellow-500",
    borderColor: "border-yellow-500/20",
    label: "Под угрозой"
  },
  unlikely: {
    icon: TrendingDown,
    bgColor: "bg-orange-500/5 dark:bg-orange-500/10",
    textColor: "text-orange-600 dark:text-orange-500",
    borderColor: "border-orange-500/20",
    label: "Маловероятно"
  },
  missed: {
    icon: XCircle,
    bgColor: "bg-red-500/5 dark:bg-red-500/10",
    textColor: "text-red-600 dark:text-red-500",
    borderColor: "border-red-500/20",
    label: "Пропущено"
  },
}

function AIBlockingFactorsBlock({ aiData, onDismiss }: { aiData: GlobalGoalAnalysis; onDismiss: () => void }) {
  const config = AI_CLASSIFICATION_CONFIG[aiData.classification]
  if (!config) return null

  const Icon = config.icon
  const hasBlockingFactors = aiData.blocking_factors.length > 0

  return (
    <div className={`mb-4 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.textColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground/60">AI за неделю</span>
              <button
                onClick={onDismiss}
                className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {hasBlockingFactors ? aiData.blocking_factors.join(", ") : "Всё идёт хорошо"}
          </p>
        </div>
      </div>
    </div>
  )
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
  const [aiData, setAiData] = useState<GlobalGoalAnalysis | null>(null)
  const [aiBlockDismissed, setAiBlockDismissed] = useState(false)

  // Reset editing state when goal changes or dialog closes
  useEffect(() => {
    if (!open || !goal) {
      setIsEditing(false)
      setEditedTitle("")
      setEditedDescription("")
      setEditedDeadline("")
      setShowDeleteConfirm(false)
      setAiData(null)
      setAiBlockDismissed(false)
    }
  }, [open, goal?.id])

  // Load AI data for the goal
  useEffect(() => {
    if (!open || !goal) return

    const now = new Date()
    const analyses = getWeeklyAnalyses(now.getFullYear(), now.getMonth() + 1)
    if (analyses.length === 0) {
      setAiData(null)
      return
    }

    // Filter to only weekly analyses (which have global_goals)
    const weeklyAnalyses = analyses.filter(a => a.type === "weekly")
    if (weeklyAnalyses.length === 0) {
      setAiData(null)
      return
    }

    // Find the latest analysis by periodStart
    const latestAnalysis = weeklyAnalyses.sort((a, b) =>
      new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
    )[0]

    // Find AI data for this goal (type narrowing ensures global_goals exists)
    const goalAiData = latestAnalysis.content.analysis.global_goals.find(
      (g) => g.id === goal.id
    )

    setAiData(goalAiData || null)
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
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[75vh] overflow-hidden flex flex-col gap-2 px-6 py-4 top-[15vh] translate-y-0">
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

          {/* AI Analysis Block - only when not editing, not dismissed, and for active goals */}
          {!isEditing && !aiBlockDismissed && aiData && (goal.status === "in_progress" || goal.status === "not_started") && (
            <AIBlockingFactorsBlock aiData={aiData} onDismiss={() => setAiBlockDismissed(true)} />
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
