"use client"

import { Sparkles } from "lucide-react"
import { hasAnyAIDataForMonth } from "@/lib/services/ai-cache"

type AIStatsBlockProps = {
  year: number
  month: number
  onClick: () => void
}

/**
 * AI Statistics block - shows above Productivity Status
 * Only renders if cache has AI data for the current month or any weekly data
 */
export function AIStatsBlock({ year, month, onClick }: AIStatsBlockProps) {
  const hasData = hasAnyAIDataForMonth(year, month)

  if (!hasData) {
    return null
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-gradient-to-r from-purple-500/10 to-blue-500/10
                 border border-purple-500/20 rounded-lg p-4
                 flex items-center gap-3 hover:border-purple-500/40
                 transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-purple-500/20
                      flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5 text-purple-500" />
      </div>
      <div className="flex-1 text-left">
        <h4 className="text-sm font-semibold text-foreground">AI Analysis</h4>
        <p className="text-xs text-muted-foreground">
          View your AI-generated productivity insights
        </p>
      </div>
    </button>
  )
}
