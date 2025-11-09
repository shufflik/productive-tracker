"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { IncompleteReason } from "@/components/day-review-dialog"

type ReasonData = {
  date: string
  goalId: string
  goalTitle: string
  reason: IncompleteReason
  customReason?: string
}

type DayReasonsDialogProps = {
  open: boolean
  onClose: () => void
  date: string | null
  reasons: ReasonData[]
}

export function DayReasonsDialog({ open, onClose, date, reasons }: DayReasonsDialogProps) {
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

  const getReasonColor = (reason: IncompleteReason) => {
    const colors: Record<IncompleteReason, string> = {
      "no-strength": "bg-[rgb(239,68,68)]",
      "worked-all-day": "bg-[rgb(245,158,11)]",
      played: "bg-[rgb(139,92,246)]",
      "poor-time-management": "bg-[rgb(236,72,153)]",
      other: "bg-[rgb(107,114,128)]",
    }
    return colors[reason]
  }

  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : ""

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{formattedDate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {reasons.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">No incomplete goals on this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {reasons.length} incomplete goal{reasons.length !== 1 ? "s" : ""} on this day:
              </p>
              {reasons.map((item, index) => (
                <div key={index} className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">{item.goalTitle}</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getReasonColor(item.reason)}`} />
                    <span className="text-xs text-muted-foreground">{getReasonLabel(item.reason)}</span>
                  </div>
                  {item.reason === "other" && item.customReason && (
                    <div className="mt-2 pl-4 border-l-2 border-muted">
                      <p className="text-xs text-muted-foreground italic">{item.customReason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
