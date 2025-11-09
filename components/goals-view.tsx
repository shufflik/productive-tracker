"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, CheckSquare, Package } from "lucide-react"
import { GoalDialog } from "@/components/goal-dialog"
import { DayReviewDialog } from "@/components/day-review-dialog"
import { SwipeableGoalItem } from "@/components/swipeable-goal-item"
import { BacklogDialog } from "@/components/backlog-dialog"
import { useGoalsStore } from "@/lib/stores/goals-store"
import type { Goal } from "@/lib/types"

// Re-export Goal type for backward compatibility
export type { Goal } from "@/lib/types"

export function GoalsView() {
  // Zustand store
  const goals = useGoalsStore((state) => state.goals)
  const addGoalToStore = useGoalsStore((state) => state.addGoal)
  const updateGoalInStore = useGoalsStore((state) => state.updateGoal)
  const deleteGoalFromStore = useGoalsStore((state) => state.deleteGoal)
  const toggleCompleteInStore = useGoalsStore((state) => state.toggleComplete)
  const rescheduleInStore = useGoalsStore((state) => state.rescheduleForTomorrow)
  const toggleImportantInStore = useGoalsStore((state) => state.toggleImportant)
  const moveToTodayInStore = useGoalsStore((state) => state.moveToToday)
  const setGoalsInStore = useGoalsStore((state) => state.setGoals)

  // Local UI state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow" | "backlog">("today")
  const [openGoalId, setOpenGoalId] = useState<string | null>(null)

  const addGoal = useCallback(
    (title: string, label: string) => {
      let targetDate: string

      if (selectedDay === "backlog") {
        targetDate = "backlog"
      } else if (selectedDay === "tomorrow") {
        targetDate = new Date(Date.now() + 86400000).toDateString()
      } else {
        targetDate = new Date().toDateString()
      }

      addGoalToStore(title, label, targetDate)
    },
    [selectedDay, addGoalToStore]
  )

  const updateGoal = useCallback(
    (id: string, title: string, label: string) => {
      updateGoalInStore(id, title, label)
    },
    [updateGoalInStore]
  )

  const deleteGoal = useCallback(
    (id: string) => {
      deleteGoalFromStore(id)
    },
    [deleteGoalFromStore]
  )

  const toggleComplete = useCallback(
    (id: string) => {
      toggleCompleteInStore(id)
    },
    [toggleCompleteInStore]
  )

  const rescheduleForTomorrow = useCallback(
    (id: string) => {
      rescheduleInStore(id)
    },
    [rescheduleInStore]
  )

  const toggleImportant = useCallback(
    (id: string) => {
      toggleImportantInStore(id)
    },
    [toggleImportantInStore]
  )

  const openEditDialog = useCallback((goal: Goal) => {
    setEditingGoal(goal)
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingGoal(null)
  }, [])

  const shouldShowForSelectedDay = useCallback(
    (goal: Goal): boolean => {
      // Only show temporary goals, not habits
      if (goal.type !== "temporary") return false

      if (selectedDay === "backlog") {
        return goal.targetDate === "backlog"
      }

      const targetDay = selectedDay === "tomorrow" ? new Date(Date.now() + 86400000) : new Date()

      if (!goal.targetDate || goal.targetDate === "backlog") return false
      return new Date(goal.targetDate).toDateString() === targetDay.toDateString()
    },
    [selectedDay]
  )

  const displayGoals = useMemo(
    () => goals.filter(shouldShowForSelectedDay),
    [goals, shouldShowForSelectedDay]
  )

  const groupedBacklogGoals = useMemo(
    () =>
      selectedDay === "backlog"
        ? displayGoals.reduce(
            (acc, goal) => {
              const labelKey = goal.label || "Unlabeled"
              if (!acc[labelKey]) {
                acc[labelKey] = []
              }
              acc[labelKey].push(goal)
              return acc
            },
            {} as Record<string, Goal[]>
          )
        : {},
    [selectedDay, displayGoals]
  )

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const displayDate = selectedDay === "today" ? today : selectedDay === "tomorrow" ? tomorrow : "Goals for later"

  const moveFromBacklogToToday = useCallback(
    (goalIds: string[]) => {
      moveToTodayInStore(goalIds)
    },
    [moveToTodayInStore]
  )

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setSelectedDay("today")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedDay === "today"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setSelectedDay("tomorrow")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedDay === "tomorrow"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Tomorrow
        </button>
        <button
          onClick={() => setSelectedDay("backlog")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedDay === "backlog"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Backlog
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {selectedDay === "today" ? "Today's Goals" : selectedDay === "tomorrow" ? "Tomorrow's Goals" : "Backlog"}
          </h2>
          <p className="text-sm text-muted-foreground">{displayDate}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedDay !== "backlog" && (
            <Button onClick={() => setBacklogOpen(true)} variant="ghost" size="icon">
              <Package className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)} variant="ghost" size="icon">
            <Plus className="w-4 h-4" />
          </Button>
          {selectedDay === "today" && (
            <Button onClick={() => setReviewOpen(true)} variant="outline" size="sm">
              End Day
            </Button>
          )}
        </div>
      </div>

      {displayGoals.length > 0 && selectedDay === "today" && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Today's Progress</span>
            <span className="text-sm font-bold text-primary">
              {displayGoals.filter((g) => g.completed).length} / {displayGoals.length}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{
                width: `${displayGoals.length > 0 ? (displayGoals.filter((g) => g.completed).length / displayGoals.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {displayGoals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              {selectedDay === "backlog" ? (
                <Package className="w-8 h-8 text-muted-foreground" />
              ) : (
                <CheckSquare className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <p className="text-muted-foreground mb-4">
              No goals{" "}
              {selectedDay === "today" ? "for today" : selectedDay === "tomorrow" ? "for tomorrow" : "in backlog"}
            </p>
          </div>
        ) : selectedDay === "backlog" ? (
          <div className="space-y-4">
            {Object.entries(groupedBacklogGoals).map(([label, goalsInLabel]) => (
              <div key={label} className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-px bg-border flex-1" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label}</h3>
                  <div className="h-px bg-border flex-1" />
                </div>
                <div className="space-y-2">
                  {goalsInLabel.map((goal) => (
                    <SwipeableGoalItem
                      key={goal.id}
                      goal={goal}
                      selectedDay={selectedDay}
                      onToggleComplete={toggleComplete}
                      onEdit={openEditDialog}
                      onDelete={deleteGoal}
                      onReschedule={rescheduleForTomorrow}
                      onToggleImportant={toggleImportant}
                      isOpen={openGoalId === goal.id}
                      onOpenChange={(isOpen) => setOpenGoalId(isOpen ? goal.id : null)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Regular list for today/tomorrow
          <>
            {displayGoals.map((goal) => (
              <SwipeableGoalItem
                key={goal.id}
                goal={goal}
                selectedDay={selectedDay}
                onToggleComplete={toggleComplete}
                onEdit={openEditDialog}
                onDelete={deleteGoal}
                onReschedule={rescheduleForTomorrow}
                onToggleImportant={toggleImportant}
                isOpen={openGoalId === goal.id}
                onOpenChange={(isOpen) => setOpenGoalId(isOpen ? goal.id : null)}
              />
            ))}
          </>
        )}
      </div>

      <GoalDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSave={editingGoal ? (title: string, label: string) => updateGoal(editingGoal.id, title, label) : addGoal}
        goal={editingGoal}
      />

      <BacklogDialog
        open={backlogOpen}
        onClose={() => setBacklogOpen(false)}
        goals={goals.filter((g) => g.targetDate === "backlog")}
        onMoveToToday={moveFromBacklogToToday}
      />

      <DayReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        goals={displayGoals}
        onUpdateGoals={setGoalsInStore}
      />
    </div>
  )
}
