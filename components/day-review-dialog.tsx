"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, AlertCircle, PartyPopper } from "lucide-react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import type { Goal } from "@/lib/types"
import { useDayStateStore } from "@/lib/stores/day-state-store"
import confetti from "canvas-confetti"
import { getTodayLocalISO } from "@/lib/utils/date"

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        HapticFeedback?: {
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
          selectionChanged: () => void
        }
      }
    }
  }
}

type DayStatus = "good" | "average" | "bad"

export type IncompleteReason = "no-strength" | "worked-all-day" | "played" | "poor-time-management" | "other"

export type TaskAction = "move" | "split" | "not-relevant" | "blocked"

export type DistractionLevel = "no" | "little" | "sometimes" | "often" | "constantly"

type GoalWithDetails = Goal & {
  reason?: IncompleteReason
  customReason?: string
  action?: TaskAction
  percentReady?: number
  note?: string
}

type DayReviewDialogProps = {
  open: boolean
  onClose: () => void
  goals: Goal[]
  onUpdateGoals: (goals: Goal[]) => void
}

export function DayReviewDialog({ open, onClose, goals, onUpdateGoals }: DayReviewDialogProps) {
  const markDayAsEnded = useDayStateStore((state) => state.markDayAsEnded)
  const [localGoals, setLocalGoals] = useState<GoalWithDetails[]>([])
  const [step, setStep] = useState<"confirmation" | "completion" | "summary" | "details" | "focus">("confirmation")
  const [distractionLevel, setDistractionLevel] = useState<DistractionLevel>("little")

  useEffect(() => {
    if (open) {
      setLocalGoals([...goals])
      setStep("confirmation")
      setDistractionLevel("little")
    }
  }, [goals, open])

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
    setLocalGoals(localGoals.map((g) => (g.id === id ? { ...g, percentReady } : g)))
  }

  const setGoalNote = (id: string, note: string) => {
    setLocalGoals(localGoals.map((g) => (g.id === id ? { ...g, note } : g)))
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
        setStep("focus")
      }
    } else if (step === "details") {
      setStep("focus")
    } else if (step === "focus") {
      handleSave()
    }
  }

  const handleSave = () => {
    // Update goals
    onUpdateGoals(localGoals)

    // Calculate and save day status
    const completedCount = localGoals.filter((g) => g.completed).length
    const totalCount = localGoals.length
    const completionRate = totalCount > 0 ? completedCount / totalCount : 0

    let status: DayStatus
    if (completionRate >= 0.7) status = "good"
    else if (completionRate >= 0.4) status = "average"
    else status = "bad"

    // Получаем сегодняшнюю дату в локальном времени
    const today = getTodayLocalISO()
    const incompleteGoals = localGoals.filter((g) => !g.completed)
    const completedGoals = localGoals.filter((g) => g.completed)

    // Save completed goals
    const dayReviews = JSON.parse(localStorage.getItem("dayReviews") || "[]")
    const existingReviewIndex = dayReviews.findIndex((r: any) => r.date === today)
    
    const reviewData = {
      date: today,
      completedGoals: completedGoals.map((g) => ({
        id: g.id,
        title: g.title,
        label: g.label,
      })),
    }
    
    if (existingReviewIndex >= 0) {
      dayReviews[existingReviewIndex] = reviewData
    } else {
      dayReviews.push(reviewData)
    }
    localStorage.setItem("dayReviews", JSON.stringify(dayReviews))

    if (incompleteGoals.length > 0) {
      const reasonsData = JSON.parse(localStorage.getItem("reasons") || "[]")
      incompleteGoals.forEach((goal) => {
        if (goal.reason) {
          reasonsData.push({
            date: today,
            goalId: goal.id,
            goalTitle: goal.title,
            reason: goal.reason,
            customReason: goal.customReason,
            action: goal.action,
            percentReady: goal.percentReady || 0,
            note: goal.note,
          })
        }
      })
      localStorage.setItem("reasons", JSON.stringify(reasonsData))
    }

    const distractionData = JSON.parse(localStorage.getItem("distractions") || "{}")
    distractionData[today] = distractionLevel
    localStorage.setItem("distractions", JSON.stringify(distractionData))

    // Save to calendar
    const calendar = JSON.parse(localStorage.getItem("calendar") || "{}")
    calendar[today] = status
    localStorage.setItem("calendar", JSON.stringify(calendar))

    // Mark today as ended
    markDayAsEnded(today)

    // Close dialog first
    onClose()

    // Show confetti animation and haptic feedback after a small delay
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
    }, 100)
  }

  const completedCount = localGoals.filter((g) => g.completed).length
  const totalCount = localGoals.length
  const incompleteGoals = localGoals.filter((g) => !g.completed)
  const completionRate = totalCount > 0 ? completedCount / totalCount : 0

  let dayStatus: DayStatus
  if (completionRate >= 0.7) dayStatus = "good"
  else if (completionRate >= 0.4) dayStatus = "average"
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
      move: "Move",
      split: "Split",
      "not-relevant": "Not relevant",
      blocked: "Blocked",
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "confirmation" && "End Day"}
            {step === "completion" && "Mark Completed Goals"}
            {step === "summary" && "Day Summary"}
            {step === "details" && "Unfinished Tasks Details"}
            {step === "focus" && "Focus Assessment"}
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
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Mark which goals you completed today:</p>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {localGoals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => toggleGoalCompletion(goal.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    goal.completed ? "bg-primary/10 border-primary" : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                      goal.completed ? "bg-primary border-primary" : "border-border"
                    }`}
                  >
                    {goal.completed && <Check className="w-4 h-4 text-primary-foreground" />}
                  </div>
                  <span
                    className={`flex-1 text-left text-sm ${
                      goal.completed ? "text-foreground font-medium" : "text-foreground"
                    }`}
                  >
                    {goal.title}
                  </span>
                </button>
              ))}
            </div>
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
                      : "bg-red-500/20"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-full ${
                    dayStatus === "good" ? "bg-green-500" : dayStatus === "average" ? "bg-yellow-500" : "bg-red-500"
                  }`}
                />
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">
                {dayStatus === "good" ? "Great Day!" : dayStatus === "average" ? "Good Effort!" : "Keep Going!"}
              </p>
              <p className="text-sm text-muted-foreground">
                You completed {completedCount} out of {totalCount} goals
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
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {incompleteGoals.map((goal, index) => (
              <div key={goal.id} className="space-y-3 pb-4 border-b border-border last:border-0">
                <p className="text-sm font-semibold text-foreground">
                  {index + 1}. {goal.title}
                </p>

                {/* Reason */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Reason *</Label>
                  <RadioGroup
                    value={goal.reason || ""}
                    onValueChange={(value) => setGoalReason(goal.id, value as IncompleteReason)}
                  >
                    {(
                      ["no-strength", "worked-all-day", "played", "poor-time-management", "other"] as IncompleteReason[]
                    ).map((reason) => (
                      <div key={reason} className="flex items-center space-x-2">
                        <RadioGroupItem value={reason} id={`${goal.id}-${reason}`} />
                        <Label htmlFor={`${goal.id}-${reason}`} className="text-sm cursor-pointer">
                          {getReasonLabel(reason)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
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
                  <RadioGroup
                    value={goal.action || ""}
                    onValueChange={(value) => setGoalAction(goal.id, value as TaskAction)}
                  >
                    {(["move", "split", "not-relevant", "blocked"] as TaskAction[]).map((action) => (
                      <div key={action} className="flex items-center space-x-2">
                        <RadioGroupItem value={action} id={`${goal.id}-action-${action}`} />
                        <Label htmlFor={`${goal.id}-action-${action}`} className="text-sm cursor-pointer">
                          {getActionLabel(action)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* % Ready */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">% Ready (optional)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={goal.percentReady || 0}
                      onChange={(e) => setGoalPercentReady(goal.id, Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-16 h-8 text-sm text-center"
                    />
                  </div>
                  <Slider
                    value={[goal.percentReady || 0]}
                    onValueChange={(value) => setGoalPercentReady(goal.id, value[0])}
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
                    className="min-h-[60px] text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {step === "focus" && (
          <div className="py-4 space-y-6">
            <div>
              <p className="text-base font-medium text-foreground mb-2">How often were you distracted today?</p>
              <p className="text-sm text-muted-foreground">Reflect on your focus throughout the day</p>
            </div>

            <div className="space-y-4">
              <RadioGroup
                value={distractionLevel}
                onValueChange={(value) => setDistractionLevel(value as DistractionLevel)}
              >
                {distractionLevels.map((level) => (
                  <div key={level} className="flex items-center space-x-3">
                    <RadioGroupItem value={level} id={`distraction-${level}`} />
                    <Label htmlFor={`distraction-${level}`} className="text-sm cursor-pointer flex-1">
                      {getDistractionLabel(level)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-xs text-muted-foreground">
                  {distractionLevel === "no" && "Excellent focus! You stayed on track throughout the day."}
                  {distractionLevel === "little" && "Great job! Minor distractions are normal."}
                  {distractionLevel === "sometimes" && "Good effort. Consider strategies to minimize distractions."}
                  {distractionLevel === "often" && "Try to identify and eliminate common distractions."}
                  {distractionLevel === "constantly" && "Consider reviewing your environment and work habits."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          {step !== "confirmation" && step !== "completion" && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === "summary") setStep("completion")
                else if (step === "details") setStep("summary")
                else if (step === "focus") {
                  if (incompleteGoals.length > 0) setStep("details")
                  else setStep("summary")
                }
              }}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleContinue}
            className="flex-1"
            disabled={
              step === "details" &&
              incompleteGoals.some((g) => !g.reason || (g.reason === "other" && !g.customReason?.trim()) || !g.action)
            }
          >
            {step === "confirmation" && "Start Review"}
            {step === "completion" && "Continue"}
            {step === "summary" && (incompleteGoals.length > 0 ? "Continue" : "Next")}
            {step === "details" && "Continue"}
            {step === "focus" && "Finish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
