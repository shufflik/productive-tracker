"use client"

import { useMemo } from "react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { format } from "date-fns"
import type { Goal, Habit } from "@/lib/types"

// Helper to format date to ISO format (YYYY-MM-DD)
const toISODateString = (date: Date): string => format(date, "yyyy-MM-dd")

type ActivityChartProps = {
  linkedGoals: Goal[]
  linkedHabits: Habit[]
  days?: 14 | 28
  createdAt?: string
}

export function ActivityChart({ linkedGoals, linkedHabits, days = 14, createdAt }: ActivityChartProps) {
  const { chartData, stats } = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Calculate actual days to show based on goal age
    let effectiveDays: number = days
    if (createdAt) {
      const created = new Date(createdAt)
      created.setHours(0, 0, 0, 0)
      const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1
      effectiveDays = Math.min(days, Math.max(1, daysSinceCreation))
    }

    // Build activity count maps
    const goalActivityByDate: Record<string, number> = {}
    for (const goal of linkedGoals) {
      if (goal.completed && goal.targetDate) {
        goalActivityByDate[goal.targetDate] = (goalActivityByDate[goal.targetDate] || 0) + 1
      }
    }

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

    // Generate chart data
    const data: Array<{
      date: string
      label: string
      activity: number
      isToday: boolean
    }> = []

    let activeDays = 0
    let streak = 0
    let tempStreak = 0

    for (let i = effectiveDays - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const isoDateStr = toISODateString(date)
      const legacyDateStr = date.toDateString() // Habits use toDateString format

      const goalCount = goalActivityByDate[isoDateStr] || 0
      const habitCount = habitActivityByDate[legacyDateStr] || 0
      const activity = goalCount + habitCount

      if (activity > 0) {
        activeDays++
        tempStreak++
      } else {
        tempStreak = 0
      }

      // Update streak (from today backwards)
      if (i === 0 || (tempStreak > 0 && i < effectiveDays - 1)) {
        streak = tempStreak
      }

      data.push({
        date: isoDateStr,
        label: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        activity,
        isToday: i === 0,
      })
    }

    // Recalculate streak from the end
    streak = 0
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].activity > 0) {
        streak++
      } else {
        break
      }
    }

    return {
      chartData: data,
      stats: { activeDays, streak, total: effectiveDays }
    }
  }, [linkedGoals, linkedHabits, days, createdAt])

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{data.label}</p>
          <p className="text-xs text-muted-foreground">
            {data.activity > 0
              ? `${data.activity} ${data.activity === 1 ? "активность" : "активностей"}`
              : "Нет активности"
            }
          </p>
        </div>
      )
    }
    return null
  }

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
              <span className="font-semibold text-green-500">
                {stats.streak} {stats.streak === 1 ? "день" : stats.streak < 5 ? "дня" : "дней"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(34, 197, 94)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="rgb(34, 197, 94)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={false}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide
              domain={[0, 'dataMax + 1']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="activity"
              stroke="rgb(34, 197, 94)"
              strokeWidth={2}
              fill="url(#activityGradient)"
              dot={(props) => {
                const { cx, cy, payload } = props
                if (payload.isToday) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="rgb(34, 197, 94)"
                      stroke="white"
                      strokeWidth={2}
                    />
                  )
                }
                return <circle cx={cx} cy={cy} r={0} />
              }}
              activeDot={{
                r: 4,
                fill: "rgb(34, 197, 94)",
                stroke: "white",
                strokeWidth: 2
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Date labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>{chartData[0]?.label}</span>
        <span>{chartData[Math.floor(chartData.length / 2)]?.label}</span>
        <span>{chartData[chartData.length - 1]?.label}</span>
      </div>
    </div>
  )
}
