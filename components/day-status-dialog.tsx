"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import type { IncompleteReason } from "@/components/day-review-dialog"
import { useDayStateStore } from "@/lib/stores/day-state-store"
import { getTodayLocalISO } from "@/lib/utils/date"
import type { DayDetailData } from "@/lib/services/stats-cache"
import { removeDayFromCache, getDayFromCache } from "@/lib/services/stats-cache"
import { syncService } from "@/lib/services/sync"
import { toast } from "sonner"
import { cancelEndDayApi } from "@/lib/services/api-client"

type DayStatus = "good" | "average" | "poor" | "bad" | null

type DayStatusDialogProps = {
  open: boolean
  onClose: () => void
  date: string | null
  currentStatus: DayStatus
  onUpdateStatus: (date: string, status: DayStatus) => void
  dayDetail?: DayDetailData | null
  isLoadingDetail?: boolean
}

type Goal = {
  id: string
  title: string
  label?: string
  isAdditionalAdded?: boolean
}

type ReasonData = {
  date?: string  // Optional for API data
  goalId: string
  goalTitle: string
  label?: string
  reason: IncompleteReason
  customReason?: string
  percentReady?: number
  action?: string
  note?: string
}

export function DayStatusDialog({
  open,
  onClose,
  date,
  currentStatus,
  onUpdateStatus,
  dayDetail,
  isLoadingDetail = false
}: DayStatusDialogProps) {
  const isDayEnded = useDayStateStore((state) => state.isDayEnded)
  const cancelDayEnd = useDayStateStore((state) => state.cancelDayEnd)
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([])
  const [incompleteGoals, setIncompleteGoals] = useState<ReasonData[]>([])
  const [distractions, setDistractions] = useState<string | null>(null)
  const [baselineLoadImpact, setBaselineLoadImpact] = useState<number | null>(null)
  const [showIncomplete, setShowIncomplete] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const isSelectedDayEnded = date ? isDayEnded(date) : false

  // Проверяем, является ли выбранный день сегодняшним
  const isToday = date === getTodayLocalISO()

  useEffect(() => {
    if (date) {
      // Priority 1: Use dayDetail from props (loaded from cache in statistics-view)
      if (dayDetail) {
        setCompletedGoals(dayDetail.completedGoals || [])
        setIncompleteGoals((dayDetail.incompleteReasons || []) as ReasonData[])
        setDistractions(dayDetail.distractions || null)
        setBaselineLoadImpact(dayDetail.baselineLoadImpact ?? null)
      } else {
        // Priority 2: Try to get from cache directly
        const cachedDay = getDayFromCache(date)
        if (cachedDay) {
          setCompletedGoals(cachedDay.completedGoals || [])
          setIncompleteGoals((cachedDay.incompleteReasons || []) as ReasonData[])
          setDistractions(cachedDay.distractions || null)
          setBaselineLoadImpact(cachedDay.baselineLoadImpact ?? null)
        } else {
          // No data available
          setCompletedGoals([])
          setIncompleteGoals([])
          setDistractions(null)
          setBaselineLoadImpact(null)
        }
      }

      // Сбрасываем состояния при открытии диалога
      setShowCompleted(false)
      setShowIncomplete(false)
    }
  }, [date, dayDetail])

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

  const getDistractionsLabel = (distractions: string | null) => {
    if (!distractions) return null
    const labels: Record<string, string> = {
      "no": "No distractions",
      "little": "Little distractions",
      "sometimes": "Sometimes distracted",
      "often": "Often distracted",
      "constantly": "Constantly distracted",
    }
    return labels[distractions] || distractions
  }

  const getDistractionsColor = (distractions: string | null) => {
    if (!distractions) return "bg-muted"
    const colors: Record<string, string> = {
      "no": "bg-green-100 text-green-700",
      "little": "bg-green-50 text-green-600",
      "sometimes": "bg-yellow-100 text-yellow-700",
      "often": "bg-orange-100 text-orange-700",
      "constantly": "bg-red-100 text-red-700",
    }
    return colors[distractions] || "bg-muted"
  }

  const getBaselineLoadLabel = (level: number | null) => {
    if (level === null) return null
    const labels: Record<number, string> = {
      0: "Almost no load (day off)",
      1: "Light day",
      2: "Regular workday",
      3: "Heavy day",
      4: "Overloaded day",
    }
    return labels[level] || null
  }

  const getBaselineLoadColor = (level: number | null) => {
    if (level === null) return "bg-muted"
    const colors: Record<number, string> = {
      0: "bg-green-100 text-green-700",
      1: "bg-blue-100 text-blue-700",
      2: "bg-gray-100 text-gray-700",
      3: "bg-orange-100 text-orange-700",
      4: "bg-red-100 text-red-700",
    }
    return colors[level] || "bg-muted"
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
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Day Summary</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4 overflow-y-auto flex-1 scrollbar-hide">
          <p className="text-sm text-muted-foreground">{formattedDate}</p>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading day details...</span>
            </div>
          ) : (
            <>
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

              {baselineLoadImpact !== null && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Workload</h3>
                  <div className={`${getBaselineLoadColor(baselineLoadImpact)} rounded-lg p-3 text-sm font-medium`}>
                    {getBaselineLoadLabel(baselineLoadImpact)}
                  </div>
                </div>
              )}

              {distractions && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Focus Level</h3>
                  <div className={`${getDistractionsColor(distractions)} rounded-lg p-3 text-sm font-medium`}>
                    {getDistractionsLabel(distractions)}
                  </div>
                </div>
              )}

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
                <div className="bg-card border border-border rounded-lg p-3 space-y-2 min-w-0 overflow-x-hidden">
                  {completedGoals.map((goal) => (
                    <div key={goal.id} className="flex items-start gap-2 text-sm min-w-0">
                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-foreground min-w-0 break-words ${goal.isAdditionalAdded ? 'italic' : ''}`}>
                            {goal.title}
                          </span>
                          {goal.label && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
                              {goal.label}
                            </span>
                          )}
                          {goal.isAdditionalAdded && (
                            <span className="text-xs text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full flex-shrink-0">
                              Additional
                            </span>
                          )}
                        </div>
                      </div>
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
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                          <X className="w-3 h-3 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-foreground font-medium min-w-0 break-words">{item.goalTitle}</p>
                            {item.label && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">
                                {item.label}
                              </span>
                            )}
                          </div>
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
            </>
          )}

        </div>

        <div className="flex-shrink-0 pt-4">
          {isSelectedDayEnded && isToday ? (
            <Button
              variant="outline"
              onClick={async () => {
              if (!date || isCancelling) return

              setIsCancelling(true)

              try {
                // STEP 1: Get incomplete goals from cache BEFORE clearing it
                const cachedDay = dayDetail || getDayFromCache(date)
                const incompleteGoalIds = cachedDay?.incompleteReasons?.map(r => r.goalId) || []

                // STEP 2: Call backend to delete the record FIRST
                const deviceId = syncService.getDeviceId()
                const result = await cancelEndDayApi({ date, deviceId })

                if (!result.success) {
                  throw new Error(result.message || 'Failed to cancel day')
                }

                // STEP 3: After successful backend response, execute local logic

                // Remove this day from stats cache (not full clear)
                removeDayFromCache(date)

                // Отменяем завершение дня в локальном стейте (переносит goals обратно в today)
                cancelDayEnd(date, incompleteGoalIds)

                // Очищаем данные в календаре stats
                onUpdateStatus(date, null)

                // Close dialog (no toast on success)
                onClose()
              } catch (error) {
                console.error('[DayStatusDialog] Failed to cancel day:', error)
                toast.error("Failed to cancel day completion")
              } finally {
                setIsCancelling(false)
              }
            }}
            disabled={isCancelling}
            className="w-full bg-red-500 hover:bg-red-600 text-white border-red-500"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>Cancel End Day</>
            )}
          </Button>
        ) : (
          <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
            Close
          </Button>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
