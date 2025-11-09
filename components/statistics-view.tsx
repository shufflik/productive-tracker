"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DayStatusDialog } from "@/components/day-status-dialog"
import type { IncompleteReason } from "@/components/day-review-dialog"

type ReasonData = {
  date: string
  goalId: string
  goalTitle: string
  reason: IncompleteReason
  customReason?: string
}

type DayStatus = "good" | "average" | "bad" | null

type PeriodType = "week" | "month" | "3months" | "year" | "all"

export function StatisticsView() {
  const [period, setPeriod] = useState<PeriodType>("month")
  const [reasonsData, setReasonsData] = useState<ReasonData[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendar, setCalendar] = useState<Record<string, DayStatus>>({})

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("reasons") || "[]")
    setReasonsData(data)
    const saved = localStorage.getItem("calendar")
    if (saved) {
      setCalendar(JSON.parse(saved))
    }
  }, [])

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
      "no-strength": "#ef4444",
      "worked-all-day": "#f59e0b",
      played: "#8b5cf6",
      "poor-time-management": "#ec4899",
      other: "#6b7280",
    }
    return colors[reason]
  }

  const filterDataByPeriod = (data: ReasonData[]) => {
    const now = new Date()
    const cutoffDate = new Date()

    switch (period) {
      case "week":
        cutoffDate.setDate(now.getDate() - 7)
        break
      case "month":
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case "3months":
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case "year":
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
      case "all":
        return data
    }

    return data.filter((item) => new Date(item.date) >= cutoffDate)
  }

  const filteredData = filterDataByPeriod(reasonsData)

  const reasonCounts = filteredData.reduce(
    (acc, item) => {
      acc[item.reason] = (acc[item.reason] || 0) + 1
      return acc
    },
    {} as Record<IncompleteReason, number>,
  )

  const totalCount = Object.values(reasonCounts).reduce((sum, count) => sum + count, 0)

  const reasonsArray = Object.entries(reasonCounts).map(([reason, count]) => ({
    reason: reason as IncompleteReason,
    count,
    percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
  }))

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getDayStatus = (day: number): DayStatus => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return calendar[dateStr] || null
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

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setSelectedDate(dateStr)
  }

  const updateDayStatus = (date: string, status: DayStatus) => {
    const newCalendar = { ...calendar }
    if (status === null) {
      delete newCalendar[date]
    } else {
      newCalendar[date] = status
    }
    setCalendar(newCalendar)
    localStorage.setItem("calendar", JSON.stringify(newCalendar))
  }

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const days = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="aspect-square" />)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const status = getDayStatus(day)
    const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()

    days.push(
      <button
        key={day}
        onClick={() => handleDayClick(day)}
        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all relative ${
          isToday ? "ring-2 ring-primary ring-offset-2" : ""
        } ${
          status
            ? getStatusColor(status) + " text-white"
            : "bg-card border border-border text-foreground hover:border-primary"
        }`}
      >
        {day}
      </button>,
    )
  }

  const stats = {
    good: Object.values(calendar).filter((s) => s === "good").length,
    average: Object.values(calendar).filter((s) => s === "average").length,
    bad: Object.values(calendar).filter((s) => s === "bad").length,
  }

  // Calculate donut chart segments
  let currentAngle = -90
  const segments = reasonsArray.map((item) => {
    const angle = (item.percentage / 100) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    return {
      ...item,
      startAngle,
      endAngle,
    }
  })

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    }
  }

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle)
    const end = polarToCartesian(x, y, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Productivity Calendar</h2>
            <p className="text-sm text-muted-foreground">Track your daily progress</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{monthName}</h3>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={previousMonth} className="h-8 w-8 p-0 bg-transparent">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0 bg-transparent">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">{days}</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Productivity Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[rgb(16,185,129)]" />
                  <span className="text-sm text-foreground">Good Day</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{stats.good} days</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[rgb(251,191,36)]" />
                  <span className="text-sm text-foreground">Average Day</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{stats.average} days</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[rgb(239,68,68)]" />
                  <span className="text-sm text-foreground">Bad Day</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{stats.bad} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Reasons Statistics</h2>
            <p className="text-sm text-muted-foreground">Analysis of incomplete goals</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period:</span>
            <Select value={period} onValueChange={(value) => setPeriod(value as PeriodType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {totalCount === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground">No data for this period</p>
              <p className="text-sm text-muted-foreground mt-2">Complete your daily reviews to see statistics</p>
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex flex-col items-center">
                  <svg width="240" height="240" viewBox="0 0 240 240" className="mb-6">
                    {segments.map((segment, index) => (
                      <path
                        key={index}
                        d={describeArc(120, 120, 90, segment.startAngle, segment.endAngle)}
                        fill="none"
                        stroke={getReasonColor(segment.reason)}
                        strokeWidth="40"
                        strokeLinecap="round"
                      />
                    ))}
                    <text x="120" y="110" textAnchor="middle" className="fill-foreground text-3xl font-bold">
                      {totalCount}
                    </text>
                    <text x="120" y="135" textAnchor="middle" className="fill-muted-foreground text-sm">
                      incomplete
                    </text>
                  </svg>

                  <div className="w-full space-y-2">
                    {reasonsArray
                      .sort((a, b) => b.count - a.count)
                      .map((item) => (
                        <div key={item.reason} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getReasonColor(item.reason) }}
                            />
                            <span className="text-sm text-foreground">{getReasonLabel(item.reason)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{item.count}</span>
                            <span className="text-sm text-muted-foreground">({item.percentage.toFixed(0)}%)</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground">
                  You have {totalCount} incomplete goal{totalCount !== 1 ? "s" : ""} in the selected period.
                  {reasonsArray.length > 0 && (
                    <>
                      {" "}
                      The most common reason is{" "}
                      <span className="font-medium text-foreground">
                        {getReasonLabel(reasonsArray[0].reason).toLowerCase()}
                      </span>{" "}
                      ({reasonsArray[0].count} time{reasonsArray[0].count !== 1 ? "s" : ""}).
                    </>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <DayStatusDialog
        open={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        date={selectedDate}
        currentStatus={selectedDate ? calendar[selectedDate] : null}
        onUpdateStatus={updateDayStatus}
      />
    </div>
  )
}
