"use client"

import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react"
import { ActivityChart } from "../activity-chart"
import { ACTIVITY_STATUS_DETAIL } from "./constants"
import type { Goal, Habit } from "@/lib/types"

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />
  return <ArrowRight className="w-4 h-4 text-muted-foreground" />
}

type ActivityStatusBlockProps = {
  activityStatus: string
  activitySignal?: string
  trend: "up" | "down" | "stable"
  linkedGoals: Goal[]
  linkedHabits: Habit[]
  createdAt?: string
  isLoadingChart?: boolean
}

export function ActivityStatusBlock({
  activityStatus,
  activitySignal,
  trend,
  linkedGoals,
  linkedHabits,
  createdAt,
  isLoadingChart = false,
}: ActivityStatusBlockProps) {
  const statusInfo = ACTIVITY_STATUS_DETAIL[activityStatus]

  return (
    <div className={`p-4 rounded-xl ${statusInfo.bgColor} border ${statusInfo.borderColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-5 h-5 ${statusInfo.color}`} />
          <span className={`text-lg font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
        {activitySignal && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <TrendIcon trend={trend} />
            <span>{activitySignal}</span>
          </div>
        )}
      </div>

      <ActivityChart linkedGoals={linkedGoals} linkedHabits={linkedHabits} days={14} createdAt={createdAt} isLoading={isLoadingChart} />
    </div>
  )
}
