"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import type { Goal, Habit } from "@/lib/types"

type ActivityChartProps = {
  linkedGoals: Goal[]
  linkedHabits: Habit[]
  days?: 14 | 28
}

type DayActivity = {
  date: Date
  dateStr: string
  activityCount: number
  isActive: boolean
  isToday: boolean
  dayLabel: string
}

export function ActivityChart({ linkedGoals, linkedHabits, days = 14 }: ActivityChartProps) {
  const activityData = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const result: DayActivity[] = []

    // Build activity count map from goals
    const goalActivityByDate: Record<string, number> = {}
    for (const goal of linkedGoals) {
      if (goal.completed && goal.targetDate) {
        goalActivityByDate[goal.targetDate] = (goalActivityByDate[goal.targetDate] || 0) + 1
      }
    }

    // Build activity count map from habits
    const habitActivityByDate: Record<string, number> = {}
    for (const habit of linkedHabits) {
      if (habit.completions) {
        for (const [dateStr, completed] of Object.entries(habit.completions)) {
          if (completed) {
            habitActivityByDate[dateStr] = (habitActivityByDate[dateStr] || 0) + 1
          }
        }
      }
    }

    // Generate days array (from oldest to newest)
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toDateString()

      const goalCount = goalActivityByDate[dateStr] || 0
      const habitCount = habitActivityByDate[dateStr] || 0
      const activityCount = goalCount + habitCount

      result.push({
        date,
        dateStr,
        activityCount,
        isActive: activityCount > 0,
        isToday: i === 0,
        dayLabel: date.getDate().toString(),
      })
    }

    return result
  }, [linkedGoals, linkedHabits, days])

  // Calculate stats
  const stats = useMemo(() => {
    const activeDays = activityData.filter(d => d.isActive).length
    const maxActivity = Math.max(...activityData.map(d => d.activityCount), 1)

    // Calculate streak from today backwards
    let streak = 0
    for (let i = activityData.length - 1; i >= 0; i--) {
      if (activityData[i].isActive) {
        streak++
      } else {
        break
      }
    }

    return { activeDays, maxActivity, streak, total: days }
  }, [activityData, days])

  // SVG dimensions
  const width = 280
  const height = 80
  const padding = { top: 10, right: 10, bottom: 20, left: 10 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Generate line path
  const linePath = useMemo(() => {
    const points = activityData.map((day, index) => {
      const x = padding.left + (index / (days - 1)) * chartWidth
      const y = padding.top + chartHeight - (day.activityCount / stats.maxActivity) * chartHeight
      return { x, y, ...day }
    })

    // Create smooth curve path
    const path = points.reduce((acc, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`
      }
      return `${acc} L ${point.x} ${point.y}`
    }, "")

    // Create area path (for gradient fill)
    const areaPath = `${path} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`

    return { path, areaPath, points }
  }, [activityData, days, chartWidth, chartHeight, stats.maxActivity, padding])

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground">Активных: </span>
            <span className="font-semibold text-foreground">{stats.activeDays}/{stats.total}</span>
          </div>
          {stats.streak > 0 && (
            <div>
              <span className="text-muted-foreground">Серия: </span>
              <span className="font-semibold text-green-500">{stats.streak} {stats.streak === 1 ? "день" : stats.streak < 5 ? "дня" : "дней"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Line chart */}
      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="activityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={ratio}
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - ratio)}
              x2={width - padding.right}
              y2={padding.top + chartHeight * (1 - ratio)}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Area fill */}
          <motion.path
            d={linePath.areaPath}
            fill="url(#activityGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />

          {/* Line */}
          <motion.path
            d={linePath.path}
            fill="none"
            stroke="rgb(34, 197, 94)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {/* Data points */}
          {linePath.points.map((point, index) => (
            <motion.circle
              key={point.dateStr}
              cx={point.x}
              cy={point.y}
              r={point.isToday ? 4 : point.isActive ? 3 : 2}
              fill={point.isActive ? "rgb(34, 197, 94)" : "rgb(156, 163, 175)"}
              stroke={point.isToday ? "rgb(34, 197, 94)" : "none"}
              strokeWidth={point.isToday ? 2 : 0}
              strokeOpacity={0.3}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.03 }}
            />
          ))}

          {/* X-axis labels (show every few days) */}
          {linePath.points.filter((_, i) => i === 0 || i === Math.floor(days / 2) || i === days - 1).map((point) => (
            <text
              key={`label-${point.dateStr}`}
              x={point.x}
              y={height - 4}
              textAnchor="middle"
              className="text-[9px] fill-muted-foreground"
            >
              {point.date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
