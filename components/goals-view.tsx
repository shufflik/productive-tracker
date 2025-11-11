"use client"

import { useState, useMemo, useCallback } from "react"
import { SwipeableList, Type } from "react-swipeable-list"
import "react-swipeable-list/dist/styles.css"
import { Button } from "@/components/ui/button"
import { Plus, CheckSquare, Package, CalendarCheck, Calendar } from "lucide-react"
import { GoalDialog } from "@/components/goal-dialog"
import { GoalDetailDialog } from "@/components/goal-detail-dialog"
import { DayReviewDialog } from "@/components/day-review-dialog"
import { SwipeableGoalItem } from "@/components/swipeable-goal-item"
import { BacklogDialog } from "@/components/backlog-dialog"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useDayStateStore } from "@/lib/stores/day-state-store"
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
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
  const moveToBacklogInStore = useGoalsStore((state) => state.moveToBacklog)
  const setGoalsInStore = useGoalsStore((state) => state.setGoals)
  
  // Day state store
  const isTodayEnded = useDayStateStore((state) => state.isTodayEnded)

  // Local UI state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [selectedGoalForDetail, setSelectedGoalForDetail] = useState<Goal | null>(null)
  const [selectedDay, setSelectedDay] = useState<"today" | "tomorrow" | "backlog">("today")
  const [movingGoals, setMovingGoals] = useState<Record<string, string>>({})

  const addGoal = useCallback(
    (title: string, label: string, description: string) => {
      let targetDate: string

      if (selectedDay === "backlog") {
        targetDate = "backlog"
      } else if (selectedDay === "tomorrow") {
        targetDate = new Date(Date.now() + 86400000).toDateString()
      } else {
        targetDate = new Date().toDateString()
      }

      addGoalToStore(title, label, description, targetDate)
    },
    [selectedDay, addGoalToStore]
  )

  const updateGoal = useCallback(
    (id: string, title: string, label: string, description: string) => {
      updateGoalInStore(id, title, label, description)
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
      const goal = goals.find((g) => g.id === id)
      
      if (goal) {
        setMovingGoals(prev => ({ ...prev, [id]: "Перенесено на Tomorrow" }))
        
        setTimeout(() => {
          rescheduleInStore(id)
          setMovingGoals(prev => {
            const newState = { ...prev }
            delete newState[id]
            return newState
          })
        }, 3000)
      }
    },
    [rescheduleInStore, goals]
  )

  const toggleImportant = useCallback(
    (id: string) => {
      toggleImportantInStore(id)
    },
    [toggleImportantInStore]
  )

  const moveToBacklog = useCallback(
    (id: string) => {
      const goal = goals.find((g) => g.id === id)
      
      if (goal) {
        setMovingGoals(prev => ({ ...prev, [id]: "Перенесено в Backlog" }))
        
        setTimeout(() => {
          moveToBacklogInStore(id)
          setMovingGoals(prev => {
            const newState = { ...prev }
            delete newState[id]
            return newState
          })
        }, 3000)
      }
    },
    [moveToBacklogInStore, goals]
  )

  const moveToTodaySingle = useCallback(
    (id: string) => {
      const goal = goals.find((g) => g.id === id)
      
      if (goal) {
        setMovingGoals(prev => ({ ...prev, [id]: "Перенесено в Today" }))
        
        setTimeout(() => {
          moveToTodayInStore(id)
          setMovingGoals(prev => {
            const newState = { ...prev }
            delete newState[id]
            return newState
          })
        }, 3000)
      }
    },
    [moveToTodayInStore, goals]
  )

  const openEditDialog = useCallback((goal: Goal) => {
    setEditingGoal(goal)
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingGoal(null)
  }, [])

  const openGoalDetail = useCallback((goal: Goal) => {
    setSelectedGoalForDetail(goal)
    setDetailOpen(true)
  }, [])

  const closeDetailDialog = useCallback(() => {
    setDetailOpen(false)
    setSelectedGoalForDetail(null)
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

  const groupedGoals = useMemo(
    () => {
      // Group goals by label for all days
      return displayGoals.reduce(
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
    },
    [displayGoals]
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

  // Check if today is ended
  const isCurrentDayEnded = selectedDay === "today" && isTodayEnded()

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setSelectedDay("today")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            selectedDay === "today"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Today
        </button>
        <button
          onClick={() => setSelectedDay("tomorrow")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            selectedDay === "tomorrow"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Tomorrow
        </button>
        <button
          onClick={() => setSelectedDay("backlog")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            selectedDay === "backlog"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
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
            <Button 
              onClick={() => setBacklogOpen(true)} 
              variant="ghost" 
              size="icon"
              disabled={isCurrentDayEnded}
            >
              <Package className="w-4 h-4" />
            </Button>
          )}
          <Button 
            onClick={() => setDialogOpen(true)} 
            variant="ghost" 
            size="icon"
            disabled={isCurrentDayEnded}
          >
            <Plus className="w-4 h-4" />
          </Button>
          {selectedDay === "today" && !isCurrentDayEnded && (
            <Button onClick={() => setReviewOpen(true)} variant="outline" size="sm">
              End Day
            </Button>
          )}
        </div>
      </div>

      {!isCurrentDayEnded && displayGoals.length > 0 && selectedDay === "today" && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Today's Progress</span>
            <span className="text-sm font-bold text-primary">
              {displayGoals.filter((g) => g.completed).length} / {displayGoals.length}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{
                width: `${displayGoals.length > 0 ? (displayGoals.filter((g) => g.completed).length / displayGoals.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {isCurrentDayEnded ? (
        <div className="text-center">
          <div className="w-32 h-32 mx-auto">
            <DotLottieReact
              src="https://lottie.host/ae45736a-73c2-4946-a022-d8e9fd7b596e/HI8VGdybGB.lottie"
              autoplay
            />
          </div>
          <p className="text-xl font-bold text-foreground mb-2">
            Today is completed!
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Great job on finishing your day.
          </p>
          <div className="bg-muted rounded-lg p-4 max-w-xs mx-auto">
            <p className="text-sm text-muted-foreground">
              You completed <span className="font-bold text-primary">{displayGoals.filter((g) => g.completed).length} out of {displayGoals.length}</span> goals
            </p>
          </div>
        </div>
      ) : (
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
          ) : (
          <div className="space-y-4">
            {Object.entries(groupedGoals).map(([label, goalsInLabel]) => {
              // Generate consistent color from label
              const hashCode = (str: string) => {
                let hash = 0
                for (let i = 0; i < str.length; i++) {
                  hash = str.charCodeAt(i) + ((hash << 5) - hash)
                }
                return hash
              }
              
              const colors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-purple-500',
                'bg-pink-500',
                'bg-yellow-500',
                'bg-orange-500',
                'bg-red-500',
                'bg-cyan-500',
                'bg-indigo-500',
                'bg-teal-500',
              ]
              
              const colorIndex = Math.abs(hashCode(label)) % colors.length
              const labelColor = colors[colorIndex]
              
              return (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-center px-2">
                    <div className={`h-1 ${labelColor} w-16 rounded-full`} />
                  </div>
                  <div className="space-y-2">
                    <SwipeableList type={Type.IOS} threshold={0.25}>
                      {goalsInLabel.map((goal, index) => (
                        <div key={goal.id} className={index > 0 ? "mt-2" : ""}>
                          <SwipeableGoalItem
                            goal={goal}
                            selectedDay={selectedDay}
                            onToggleComplete={toggleComplete}
                            onEdit={openEditDialog}
                            onDelete={deleteGoal}
                            onMoveToToday={moveToTodaySingle}
                            onMoveToTomorrow={rescheduleForTomorrow}
                            onMoveToBacklog={moveToBacklog}
                            onToggleImportant={toggleImportant}
                            onOpenDetail={openGoalDetail}
                            movingMessage={movingGoals[goal.id]}
                            isTodayEnded={isTodayEnded()}
                            labelColor={labelColor}
                          />
                        </div>
                      ))}
                    </SwipeableList>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
      )}

      <GoalDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSave={editingGoal ? (title: string, label: string, description: string) => updateGoal(editingGoal.id, title, label, description) : addGoal}
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

      <GoalDetailDialog
        open={detailOpen}
        onClose={closeDetailDialog}
        goal={selectedGoalForDetail}
      />
    </div>
  )
}
