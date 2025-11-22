"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, AlertCircle, Plus, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Goal } from "@/lib/types"
import { useDayStateStore } from "@/lib/stores/day-state-store"
import confetti from "canvas-confetti"
import { getTodayLocalISO } from "@/lib/utils/date"
import { syncService } from "@/lib/services/sync"
import { clearStatsCache } from "@/lib/services/stats-cache"
import { toast } from "sonner"
import { endDayApi } from "@/lib/services/api-client"
import { generateId } from "@/lib/utils/id"

type DayStatus = "good" | "average" | "poor" | "bad"

export type IncompleteReason = "no-strength" | "worked-all-day" | "played" | "poor-time-management" | "other"

export type TaskAction = "backlog" | "tomorrow" | "not-relevant" | "today"

export type DistractionLevel = "no" | "little" | "sometimes" | "often" | "constantly"

type GoalWithDetails = Goal & {
  reason?: IncompleteReason
  customReason?: string
  action?: TaskAction
  percentReady?: number
  note?: string
  isAdditionalAdded?: boolean // Флаг для дополнительно добавленных задач
}

type DayReviewDialogProps = {
  open: boolean
  onClose: () => void
  goals: Goal[]
  onUpdateGoals: (goals: Goal[]) => void
  date?: string // Опциональная дата для пропущенных дней, если не передана - используется текущая
  allowCancel?: boolean // Разрешить ли закрытие диалога (для пропущенных дней = false)
}

