"use client"

import { useState, useEffect } from "react"
import { Sparkles, AlertTriangle, AlertCircle, CheckCircle, Brain, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  getWeeklyAnalyses,
  type LoadAnalysis,
  type FocusAnalysis,
} from "@/lib/services/ai-cache"

type AIInsightData = {
  load: LoadAnalysis
  focus: FocusAnalysis
  periodStart: string
  periodEnd: string
}

// Check if we should show the AI insight button
function shouldShowInsight(data: AIInsightData | null): boolean {
  if (!data) return false

  const hasLoadIssue = data.load.level === "elevated" || data.load.level === "critical"
  const hasFocusIssue = data.focus.shift_detected === true

  return hasLoadIssue || hasFocusIssue
}

// Get latest AI insight data from cache
function getLatestInsight(): AIInsightData | null {
  const now = new Date()
  const analyses = getWeeklyAnalyses(now.getFullYear(), now.getMonth() + 1)

  if (analyses.length === 0) return null

  // Find the latest analysis by periodStart
  const latestAnalysis = analyses.sort((a, b) =>
    new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
  )[0]

  if (!latestAnalysis?.content?.analysis) return null

  return {
    load: latestAnalysis.content.analysis.load,
    focus: latestAnalysis.content.analysis.focus,
    periodStart: latestAnalysis.periodStart,
    periodEnd: latestAnalysis.periodEnd,
  }
}

// Load level config
const LOAD_CONFIG = {
  sustainable: {
    label: "Устойчивая",
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    icon: CheckCircle,
  },
  elevated: {
    label: "Повышенная",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    icon: AlertTriangle,
  },
  critical: {
    label: "Критическая",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    icon: AlertCircle,
  },
}

// Focus cause labels
const FOCUS_CAUSE_LABELS: Record<string, string> = {
  overload: "Перегрузка",
  fatigue: "Усталость",
  intentional: "Намеренное",
  unclear: "Неясная причина",
}

function LoadSection({ load }: { load: LoadAnalysis }) {
  const config = LOAD_CONFIG[load.level]
  const Icon = config.icon

  return (
    <div className={`rounded-lg p-4 ${config.bgColor} border ${config.borderColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${config.color}`} />
        <span className={`font-semibold ${config.color}`}>
          Нагрузка: {config.label}
        </span>
      </div>

      {load.signals && load.signals.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Сигналы:
          </p>
          <ul className="space-y-1">
            {load.signals.map((signal, idx) => (
              <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                {signal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {load.action && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Рекомендация:
          </p>
          <p className="text-sm text-foreground">{load.action}</p>
        </div>
      )}
    </div>
  )
}

function FocusSection({ focus }: { focus: FocusAnalysis }) {
  if (!focus.shift_detected) return null

  return (
    <div className="rounded-lg p-4 bg-orange-500/10 border border-orange-500/30">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-5 h-5 text-orange-600" />
        <span className="font-semibold text-orange-600">
          Смещение фокуса
        </span>
      </div>

      {focus.cause && (
        <p className="text-sm text-foreground">
          Причина: {FOCUS_CAUSE_LABELS[focus.cause] || focus.cause}
        </p>
      )}
    </div>
  )
}

export function AILoadInsightButton() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [insightData, setInsightData] = useState<AIInsightData | null>(null)

  useEffect(() => {
    const data = getLatestInsight()
    setInsightData(data)
  }, [])

  // Don't render if no issues
  if (!shouldShowInsight(insightData)) {
    return null
  }

  const loadConfig = insightData ? LOAD_CONFIG[insightData.load.level] : null
  const hasCritical = insightData?.load.level === "critical"
  const hasElevated = insightData?.load.level === "elevated"
  const hasFocusShift = insightData?.focus.shift_detected

  // Icon color based on severity
  const iconColorClass = hasCritical
    ? "text-rose-400"  // близко к красному
    : hasElevated || hasFocusShift
    ? "text-amber-400" // между оранжевым и желтым
    : "text-muted-foreground"

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        variant="ghost"
        size="icon"
      >
        <Sparkles
          className={`w-4 h-4 ${iconColorClass}`}
          style={{ animation: 'ai-glow-pulse 1.5s ease-in-out infinite' }}
        />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogClose className="absolute top-4 right-4 opacity-70 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </DialogClose>
          <DialogHeader className="text-center">
            <DialogTitle className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Анализ недели
            </DialogTitle>
          </DialogHeader>

          {insightData && (
            <div className="space-y-4">
              <LoadSection load={insightData.load} />
              <FocusSection focus={insightData.focus} />

              <p className="text-xs text-muted-foreground text-center">
                На основе данных за{" "}
                {new Date(insightData.periodStart).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                })}
                {" – "}
                {new Date(insightData.periodEnd).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
