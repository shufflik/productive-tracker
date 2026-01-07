"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Focus,
  Target
} from "lucide-react"
import {
  getMonthlyAnalysis,
  getWeeklyAnalysesForMonth,
  type AIAnalysisData,
  type GlobalGoalAnalysis,
  type LoadAnalysis
} from "@/lib/services/ai-cache"
import { submitAIFeedbackApi } from "@/lib/services/api-client"

type AIStatsDialogProps = {
  open: boolean
  onClose: () => void
  year: number
  month: number
}

export function AIStatsDialog({ open, onClose, year, month }: AIStatsDialogProps) {
  const [monthlyData, setMonthlyData] = useState<AIAnalysisData | null>(null)
  const [weeklyDataList, setWeeklyDataList] = useState<AIAnalysisData[]>([])
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open) {
      const monthly = getMonthlyAnalysis(year, month)
      const weekly = getWeeklyAnalysesForMonth(year, month)
      setMonthlyData(monthly)
      setWeeklyDataList(weekly)
      setSelectedWeekId(null)
      setExpandedSections({})
    }
  }, [open, year, month])

  const handleWeekClick = (weekId: string) => {
    if (selectedWeekId === weekId) {
      setSelectedWeekId(null)
    } else {
      setSelectedWeekId(weekId)
    }
  }

  const handleFeedback = async (analysisId: string, isUseful: boolean) => {
    if (feedbackSubmitted[analysisId]) return

    try {
      await submitAIFeedbackApi({ analysisId, isUseful })
      setFeedbackSubmitted(prev => ({ ...prev, [analysisId]: true }))
    } catch (error) {
      console.error('[AIStatsDialog] Failed to submit feedback:', error)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getClassificationIcon = (classification: GlobalGoalAnalysis["classification"]) => {
    switch (classification) {
      case "on_track":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case "at_risk":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case "unlikely":
        return <TrendingDown className="w-4 h-4 text-orange-500" />
      case "missed":
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getClassificationLabel = (classification: GlobalGoalAnalysis["classification"]) => {
    switch (classification) {
      case "on_track": return "On Track"
      case "at_risk": return "At Risk"
      case "unlikely": return "Unlikely"
      case "missed": return "Missed"
    }
  }

  const getClassificationColor = (classification: GlobalGoalAnalysis["classification"]) => {
    switch (classification) {
      case "on_track": return "bg-green-100 text-green-700"
      case "at_risk": return "bg-yellow-100 text-yellow-700"
      case "unlikely": return "bg-orange-100 text-orange-700"
      case "missed": return "bg-red-100 text-red-700"
    }
  }

  const getLoadLevelColor = (level: LoadAnalysis["level"]) => {
    switch (level) {
      case "sustainable": return "bg-green-100 text-green-700"
      case "elevated": return "bg-yellow-100 text-yellow-700"
      case "critical": return "bg-red-100 text-red-700"
    }
  }

  const getLoadLevelLabel = (level: LoadAnalysis["level"]) => {
    switch (level) {
      case "sustainable": return "Sustainable"
      case "elevated": return "Elevated"
      case "critical": return "Critical"
    }
  }

  const formatDateRange = (periodStart: string, periodEnd: string) => {
    const start = new Date(periodStart + 'T00:00:00')
    const end = new Date(periodEnd + 'T00:00:00')
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${formatDate(start)} - ${formatDate(end)}`
  }

  // Calculate week number within the month based on periodStart
  const getWeekNumberInMonth = (periodStart: string, targetMonth: number) => {
    const startDate = new Date(periodStart + 'T00:00:00')

    // Use the target month to find the first day
    const targetYear = startDate.getMonth() + 1 === targetMonth ? startDate.getFullYear()
      : (targetMonth === 1 && startDate.getMonth() === 11) ? startDate.getFullYear() + 1
      : startDate.getFullYear()

    const firstOfMonth = new Date(targetYear, targetMonth - 1, 1)

    // Find Monday of the first week that includes days of this month
    const firstDayOfWeek = firstOfMonth.getDay()
    const daysToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek
    const firstMonday = new Date(firstOfMonth)
    firstMonday.setDate(firstOfMonth.getDate() + daysToMonday)

    // Calculate week number
    const msPerWeek = 7 * 24 * 60 * 60 * 1000
    const weeksDiff = Math.floor((startDate.getTime() - firstMonday.getTime()) / msPerWeek)
    return weeksDiff + 1
  }

  const renderAnalysisContent = (data: AIAnalysisData, prefix: string) => {
    const { analysis, message } = data.content

    return (
      <div className="space-y-3">
        {/* Message Section */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection(`${prefix}-message`)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Summary
            </span>
            {expandedSections[`${prefix}-message`] ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {expandedSections[`${prefix}-message`] && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
              <div>
                <span className="font-medium text-foreground">Review: </span>
                <span className="text-muted-foreground">{message.review}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Assessment: </span>
                <span className="text-muted-foreground">{message.assessment}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Recommendation: </span>
                <span className="text-muted-foreground">{message.recommendation}</span>
              </div>
            </div>
          )}
        </div>

        {/* Global Goals Section */}
        {analysis.global_goals.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => toggleSection(`${prefix}-goals`)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                Goals Analysis ({analysis.global_goals.length})
              </span>
              {expandedSections[`${prefix}-goals`] ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {expandedSections[`${prefix}-goals`] && (
              <div className="space-y-2">
                {analysis.global_goals.map((goal) => (
                  <div key={goal.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground flex-1">{goal.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${getClassificationColor(goal.classification)}`}>
                        {getClassificationIcon(goal.classification)}
                        {getClassificationLabel(goal.classification)}
                      </span>
                    </div>
                    {goal.blocking_factors.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Blocking factors: </span>
                        {goal.blocking_factors.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Focus Section */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection(`${prefix}-focus`)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Focus className="w-4 h-4 text-indigo-500" />
              Focus
            </span>
            {expandedSections[`${prefix}-focus`] ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {expandedSections[`${prefix}-focus`] && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              {analysis.focus.shift_detected ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium text-foreground">Focus shift detected</span>
                  </div>
                  {analysis.focus.cause && (
                    <p className="text-muted-foreground">
                      Cause: <span className="capitalize">{analysis.focus.cause}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-muted-foreground">No focus shift detected</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Load Section */}
        <div className="space-y-2">
          <button
            onClick={() => toggleSection(`${prefix}-load`)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-pink-500" />
              Workload
            </span>
            {expandedSections[`${prefix}-load`] ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {expandedSections[`${prefix}-load`] && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs ${getLoadLevelColor(analysis.load.level)}`}>
                  {getLoadLevelLabel(analysis.load.level)}
                </span>
              </div>
              {analysis.load.signals.length > 0 && (
                <div className="text-muted-foreground">
                  <span className="font-medium">Signals: </span>
                  {analysis.load.signals.join(", ")}
                </div>
              )}
              {analysis.load.action && (
                <div className="text-muted-foreground">
                  <span className="font-medium">Recommended action: </span>
                  {analysis.load.action}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Section - only show if not already submitted */}
        {data.isUseful === null && !feedbackSubmitted[data.id] && (
          <div className="flex items-center justify-center gap-4 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Was this helpful?</span>
            <button
              onClick={() => handleFeedback(data.id, true)}
              className="p-1.5 rounded-full hover:bg-green-100 transition-colors"
            >
              <ThumbsUp className="w-4 h-4 text-muted-foreground hover:text-green-600" />
            </button>
            <button
              onClick={() => handleFeedback(data.id, false)}
              className="p-1.5 rounded-full hover:bg-red-100 transition-colors"
            >
              <ThumbsDown className="w-4 h-4 text-muted-foreground hover:text-red-600" />
            </button>
          </div>
        )}
      </div>
    )
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 py-4">
          {/* Monthly Analysis Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Monthly - {monthName}
            </h3>
            {monthlyData ? (
              renderAnalysisContent(monthlyData, 'monthly')
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                No monthly analysis available
              </div>
            )}
          </div>

          {/* Weekly Analysis List */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground">Weekly Analysis</h3>
            {weeklyDataList.length > 0 ? (
              <div className="space-y-2">
                {weeklyDataList.map((weekData) => {
                  const isSelected = selectedWeekId === weekData.id
                  const weekNumber = getWeekNumberInMonth(weekData.periodStart, month)

                  return (
                    <div key={weekData.id}>
                      <button
                        onClick={() => handleWeekClick(weekData.id)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-border hover:border-purple-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">Week {weekNumber}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatDateRange(weekData.periodStart, weekData.periodEnd)}
                            </span>
                          </div>
                          {isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {/* Selected Week Details */}
                      {isSelected && (
                        <div className="mt-2 p-3 bg-muted/20 rounded-lg border border-purple-500/20">
                          {renderAnalysisContent(weekData, `weekly-${weekData.id}`)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                No weekly analysis available
              </div>
            )}
          </div>
        </div>

        <Button variant="outline" onClick={onClose} className="w-full bg-transparent flex-shrink-0">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