export function DayReviewDialog({ open, onClose, goals, onUpdateGoals, date, allowCancel = true }: DayReviewDialogProps) {
  const markDayAsEnded = useDayStateStore((state) => state.markDayAsEnded)
  const [localGoals, setLocalGoals] = useState<GoalWithDetails[]>([])
  const [step, setStep] = useState<"confirmation" | "completion" | "summary" | "details" | "retro">("confirmation")
  const [distractionLevel, setDistractionLevel] = useState<DistractionLevel | "">("")
  const [dayReflection, setDayReflection] = useState<string>("")
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskLabel, setNewTaskLabel] = useState("")

  useEffect(() => {
    if (open) {
      // Восстанавливаем percentReady из meta.percent, если оно есть
      const goalsWithRestoredPercent = goals.map((g) => ({
        ...g,
        percentReady: g.meta?.percent !== undefined ? g.meta.percent : undefined,
      }))
      setLocalGoals(goalsWithRestoredPercent)
      setStep("confirmation")
      setDistractionLevel("")
      setDayReflection("")
      setShowAddTaskDialog(false)
      setNewTaskTitle("")
      setNewTaskLabel("")

      // Stop polling when dialog opens (Step 1: Confirmation)
      syncService.stopPolling()
      console.log('[DayReview] Polling stopped')
    }

    // Cleanup: resume polling when dialog closes (regardless of how it closes)
    return () => {
      if (open) {
        syncService.startPolling()
        console.log('[DayReview] Polling resumed (cleanup)')
      }
    }
  }, [open, goals])

  const toggleGoalCompletion = (id: string) => {
    setLocalGoals(
      localGoals.map((g) =>
        g.id === id
          ? {
              ...g,
              completed: !g.completed,
              reason: undefined,
              customReason: undefined,
              action: undefined,
              percentReady: undefined,
              note: undefined,
            }
          : g,
      ),
    )
  }

  const setGoalReason = (id: string, reason: IncompleteReason) => {
    setLocalGoals(
      localGoals.map((g) =>
        g.id === id ? { ...g, reason, customReason: reason === "other" ? g.customReason : undefined } : g,
      ),
    )
  }

  const setGoalCustomReason = (id: string, customReason: string) => {
    setLocalGoals(localGoals.map((g) => (g.id === id ? { ...g, customReason } : g)))
  }

  const setGoalAction = (id: string, action: TaskAction) => {
    setLocalGoals(localGoals.map((g) => (g.id === id ? { ...g, action } : g)))
  }

  const setGoalPercentReady = (id: string, percentReady: number) => {
    setLocalGoals(
      localGoals.map((g) => {
        if (g.id === id) {
          // Если у goal есть meta.percent, запрещаем уменьшение значения
          const minPercent = g.meta?.percent !== undefined ? g.meta.percent : 0
          const newPercent = Math.max(minPercent, percentReady)
          return { ...g, percentReady: newPercent }
        }
        return g
      })
    )
  }

  const setGoalNote = (id: string, note: string) => {
    setLocalGoals(localGoals.map((g) => (g.id === id ? { ...g, note } : g)))
  }

  const handleAddAdditionalTask = () => {
    if (!newTaskTitle.trim() || !newTaskLabel.trim()) return

    const reviewDate = date || getTodayLocalISO()
    const reviewDateAsDateString = new Date(reviewDate + "T00:00:00").toDateString()

    const newGoal: GoalWithDetails = {
      id: generateId(),
      title: newTaskTitle.trim(),
      label: newTaskLabel.trim().toUpperCase(),
      completed: true, // Дополнительные задачи всегда выполнены
      targetDate: reviewDateAsDateString,
      isAdditionalAdded: true, // Помечаем как дополнительно добавленную
      _version: 0,
    }

    setLocalGoals([...localGoals, newGoal])
    setNewTaskTitle("")
    setNewTaskLabel("")
    setShowAddTaskDialog(false)
  }

  const handleRemoveAdditionalTask = (id: string) => {
    setLocalGoals(localGoals.filter((g) => g.id !== id))
  }

  const handleContinue = () => {
    if (step === "confirmation") {
      setStep("completion")
    } else if (step === "completion") {
      setStep("summary")
    } else if (step === "summary") {
      const incompleteGoals = localGoals.filter((g) => !g.completed)
      if (incompleteGoals.length > 0) {
        setStep("details")
      } else {
        setStep("retro")
      }
    } else if (step === "details") {
      setStep("retro")
    } else if (step === "retro") {
      handleSave()
    }
  }

  const handleSave = async () => {
    try {
      // Calculate day status
      const completedCount = localGoals.filter((g) => g.completed).length
      const totalCount = localGoals.length
      const completionRate = totalCount > 0 ? completedCount / totalCount : 0

      let status: DayStatus
      if (completionRate >= 0.7) status = "good"
      else if (completionRate >= 0.4) status = "average"
      else if (completionRate >= 0.2) status = "poor"
      else status = "bad"

      // Используем переданную дату или текущую
      const reviewDate = date || getTodayLocalISO()
      const incompleteGoals = localGoals.filter((g) => !g.completed)
      const completedGoals = localGoals.filter((g) => g.completed)

      // Prepare request data for backend
      const requestData = {
        date: reviewDate,
        completedGoals: completedGoals.map((g) => ({
          id: g.id,
          title: g.title,
          label: g.label || "",
          isAdditionalAdded: g.isAdditionalAdded || false,
        })),
        dayStatus: status,
        distractions: distractionLevel as DistractionLevel,
        dayReflection: dayReflection.trim(),
        incompleteReasons: incompleteGoals
          .filter((g) => g.reason)
          .map((g) => ({
            goalId: g.id,
            goalTitle: g.title,
            label: g.label ?? "",
            reason: g.reason!,
            customReason: g.customReason,
            action: g.action!,
            percentReady: g.percentReady || 0,
            note: g.note,
          })),
        deviceId: syncService.getDeviceId(),
      }

      // POST to backend
      const data = await endDayApi(requestData)

      if (data.success || data.error === 'DAY_ALREADY_ENDED') {
        // Success (or already ended - same UX)

        // Подготавливаем goals с meta для incomplete goals
        const originalGoals = localGoals
          .filter((g) => !g.isAdditionalAdded)
          .map((goal) => {
            // Добавляем meta только для incomplete goals
            if (!goal.completed) {
              const isPostponed = goal.action === "tomorrow" || goal.action === "today" || goal.action === "backlog"
              const percent = goal.percentReady || 0
              
              // delta - изменение процента готовности
              // Если у goal уже есть meta, вычисляем разницу между старым и новым percent
              // Если meta нет, delta = percent (первое создание)
              let delta: number
              if (goal.meta && goal.meta.percent !== undefined) {
                const oldPercent = goal.meta.percent
                delta = percent - oldPercent
              } else {
                delta = percent
              }

              return {
                ...goal,
                meta: {
                  percent,
                  delta,
                  isPostponed,
                }
              }
            }
            return goal
          })

        onUpdateGoals(originalGoals)

        // Mark day as ended locally
        markDayAsEnded(reviewDate)

        // Clear stats cache
        clearStatsCache()

        // Resume polling
        syncService.startPolling()

        // Close dialog
        onClose()

        // Show success feedback
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#16a34a', '#15803d', '#84cc16', '#eab308']
          })

          // Haptic feedback for success in Telegram
          if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
          }

          // Different message for already ended
          if (data.error === 'DAY_ALREADY_ENDED') {
            toast.info("Day was already completed on another device")
          }
        }, 100)

      } else {
        // Unexpected error
        toast.error(data.message || "Failed to save day review")
        syncService.startPolling()  // Resume polling on error
      }

    } catch (error) {
      console.error("[DayReview] End day error:", error)
      toast.error("Network error. Please try again.")
      syncService.startPolling()  // Resume polling on error
    }
  }

  const completedCount = localGoals.filter((g) => g.completed).length
  const totalCount = localGoals.length
  const incompleteGoals = localGoals.filter((g) => !g.completed)
  const completionRate = totalCount > 0 ? completedCount / totalCount : 0

  let dayStatus: DayStatus
  if (completionRate >= 0.7) dayStatus = "good"
  else if (completionRate >= 0.4) dayStatus = "average"
  else if (completionRate >= 0.2) dayStatus = "poor"
  else dayStatus = "bad"

  const getReasonLabel = (reason: IncompleteReason) => {
    const labels: Record<IncompleteReason, string> = {
      "no-strength": "I did not have the strength",
      "worked-all-day": "I worked all day",
      played: "I played",
      "poor-time-management": "I did not organize the time correctly",
      other: "Something else",
    }
    return labels[reason]
  }

  const getActionLabel = (action: TaskAction) => {
    const labels: Record<TaskAction, string> = {
      backlog: "Move to backlog",
      tomorrow: "Move to Tomorrow",
      "not-relevant": "Not relevant",
      today: "Move to Today",
    }
    return labels[action]
  }

  const getDistractionLabel = (level: DistractionLevel) => {
    const labels: Record<DistractionLevel, string> = {
      no: "No",
      little: "A little",
      sometimes: "Sometimes",
      often: "Often",
      constantly: "Constantly",
    }
    return labels[level]
  }

  const distractionLevels: DistractionLevel[] = ["no", "little", "sometimes", "often", "constantly"]

  // Форматируем дату для отображения
  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null

  // Handle dialog close - resume polling
  const handleDialogClose = () => {
    syncService.startPolling()
    console.log('[DayReview] Polling resumed (dialog closed)')
    onClose()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={allowCancel ? handleDialogClose : undefined}>
      <DialogContent className="max-w-[90%] sm:max-w-md" showCloseButton={allowCancel}>
        <DialogHeader>
          <DialogTitle>
            {step === "confirmation" && (date ? `End Day - ${formattedDate}` : "End Day")}
            {step === "completion" && "Mark Completed Goals"}
            {step === "summary" && "Day Summary"}
            {step === "details" && "Unfinished Tasks Details"}
            {step === "retro" && "Day Retrospective"}
          </DialogTitle>
        </DialogHeader>

        {step === "confirmation" && (
          <div className="py-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">Are you ready to end the current day?</p>
              <p className="text-sm text-muted-foreground">
                You'll review your goals and reflect on today's productivity.
              </p>
            </div>
          </div>
        )}

        {step === "completion" && (
          <div className="py-4 space-y-4 min-w-0 overflow-x-hidden">
            <p className="text-sm text-muted-foreground">Mark which goals you completed today:</p>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto overflow-x-hidden min-w-0">
              {localGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors min-w-0 ${
                    goal.completed ? "bg-primary/10 border-primary" : "bg-card border-border"
                  }`}
                >
                  {!goal.isAdditionalAdded ? (
                    <button
                      onClick={() => toggleGoalCompletion(goal.id)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                          goal.completed ? "bg-primary border-primary" : "border-border"
                        }`}
                      >
                        {goal.completed && <Check className="w-4 h-4 text-primary-foreground" />}
                      </div>
                      <span
                        className={`flex-1 text-left text-sm min-w-0 break-words ${
                          goal.completed ? "text-foreground font-medium" : "text-foreground"
                        }`}
                      >
                        {goal.title}
                      </span>
                    </button>
                  ) : (
                    <>
                      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-primary border-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <span className="flex-1 text-left text-sm text-foreground font-medium min-w-0 break-words">
                        {goal.title}
                      </span>
                      <button
                        onClick={() => handleRemoveAdditionalTask(goal.id)}
                        className="flex-shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove task"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Кнопка добавления дополнительной задачи - только для автоматического закрытия */}
            {!allowCancel && (
              <div className="pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowAddTaskDialog(true)}
                  className="w-full bg-transparent"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Additional Completed Task
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "summary" && (
          <div className="py-4 space-y-6">
            <div className="text-center">
              <div
                className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  dayStatus === "good"
                    ? "bg-green-500/20"
                    : dayStatus === "average"
                      ? "bg-yellow-500/20"
                      : dayStatus === "poor"
                        ? "bg-orange-500/20"
                        : "bg-red-500/20"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-full ${
                    dayStatus === "good" 
                      ? "bg-green-500" 
                      : dayStatus === "average" 
                        ? "bg-yellow-500" 
                        : dayStatus === "poor"
                          ? "bg-orange-500"
                          : "bg-red-500"
                  }`}
                />
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">
                {dayStatus === "good" 
                  ? "Great Day!" 
                  : dayStatus === "average" 
                    ? "Good Effort!" 
                    : dayStatus === "poor"
                      ? "Keep Trying!"
                      : "Keep Going!"}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-lg font-bold text-primary">{Math.round(completionRate * 100)}%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${completionRate * 100}%`,
                    backgroundColor:
                      dayStatus === "good"
                        ? "rgb(34 197 94)"
                        : dayStatus === "average"
                          ? "rgb(234 179 8)"
                          : dayStatus === "poor"
                            ? "rgb(249 115 22)"
                            : "rgb(239 68 68)",
                  }}
                />
              </div>
            </div>

            {incompleteGoals.length > 0 && (
              <Button variant="outline" className="w-full bg-transparent" onClick={() => setStep("details")}>
                <AlertCircle className="w-4 h-4 mr-2" />
                Review {incompleteGoals.length} Unfinished Task{incompleteGoals.length > 1 ? "s" : ""}
              </Button>
            )}
          </div>
        )}

        {step === "details" && (
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
            {incompleteGoals.map((goal, index) => {
              // Проверяем, является ли этот день пропущенным 2 дня назад
              const today = getTodayLocalISO()
              const reviewDate = date || today
              const daysDiff = Math.floor(
                (new Date(today + "T00:00:00").getTime() - new Date(reviewDate + "T00:00:00").getTime()) / 
                (1000 * 60 * 60 * 24)
              )
              const isTomorrowDisabled = daysDiff >= 2

              return (
                <div key={goal.id} className="space-y-3 pb-4 border-b border-border last:border-0">
                  <p className="text-sm font-semibold text-foreground">
                    {index + 1}. {goal.title}
                  </p>

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Reason *</Label>
                    <Select
                      value={goal.reason || ""}
                      onValueChange={(value) => setGoalReason(goal.id, value as IncompleteReason)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          ["no-strength", "worked-all-day", "played", "poor-time-management", "other"] as IncompleteReason[]
                        ).map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {getReasonLabel(reason)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {goal.reason === "other" && (
                      <Textarea
                        placeholder="Please describe your reason..."
                        value={goal.customReason || ""}
                        onChange={(e) => setGoalCustomReason(goal.id, e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                    )}
                  </div>

                  {/* Action */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Action *</Label>
                    <Select
                      value={goal.action || ""}
                      onValueChange={(value) => setGoalAction(goal.id, value as TaskAction)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select action..." />
                      </SelectTrigger>
                      <SelectContent>
                        {date && (
                          <SelectItem value="today">{getActionLabel("today")}</SelectItem>
                        )}
                        <SelectItem value="backlog">{getActionLabel("backlog")}</SelectItem>
                        <SelectItem value="tomorrow" disabled={isTomorrowDisabled}>
                          {getActionLabel("tomorrow")}
                          {isTomorrowDisabled && " (not available)"}
                        </SelectItem>
                        <SelectItem value="not-relevant">{getActionLabel("not-relevant")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* % Ready */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">% Ready (optional)</Label>
                      <Input
                        type="number"
                        min={goal.meta?.percent !== undefined ? goal.meta.percent : 0}
                        max="100"
                        value={goal.percentReady || 0}
                        onChange={(e) => setGoalPercentReady(goal.id, Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="w-16 h-8 text-sm text-center"
                      />
                    </div>
                    {goal.meta?.percent !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        Minimum: {goal.meta.percent}% (cannot be decreased)
                      </p>
                    )}
                    <Slider
                      value={[goal.percentReady || 0]}
                      onValueChange={(value) => setGoalPercentReady(goal.id, value[0])}
                      min={goal.meta?.percent !== undefined ? goal.meta.percent : 0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Note */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Note (optional)</Label>
                    <Textarea
                      placeholder="Add any additional notes..."
                      value={goal.note || ""}
                      onChange={(e) => setGoalNote(goal.id, e.target.value)}
                      className="min-h-[60px] max-h-[120px] text-sm overflow-y-auto overflow-x-hidden resize-none break-words"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {step === "retro" && (
          <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <div className="space-y-4">
              {/* Focus Assessment */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">How often were you distracted today? *</Label>
                <Select
                  value={distractionLevel || undefined}
                  onValueChange={(value) => setDistractionLevel(value as DistractionLevel)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select distraction level..." />
                  </SelectTrigger>
                  <SelectContent>
                    {distractionLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {getDistractionLabel(level)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {distractionLevel && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      {distractionLevel === "no" && "Excellent focus! You stayed on track throughout the day."}
                      {distractionLevel === "little" && "Great job! Minor distractions are normal."}
                      {distractionLevel === "sometimes" && "Good effort. Consider strategies to minimize distractions."}
                      {distractionLevel === "often" && "Try to identify and eliminate common distractions."}
                      {distractionLevel === "constantly" && "Consider reviewing your environment and work habits."}
                    </p>
                  </div>
                )}
              </div>

              {/* Day Reflection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">How did your day go? *</Label>
                <Textarea
                  placeholder="Share your thoughts about today, what went well, what could be improved..."
                  value={dayReflection}
                  onChange={(e) => setDayReflection(e.target.value)}
                  className="min-h-[120px] max-h-[200px] text-sm overflow-y-auto overflow-x-hidden resize-none break-words"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 min-w-0 overflow-x-hidden">
          {allowCancel && (
            <Button variant="outline" onClick={handleDialogClose} className="flex-1 bg-transparent min-w-0">
              Cancel
            </Button>
          )}
          {step !== "confirmation" && step !== "completion" && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === "summary") setStep("completion")
                else if (step === "details") setStep("summary")
                else if (step === "retro") {
                  if (incompleteGoals.length > 0) setStep("details")
                  else setStep("summary")
                }
              }}
              className="flex-1 min-w-0"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleContinue}
            className="flex-1 min-w-0"
            disabled={
              (step === "details" &&
                incompleteGoals.some((g) => !g.reason || (g.reason === "other" && !g.customReason?.trim()) || !g.action)) ||
              (step === "retro" && (!dayReflection.trim() || !distractionLevel))
            }
          >
            {step === "confirmation" && "Start Review"}
            {step === "completion" && "Continue"}
            {step === "summary" && (incompleteGoals.length > 0 ? "Continue" : "Next")}
            {step === "details" && "Continue"}
            {step === "retro" && "Finish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Диалог добавления дополнительной задачи */}
    {!allowCancel && (
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent className="max-w-[90%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Additional Completed Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="additional-task-title">
                Task Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="additional-task-title"
                placeholder="Enter task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                maxLength={50}
                onKeyDown={(e) => e.key === "Enter" && newTaskLabel.trim() && handleAddAdditionalTask()}
              />
              <p className="text-xs text-muted-foreground">
                {newTaskTitle.length}/50 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-task-label">
                Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="additional-task-label"
                placeholder="Enter label..."
                value={newTaskLabel}
                onChange={(e) => setNewTaskLabel(e.target.value)}
                maxLength={25}
                onKeyDown={(e) => e.key === "Enter" && newTaskTitle.trim() && handleAddAdditionalTask()}
              />
              <p className="text-xs text-muted-foreground">
                {newTaskLabel.length}/25 characters
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddTaskDialog(false)
                setNewTaskTitle("")
                setNewTaskLabel("")
              }}
              className="flex-1 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAdditionalTask}
              disabled={!newTaskTitle.trim() || !newTaskLabel.trim()}
              className="flex-1"
            >
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  )
}
