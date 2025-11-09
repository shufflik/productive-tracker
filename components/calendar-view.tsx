"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DayStatusDialog } from "@/components/day-status-dialog"

type DayStatus = "good" | "average" | "bad" | null

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendar, setCalendar] = useState<Record<string, DayStatus>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("calendar")
    if (saved) {
      setCalendar(JSON.parse(saved))
    }
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{monthName}</h2>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={previousMonth} className="h-8 w-8 p-0 bg-transparent">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0 bg-transparent">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
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

      {/* Legend */}
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
