"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Goal } from "@/lib/types"

type HabitDialogProps = {
  open: boolean
  onClose: () => void
  onSave:
    | ((id: string, title: string, repeatType: "daily" | "weekly", repeatDays?: number[]) => void)
    | ((title: string, repeatType: "daily" | "weekly", repeatDays?: number[]) => void)
  habit?: Goal | null
}

export function HabitDialog({ open, onClose, onSave, habit }: HabitDialogProps) {
  const [title, setTitle] = useState("")
  const [repeatType, setRepeatType] = useState<"daily" | "weekly">("daily")
  const [repeatDays, setRepeatDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])

  const daysOfWeek = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 0, label: "Sun" },
  ]

  useEffect(() => {
    if (habit) {
      setTitle(habit.title)
      setRepeatType(habit.repeatType || "daily")
      setRepeatDays(habit.repeatDays || [0, 1, 2, 3, 4, 5, 6])
    } else {
      setTitle("")
      setRepeatType("daily")
      setRepeatDays([0, 1, 2, 3, 4, 5, 6])
    }
  }, [habit, open])

  const toggleDay = (day: number) => {
    if (repeatDays.includes(day)) {
      setRepeatDays(repeatDays.filter((d) => d !== day))
    } else {
      setRepeatDays([...repeatDays, day])
    }
  }

  const handleSave = () => {
    if (!title.trim()) return
    if (repeatType === "weekly" && repeatDays.length === 0) return

    if (habit) {
      ;(onSave as (id: string, title: string, repeatType: "daily" | "weekly", repeatDays?: number[]) => void)(
        habit.id,
        title,
        repeatType,
        repeatType === "weekly" ? repeatDays : undefined,
      )
    } else {
      ;(onSave as (title: string, repeatType: "daily" | "weekly", repeatDays?: number[]) => void)(
        title,
        repeatType,
        repeatType === "weekly" ? repeatDays : undefined,
      )
    }

    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{habit ? "Edit Habit" : "New Habit"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Habit Title</Label>
            <Input
              id="title"
              placeholder="e.g., Exercise for 30 minutes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <Label>Repeat</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={repeatType === "daily" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRepeatType("daily")}
              >
                Every Day
              </Button>
              <Button
                type="button"
                variant={repeatType === "weekly" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRepeatType("weekly")}
              >
                By Days of Week
              </Button>
            </div>

            {repeatType === "weekly" && (
              <div className="space-y-2">
                <Label className="text-sm">Select Days</Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <div key={day.value} className="flex items-center">
                      <Button
                        type="button"
                        variant={repeatDays.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(day.value)}
                        className="w-12 h-9"
                      >
                        {day.label}
                      </Button>
                    </div>
                  ))}
                </div>
                {repeatDays.length === 0 && <p className="text-xs text-destructive">Please select at least one day</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || (repeatType === "weekly" && repeatDays.length === 0)}
            className="flex-1"
          >
            {habit ? "Update" : "Add"} Habit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
