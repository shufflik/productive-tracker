"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DayStatusDialog } from "@/components/day-status-dialog"
import { getStatsCache, setStatsCache, isCacheValid, type MonthStatsData, type DayDetailData } from "@/lib/services/stats-cache"
import { toast } from "sonner"
import { getStatsApi } from "@/lib/services/api-client"

type DayStatus = "good" | "average" | "poor" | "bad" | null

export function StatisticsView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendar, setCalendar] = useState<Record<string, DayStatus>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Day detail state
  const [dayDetail, setDayDetail] = useState<DayDetailData | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  useEffect(() => {
    loadStats()
  }, [currentDate]) // Reload when month changes

  async function loadStats() {
    setIsLoading(true)

    try {
      // Check cache first
      const cache = getStatsCache()

      // If cache is valid (less than 30 min old) - use it and skip backend call
      if (cache && isCacheValid(cache)) {
        applyStatsData(cache.data)
        console.log('[Stats] Using valid cache, skipping backend call')
        setIsLoading(false)
        return
      }

      // Cache is invalid or outdated - fetch from backend
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1 // JS months are 0-indexed

      // Show cached data immediately while fetching fresh data
      if (cache) {
        applyStatsData(cache.data)
        console.log('[Stats] Showing stale cache while fetching fresh data')
      }

      // Fetch fresh data from backend (month overview - lightweight)
      const freshData = await getStatsApi({ year, month })

      // Update cache
      setStatsCache(freshData)

      // Apply fresh data
      applyStatsData(freshData)
      console.log('[Stats] Fresh data loaded from backend')

    } catch (error) {
      console.error('[Stats] Failed to load stats:', error)

      // Try to use cache on error
      const cache = getStatsCache()
      if (cache) {
        applyStatsData(cache.data)
        toast.info("Showing cached data (offline)")
      } else {
        toast.error("Failed to load statistics")
      }
    } finally {
      setIsLoading(false)
    }
  }

  function applyStatsData(data: MonthStatsData) {
    // Convert days array to calendar (lightweight - only dayStatus)
    const newCalendar: Record<string, DayStatus> = {}

    data.days.forEach((day) => {
      newCalendar[day.date] = day.dayStatus as DayStatus
    })

    setCalendar(newCalendar)
  }

  async function loadDayDetail(date: string) {
    setIsLoadingDetail(true)
    setDayDetail(null)

    try {
      // Parse date
      const [year, month, day] = date.split('-').map(Number)

      // Fetch day detail (NOT cached - always fresh)
      const detail = await getStatsApi({ year, month, day })

      if (detail) {
        setDayDetail(detail)
        console.log(`[Stats] Day detail loaded for ${date}`)
      }
      // If no data - just don't show toast, dialog will handle empty state

    } catch (error) {
      console.error('[Stats] Failed to load day detail:', error)
      toast.error("Failed to load day details")
    } finally {
      setIsLoadingDetail(false)
    }
  }


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
      case "poor":
        return "bg-[rgb(249,115,22)]"
      case "bad":
        return "bg-[rgb(239,68,68)]"
      default:
        return "bg-muted"
    }
  }

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setSelectedDate(dateStr)

    // Load day detail from API
    loadDayDetail(dateStr)
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
    poor: Object.values(calendar).filter((s) => s === "poor").length,
    bad: Object.values(calendar).filter((s) => s === "bad").length,
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-hide space-y-6">
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
                  <div className="w-4 h-4 rounded bg-[rgb(249,115,22)]" />
                  <span className="text-sm text-foreground">Poor Day</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{stats.poor} days</span>
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

      <DayStatusDialog
        open={selectedDate !== null}
        onClose={() => {
          setSelectedDate(null)
          setDayDetail(null)
        }}
        date={selectedDate}
        currentStatus={selectedDate ? calendar[selectedDate] : null}
        onUpdateStatus={updateDayStatus}
        dayDetail={dayDetail}
        isLoadingDetail={isLoadingDetail}
      />
    </div>
  )
}
