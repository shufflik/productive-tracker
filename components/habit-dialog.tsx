"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, ChevronDown, Crosshair, X, TrendingUp, Layers } from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import type { Habit } from "@/lib/types"

const TYPE_INFO = {
  process: { icon: TrendingUp, color: "rgb(34, 197, 94)" },
  hybrid: { icon: Layers, color: "rgb(59, 130, 246)" },
}

type HabitDialogProps = {
  open: boolean
  onClose: () => void
  onSave:
    | ((id: string, title: string, repeatType: "daily" | "weekly", repeatDays?: number[], globalGoalId?: string) => void)
    | ((title: string, repeatType: "daily" | "weekly", repeatDays?: number[], globalGoalId?: string) => void)
  onDelete?: (id: string) => void
  habit?: Habit | null
}

export function HabitDialog({ open, onClose, onSave, onDelete, habit }: HabitDialogProps) {
  const globalGoals = useGlobalGoalsStore((state) => state.globalGoals)

  // Filter only active Process and Hybrid goals (not Outcome - those use milestones)
  const availableGlobalGoals = useMemo(() =>
    globalGoals.filter((g) =>
      (g.type === "process" || g.type === "hybrid") &&
      (g.status === "in_progress" || g.status === "not_started")
    ),
    [globalGoals]
  )

  const [title, setTitle] = useState("")
  const [repeatType, setRepeatType] = useState<"daily" | "weekly">("daily")
  const [repeatDays, setRepeatDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [globalGoalId, setGlobalGoalId] = useState<string | undefined>(undefined)
  const [showGoalSelector, setShowGoalSelector] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [titleError, setTitleError] = useState("")

  const selectedGlobalGoal = useMemo(() =>
    globalGoals.find((g) => g.id === globalGoalId),
    [globalGoals, globalGoalId]
  )

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
      setGlobalGoalId(habit.globalGoalId)
    } else {
      setTitle("")
      setRepeatType("daily")
      setRepeatDays([0, 1, 2, 3, 4, 5, 6])
      setGlobalGoalId(undefined)
    }
    setShowGoalSelector(false)
  }, [habit, open])

  const handleTitleChange = (value: string) => {
    if (value.length > 50) {
      setTitleError("Title must not exceed 50 characters")
      return
    }
    setTitle(value)
    setTitleError("")
  }

  const toggleDay = (day: number) => {
    if (repeatDays.includes(day)) {
      setRepeatDays(repeatDays.filter((d) => d !== day))
    } else {
      setRepeatDays([...repeatDays, day])
    }
  }

  const handleSave = () => {
    if (!title.trim()) return
    if (title.length > 50) {
      setTitleError("Title must not exceed 50 characters")
      return
    }
    if (repeatType === "weekly" && repeatDays.length === 0) return

    if (habit) {
      ;(onSave as (id: string, title: string, repeatType: "daily" | "weekly", repeatDays?: number[], globalGoalId?: string) => void)(
        habit.id,
        title,
        repeatType,
        repeatType === "weekly" ? repeatDays : undefined,
        globalGoalId,
      )
    } else {
      ;(onSave as (title: string, repeatType: "daily" | "weekly", repeatDays?: number[], globalGoalId?: string) => void)(
        title,
        repeatType,
        repeatType === "weekly" ? repeatDays : undefined,
        globalGoalId,
      )
    }

    onClose()
  }

  const handleDelete = () => {
    if (habit && onDelete) {
      setShowDeleteConfirm(true)
    }
  }

  const handleDeleteConfirm = () => {
    if (habit && onDelete) {
      onDelete(habit.id)
      setShowDeleteConfirm(false)
      onClose()
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{habit ? "Edit Habit" : "New Habit"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Exercise for 30 minutes"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              maxLength={50}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
            />
            {titleError && (
              <p className="text-xs text-destructive">{titleError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {title.length}/50 characters
            </p>
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

          {/* Global Goal Link - only Process and Hybrid goals */}
          {availableGlobalGoals.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label>Link to Global Goal</Label>
              {selectedGlobalGoal ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                  {(() => {
                    const typeInfo = TYPE_INFO[selectedGlobalGoal.type as keyof typeof TYPE_INFO]
                    if (!typeInfo) return null
                    const TypeIcon = typeInfo.icon
                    return <TypeIcon className="w-5 h-5" style={{ color: typeInfo.color }} />
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedGlobalGoal.title}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {selectedGlobalGoal.type} goal
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGlobalGoalId(undefined)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowGoalSelector(!showGoalSelector)}
                    className="w-full flex items-center justify-between p-3 bg-background border border-border rounded-lg text-left hover:border-primary/50 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Crosshair className="w-4 h-4" />
                      Link to global goal (optional)
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showGoalSelector ? "rotate-180" : ""}`} />
                  </button>

                  {showGoalSelector && (
                    <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {availableGlobalGoals.map((g) => {
                        const typeInfo = TYPE_INFO[g.type as keyof typeof TYPE_INFO]
                        if (!typeInfo) return null
                        const TypeIcon = typeInfo.icon
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setGlobalGoalId(g.id)
                              setShowGoalSelector(false)
                            }}
                            className="w-full flex items-center gap-2 p-3 hover:bg-muted text-left transition-colors first:rounded-t-lg last:rounded-b-lg"
                          >
                            <TypeIcon className="w-5 h-5" style={{ color: typeInfo.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{g.title}</p>
                              <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                                <TypeIcon className="w-3 h-3" style={{ color: typeInfo.color }} />
                                {g.type}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex gap-2 pt-2">
          {habit && onDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white border-red-500"
            >
              Delete Habit
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!title.trim() || title.length > 50 || (repeatType === "weekly" && repeatDays.length === 0)}
            className={habit && onDelete ? "flex-1" : "w-full"}
          >
            {habit ? "Update" : "Add"} Habit
          </Button>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[90%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Habit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{habit?.title}"?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-foreground">
                All progress and streak data for this habit will be permanently deleted.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600 text-white border-red-500"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
