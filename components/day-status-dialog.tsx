"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, X, ChevronDown, ChevronUp } from "lucide-react"
import type { IncompleteReason } from "@/components/day-review-dialog"

type DayStatus = "good" | "average" | "bad" | null

type DayStatusDialogProps = {
  open: boolean
  onClose: () => void
  date: string | null
  currentStatus: DayStatus
  onUpdateStatus: (date: string, status: DayStatus) => void
}

type Goal = {
  id: string
  title: string
  label?: string
}

type ReasonData = {
  date: string
  goalId: string
  goalTitle: string
  reason: IncompleteReason
  customReason?: string
}

export function DayStatusDialog({ open, onClose, date, currentStatus, onUpdateStatus }: DayStatusDialogProps) {
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([])
  const [incompleteGoals, setIncompleteGoals] = useState<ReasonData[]>([])
  const [showIncomplete, setShowIncomplete] = useState(false)

  useEffect(() => {
    if (date) {
      // Load goals for this date
      const dayReviews = JSON.parse(localStorage.getItem("dayReviews") || "[]")
      const reasons: ReasonData[] = JSON.parse(localStorage.getItem("reasons") || "[]")

      // Find review for this date
      const review = dayReviews.find((r: any) => r.date === date)

      if (review && review.completedGoals) {
        setCompletedGoals(review.completedGoals)
      } else {
        setCompletedGoals([])
      }

      // Get incomplete goals with reasons
      const incomplete = reasons.filter((r) => r.date === date)
      setIncompleteGoals(incomplete)
    }
  }, [date])

  if (!date) return null

  const handleStatusChange = (status: DayStatus) => {
    onUpdateStatus(date, status)
  }

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const getReasonLabel = (reason: IncompleteReason) => {
    const labels: Record<IncompleteReason, string> = {
      "no-strength": "No strength",
      "worked-all-day": "Worked all day",
      played: "Played",
      "poor-time-management": "Poor time management",
      other: "Other",
    }
    return labels[reason]
  }

  const getStatusLabel = (status: DayStatus) => {
    switch (status) {
      case "good":
        return "Good Day"
      case "average":
        return "Average Day"
      case "bad":
        return "Bad Day"
      default:
        return "No Status"
    }
  }

  const getStatusColor = (status: DayStatus) => {
    switch (status) {
      case "good":
        return "bg-[rgb(16,185,129)]"
      case "average":
        return "bg-[rgb(251,191,36)]"
      case "bad":
        return "bg-[rgb(239,68,68)]"
      default:
        return "bg-muted"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Day Summary</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">{formattedDate}</p>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Productivity Status</h3>
            <div
              className={`${getStatusColor(currentStatus)} text-white rounded-lg p-4 flex items-center justify-between`}
            >
              <span className="font-semibold">{getStatusLabel(currentStatus)}</span>
              {currentStatus && (
                <button
                  onClick={() => setShowIncomplete(!showIncomplete)}
                  className="text-xs underline hover:no-underline"
                >
                  Change
                </button>
              )}
            </div>

            {showIncomplete && (
              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 bg-[rgb(16,185,129)] hover:bg-[rgb(16,185,129)]/90 border-[rgb(16,185,129)] text-white"
                  onClick={() => {
                    handleStatusChange("good")
                    setShowIncomplete(false)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                      {currentStatus === "good" && <Check className="w-4 h-4" />}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Good Day</div>
                      <div className="text-xs opacity-80">70%+ goals completed</div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 bg-[rgb(251,191,36)] hover:bg-[rgb(251,191,36)]/90 border-[rgb(251,191,36)] text-white"
                  onClick={() => {
                    handleStatusChange("average")
                    setShowIncomplete(false)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                      {currentStatus === "average" && <Check className="w-4 h-4" />}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Average Day</div>
                      <div className="text-xs opacity-80">40-70% goals completed</div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 bg-[rgb(239,68,68)] hover:bg-[rgb(239,68,68)]/90 border-[rgb(239,68,68)] text-white"
                  onClick={() => {
                    handleStatusChange("bad")
                    setShowIncomplete(false)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                      {currentStatus === "bad" && <Check className="w-4 h-4" />}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Bad Day</div>
                      <div className="text-xs opacity-80">Less than 40% completed</div>
                    </div>
                  </div>
                </Button>

                {currentStatus && (
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => {
                      handleStatusChange(null)
                      setShowIncomplete(false)
                    }}
                  >
                    Clear Status
                  </Button>
                )}
              </div>
            )}
          </div>

          {completedGoals.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Completed Goals ({completedGoals.length})
              </h3>
              <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-foreground">{goal.title}</span>
                    {goal.label && (
                      <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {goal.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {incompleteGoals.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowIncomplete(!showIncomplete)}
                className="text-sm font-semibold text-foreground flex items-center gap-2 w-full"
              >
                <X className="w-4 h-4 text-red-600" />
                Incomplete Goals ({incompleteGoals.length})
                {showIncomplete ? (
                  <ChevronUp className="w-4 h-4 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-auto" />
                )}
              </button>
              {showIncomplete && (
                <div className="bg-card border border-border rounded-lg p-3 space-y-3">
                  {incompleteGoals.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                          <X className="w-3 h-3 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground font-medium">{item.goalTitle}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Reason: <span className="font-medium">{getReasonLabel(item.reason)}</span>
                            {item.customReason && <span className="italic"> - {item.customReason}</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {completedGoals.length === 0 && incompleteGoals.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No goals data for this day</p>
            </div>
          )}
        </div>

        <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
