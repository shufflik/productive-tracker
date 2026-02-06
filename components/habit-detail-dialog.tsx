"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Target, Calendar, Crosshair } from "lucide-react"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import type { Habit } from "@/lib/types"

type HabitDetailDialogProps = {
  open: boolean
  onClose: () => void
  habit: Habit | null
  streak: number
  maxStreak: number
}

export function HabitDetailDialog({ open, onClose, habit, streak, maxStreak }: HabitDetailDialogProps) {
  const getGlobalGoalById = useGlobalGoalsStore((state) => state.getGlobalGoalById)

  if (!habit) return null

  const linkedGlobalGoal = habit.globalGoalId ? getGlobalGoalById(habit.globalGoalId) : undefined

  // Days in Monday-first order with JS day index (0=Sun, 1=Mon, etc.)
  const daysOfWeek = [
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
    { label: "Sun", value: 0 },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Habit Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Habit Title */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-foreground break-all">{habit.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {habit.repeatType === "daily" ? "Every Day" : `${habit.repeatDays?.length} days per week`}
              </p>
            </div>
          </div>

          {/* Streak Display */}
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/5 rounded-lg px-6 py-3 text-center">
            <div className="flex items-end justify-center mb-2">
              {streak > 0 && (
                <div className="w-16 h-16">
                  <DotLottieReact
                    src="https://lottie.host/e9aafbd4-8c8d-412f-98d9-df7270baeb9c/oUfY2XnkZi.lottie"
                    loop
                    autoplay
                  />
                </div>
              )}
              <span className={`text-5xl font-bold ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>{streak}</span>
            </div>
            <p className="text-sm font-medium text-foreground">Consecutive Days</p>
            <p className="text-xs text-muted-foreground mt-1">
              {streak === 0
                ? "Start your streak today!"
                : streak === 1
                  ? "Great start! Keep it going!"
                  : `Amazing! You've completed this ${streak} days in a row!`}
            </p>
          </div>

          {/* Schedule Info */}
          {habit.repeatType === "weekly" && habit.repeatDays && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="w-4 h-4" />
                <span>Schedule</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <div
                    key={day.label}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      habit.repeatDays?.includes(day.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Global Goal */}
          {linkedGlobalGoal && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Crosshair className="w-4 h-4" />
                <span>Global Goal</span>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-foreground">{linkedGlobalGoal.title}</p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">
                {habit.repeatType === "daily" ? "7" : habit.repeatDays?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Days per week</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{maxStreak}</p>
              <p className="text-xs text-muted-foreground mt-1">Best streak</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
