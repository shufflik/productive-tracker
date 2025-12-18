"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DayStatusDialog } from "@/components/day-status-dialog"
import { getStatsCache, setStatsCache, isCacheValid, getDayFromCache, type DayStatsData, type DayDetailData } from "@/lib/services/stats-cache"
import { toast } from "sonner"
import { getStatsRangeApi } from "@/lib/services/api-client"

type DayStatus = "good" | "average" | "poor" | "bad" | null

export function StatisticsView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendar, setCalendar] = useState<Record<string, DayStatus>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Day detail state
  const [dayDetail, setDayDetail] = useState<DayStatsData | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Reasons statistics state
  const [reasonsStats, setReasonsStats] = useState<Record<string, number>>({})
  const [isLoadingReasons, setIsLoadingReasons] = useState(false)
  const [isReasonsVisible, setIsReasonsVisible] = useState(false)
  const reasonsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadStats()
  }, [currentDate]) // Reload when month changes

  // Load reasons statistics when calendar changes
  useEffect(() => {
    loadReasonsStats()
  }, [calendar, currentDate])

  async function loadStats() {
    setIsLoading(true)

    try {
      // Calculate month date range
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1 // JS months are 0-indexed
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0)
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`

      // Check cache first
      const cache = getStatsCache()

      // If cache is valid and covers this month - use it and skip backend call
      if (cache && isCacheValid(cache) && cache.startDate <= startDate && cache.endDate >= endDate) {
        applyStatsData(cache.data)
        console.log('[Stats] Using valid cache, skipping backend call')
        setIsLoading(false)
        return
      }

      // Show cached data immediately while fetching fresh data
      if (cache) {
        applyStatsData(cache.data)
        console.log('[Stats] Showing stale cache while fetching fresh data')
      }

      // Fetch fresh data from backend using new range endpoint
      const freshData = await getStatsRangeApi({ start_date: startDate, end_date: endDate })

      // Update cache
      setStatsCache(freshData, startDate, endDate)

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

  function applyStatsData(data: DayStatsData[]) {
    // Convert days array to calendar (only dayStatus)
    const newCalendar: Record<string, DayStatus> = {}

    data.forEach((day) => {
      newCalendar[day.date] = day.dayStatus as DayStatus
    })

    setCalendar(newCalendar)
  }

  async function loadDayDetail(date: string) {
    setIsLoadingDetail(true)
    setDayDetail(null)

    try {
      // Try to get from cache first
      const cachedDay = getDayFromCache(date)

      if (cachedDay) {
        setDayDetail(cachedDay)
        console.log(`[Stats] Day detail loaded from cache for ${date}`)
        setIsLoadingDetail(false)
        return
      }

      // If not in cache, try to reload stats for the month (might be different month)
      const [year, month] = date.split('-').map(Number)
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0)
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`

      const freshData = await getStatsRangeApi({ start_date: startDate, end_date: endDate })
      setStatsCache(freshData, startDate, endDate)

      const dayData = freshData.find((d: DayStatsData) => d.date === date)
      if (dayData) {
        setDayDetail(dayData)
        console.log(`[Stats] Day detail loaded from backend for ${date}`)
      }
      // If no data - just don't show toast, dialog will handle empty state

    } catch (error) {
      console.error('[Stats] Failed to load day detail:', error)
      toast.error("Failed to load day details")
    } finally {
      setIsLoadingDetail(false)
    }
  }

  async function loadReasonsStats() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`
    
    // Get all days in current month that have status (were ended)
    const monthDaysWithStatus = Object.entries(calendar)
      .filter(([date]) => date.startsWith(monthPrefix))
      .filter(([, status]) => status !== null)
      .map(([date]) => date)

    if (monthDaysWithStatus.length === 0) {
      setReasonsStats({})
      return
    }

    setIsLoadingReasons(true)

    try {
      // Get cache
      const cache = getStatsCache()
      
      // Load details from cache
      const details = monthDaysWithStatus.map((date) => {
        return getDayFromCache(date)
      }).filter(Boolean) as DayStatsData[]

      // Collect all reasons
      const reasonsCount: Record<string, number> = {}
      details.forEach((detail) => {
        if (detail?.incompleteReasons) {
          detail.incompleteReasons.forEach((reason: { reason: string }) => {
            const reasonKey = reason.reason
            reasonsCount[reasonKey] = (reasonsCount[reasonKey] || 0) + 1
          })
        }
      })

      setReasonsStats(reasonsCount)
    } catch (error) {
      console.error('[Stats] Failed to load reasons stats:', error)
    } finally {
      setIsLoadingReasons(false)
    }
  }


  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  // Sunday (0) becomes 6, Monday (1) becomes 0, etc.
  const dayOfWeek = firstDay.getDay()
  const startingDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1

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

  const stats = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`
    
    const monthDays = Object.entries(calendar).filter(([date]) => 
      date.startsWith(monthPrefix)
    )
    
    return {
      good: monthDays.filter(([, s]) => s === "good").length,
      average: monthDays.filter(([, s]) => s === "average").length,
      poor: monthDays.filter(([, s]) => s === "poor").length,
      bad: monthDays.filter(([, s]) => s === "bad").length,
    }
  }, [calendar, currentDate])

  const chartData = useMemo(() => {
    const total = stats.good + stats.average + stats.poor + stats.bad
    if (total === 0) {
      return []
    }
    
    const data = [
      {
        name: "Good",
        value: stats.good,
        color: "rgb(16,185,129)",
        percentage: Math.round((stats.good / total) * 100),
      },
      {
        name: "Average",
        value: stats.average,
        color: "rgb(251,191,36)",
        percentage: Math.round((stats.average / total) * 100),
      },
      {
        name: "Poor",
        value: stats.poor,
        color: "rgb(249,115,22)",
        percentage: Math.round((stats.poor / total) * 100),
      },
      {
        name: "Bad",
        value: stats.bad,
        color: "rgb(239,68,68)",
        percentage: Math.round((stats.bad / total) * 100),
      },
    ].filter(item => item.value > 0)
    
    // Calculate angles for pie chart
    let currentAngle = -90 // Start from top
    return data.map((item) => {
      const angle = (item.value / total) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      currentAngle = endAngle
      
      return {
        ...item,
        angle,
        startAngle,
        endAngle,
      }
    })
  }, [stats])

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      "no-strength": "No strength",
      "worked-all-day": "Worked all day",
      "played": "Played",
      "poor-time-management": "Poor time management",
      "other": "Other",
    }
    return labels[reason] || reason
  }

  const sortedReasons = useMemo(() => {
    return Object.entries(reasonsStats)
      .sort(([, a], [, b]) => b - a)
      .map(([reason, count]) => ({ reason, count }))
  }, [reasonsStats])

  const maxReasonCount = useMemo(() => {
    if (sortedReasons.length === 0) return 1
    return Math.max(...sortedReasons.map((r) => r.count))
  }, [sortedReasons])

  const getReasonBarColor = (reason: string) => {
    const colors: Record<string, string> = {
      "no-strength": "bg-blue-500",
      "worked-all-day": "bg-purple-500",
      "played": "bg-pink-500",
      "poor-time-management": "bg-orange-500",
      "other": "bg-gray-500",
    }
    return colors[reason] || "bg-muted"
  }

  // Intersection Observer for reasons block animation
  useEffect(() => {
    // Reset animation when data changes
    setIsReasonsVisible(false)
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Small delay for smoother animation
            setTimeout(() => {
              setIsReasonsVisible(true)
            }, 100)
          }
        })
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
      }
    )

    const currentRef = reasonsRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [sortedReasons.length]) // Re-run when reasons data changes

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
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">{days}</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Productivity Status</h3>
            <div className="space-y-4">
              {chartData.length > 0 ? (
                <>
                  <div className="flex items-center justify-center relative">
                    <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="40"
                        className="text-muted opacity-20"
                      />
                      {chartData.map((item, index) => {
                        const radius = 80
                        const circumference = 2 * Math.PI * radius
                        const offset = circumference - (item.angle / 360) * circumference
                        
                        return (
                          <motion.circle
                            key={item.name}
                            cx="100"
                            cy="100"
                            r={radius}
                            fill="none"
                            stroke={item.color}
                            strokeWidth="40"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference}
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{
                              duration: 1,
                              delay: index * 0.1,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                            style={{
                              transformOrigin: "100px 100px",
                              transform: `rotate(${item.startAngle}deg)`,
                            }}
                          />
                        )
                      })}
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center" style={{ width: "200px", height: "200px" }}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="text-center"
                      >
                        <div className="text-2xl font-bold text-foreground">
                          {stats.good + stats.average + stats.poor + stats.bad}
                        </div>
                        <div className="text-xs text-muted-foreground">days</div>
                      </motion.div>
                </div>
              </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {chartData.map((item, index) => (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                      >
                <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-foreground font-medium">{item.name}</span>
                </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{item.value}</span>
                          <span className="text-muted-foreground">({item.percentage}%)</span>
              </div>
                      </motion.div>
                    ))}
                </div>
                </>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No completed days this month
                </div>
              )}
            </div>
          </div>

          <div ref={reasonsRef} className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Incomplete Reasons</h3>
            {isLoadingReasons ? (
              <div className="text-sm text-muted-foreground text-center py-4">Loading statistics...</div>
            ) : sortedReasons.length > 0 ? (
              <div className="space-y-3">
                {sortedReasons.map(({ reason, count }) => {
                  const percentage = (count / maxReasonCount) * 100
                  return (
                    <div key={reason} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${getReasonBarColor(reason)}`} />
                          <span className="text-sm font-medium text-foreground">{getReasonLabel(reason)}</span>
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground">{count} {count === 1 ? 'time' : 'times'}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <motion.div
                          className={`h-full ${getReasonBarColor(reason)} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ 
                            width: isReasonsVisible ? `${percentage}%` : '0%' 
                          }}
                          transition={{ 
                            duration: 1.2, 
                            ease: [0.4, 0, 0.2, 1],
                            delay: 0.1
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No incomplete goals this month</div>
            )}
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
