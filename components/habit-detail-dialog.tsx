"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Target, TrendingUp, Calendar } from "lucide-react"
import type { Goal } from "@/lib/types"

type HabitDetailDialogProps = {
  open: boolean
  onClose: () => void
  habit: Goal | null
  streak: number
}

export function HabitDetailDialog({ open, onClose, habit, streak }: HabitDetailDialogProps) {
  if (!habit) return null

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const selectedDays = habit.repeatDays?.map((d) => daysOfWeek[d]).join(", ")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Habit Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Habit Title */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-foreground">{habit.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {habit.repeatType === "daily" ? "Every Day" : `${habit.repeatDays?.length} days per week`}
              </p>
            </div>
          </div>

          {/* Streak Display */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              <span className="text-5xl font-bold text-primary">{streak}</span>
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
                {daysOfWeek.map((day, index) => (
                  <div
                    key={day}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      habit.repeatDays?.includes(index)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day}
                  </div>
                ))}
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
              <p className="text-2xl font-bold text-foreground">{streak > 0 ? "🔥" : "💪"}</p>
              <p className="text-xs text-muted-foreground mt-1">{streak > 0 ? "On fire!" : "Ready to start"}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
