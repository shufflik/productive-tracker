"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, X, ChevronDown, ChevronUp } from "lucide-react"
import type { IncompleteReason } from "@/components/day-review-dialog"
import { useDayStateStore } from "@/lib/stores/day-state-store"
import { getTodayLocalISO } from "@/lib/utils/date"

type DayStatus = "good" | "average" | "poor" | "bad" | null

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
  percentReady?: number
}

export function DayStatusDialog({ open, onClose, date, currentStatus, onUpdateStatus }: DayStatusDialogProps) {
  const isDayEnded = useDayStateStore((state) => state.isDayEnded)
  const cancelDayEnd = useDayStateStore((state) => state.cancelDayEnd)
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([])
  const [incompleteGoals, setIncompleteGoals] = useState<ReasonData[]>([])
  const [showIncomplete, setShowIncomplete] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  
  const isSelectedDayEnded = date ? isDayEnded(date) : false
  
  // Проверяем, является ли выбранный день сегодняшним
  const isToday = date === getTodayLocalISO()

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
      
      // Сбрасываем состояния при открытии диалога
      setShowCompleted(false)
      setShowIncomplete(false)
    }
  }, [date])

  if (!date) return null

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
      case "poor":
        return "Poor Day"
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
      case "poor":
        return "bg-[rgb(249,115,22)]"
      case "bad":
        return "bg-[rgb(239,68,68)]"
      default:
        return "bg-muted"
    }
  }

  // Calculate productivity percentage
  const totalGoals = completedGoals.length + incompleteGoals.length
  const productivityPercentage = totalGoals > 0 
    ? Math.round((completedGoals.length / totalGoals) * 100) 
    : 0

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
              {totalGoals > 0 && (
                <span className="text-sm font-medium opacity-90">{productivityPercentage}%</span>
              )}
            </div>
          </div>

          {completedGoals.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="text-sm font-semibold text-foreground flex items-center gap-2 w-full"
              >
                <Check className="w-4 h-4 text-green-600" />
                Completed Goals ({completedGoals.length})
                {showCompleted ? (
                  <ChevronUp className="w-4 h-4 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-auto" />
                )}
              </button>
              {showCompleted && (
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
              )}
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
                    <div key={index} className="space-y-2">
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
                      {item.percentReady !== undefined && item.percentReady > 0 && (
                        <div className="ml-6 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Progress</span>
                            <span className="text-xs font-medium text-foreground">{item.percentReady}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all bg-[rgb(249,115,22)]"
                              style={{
                                width: `${item.percentReady}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
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

        {isSelectedDayEnded ? (
          <Button 
            variant="outline" 
            onClick={() => {
              if (date) {
                // Отменяем завершение дня
                cancelDayEnd(date)
                
                // Очищаем данные в календаре stats
                onUpdateStatus(date, null)
                
                // Очищаем dayReviews для этого дня
                const dayReviews = JSON.parse(localStorage.getItem("dayReviews") || "[]")
                const filteredReviews = dayReviews.filter((r: any) => r.date !== date)
                localStorage.setItem("dayReviews", JSON.stringify(filteredReviews))
                
                // Очищаем reasons для этого дня
                const reasons = JSON.parse(localStorage.getItem("reasons") || "[]")
                const filteredReasons = reasons.filter((r: any) => r.date !== date)
                localStorage.setItem("reasons", JSON.stringify(filteredReasons))
                
                // Очищаем distractions для этого дня
                const distractions = JSON.parse(localStorage.getItem("distractions") || "{}")
                delete distractions[date]
                localStorage.setItem("distractions", JSON.stringify(distractions))
              }
              onClose()
            }} 
            disabled={!isToday}
            className={`w-full ${isToday ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : 'bg-muted text-muted-foreground border-muted cursor-not-allowed'}`}
          >
            Cancel End Day {!isToday && "(Only Today)"}
          </Button>
        ) : (
          <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
            Close
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
