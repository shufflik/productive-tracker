"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type WeekNavigatorProps = {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export function WeekNavigator({ selectedDate, onDateChange }: WeekNavigatorProps) {
  const getWeekDays = (date: Date) => {
    const days = []
    const current = new Date(date)
    
    // Find Monday of current week
    const monday = new Date(current)
    const dayOfWeek = current.getDay()
    // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    monday.setDate(current.getDate() - daysToSubtract)

    // Generate all 7 days starting from Monday
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(monday)
      weekDay.setDate(monday.getDate() + i)
      days.push(weekDay)
    }

    return days
  }

  const weekDays = getWeekDays(selectedDate)
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 7)
    onDateChange(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 7)
    onDateChange(newDate)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const formatMonthYear = () => {
    const firstDay = weekDays[0]
    const lastDay = weekDays[6]

    if (firstDay.getMonth() === lastDay.getMonth()) {
      return firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    } else {
      return `${firstDay.toLocaleDateString("en-US", { month: "short" })} - ${lastDay.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">{formatMonthYear()}</span>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, index) => {
          const selected = isSameDay(date, selectedDate)
          const today = isToday(date)

          return (
            <button
              key={index}
              onClick={() => onDateChange(date)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : today
                    ? "bg-muted text-foreground font-semibold"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="text-xs mb-1">{dayNames[index]}</span>
              <span className="text-lg font-semibold">{date.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
