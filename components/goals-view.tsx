"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, CheckSquare, Package, CalendarCheck, Calendar } from "lucide-react"
import { GoalDialog } from "@/components/goal-dialog"
import { GoalDetailDialog } from "@/components/goal-detail-dialog"
import { DayReviewDialog, type TaskAction } from "@/components/day-review-dialog"
import { SwipeableGoalItem } from "@/components/swipeable-goal-item"
import { BacklogDialog } from "@/components/backlog-dialog"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useDayStateStore } from "@/lib/stores/day-state-store"
import { syncService } from "@/lib/services/sync"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import type { Goal } from "@/lib/types"
import { format } from "date-fns"

// Re-export Goal type for backward compatibility
export type { Goal } from "@/lib/types"

// Helper to format date to ISO format (YYYY-MM-DD)
const toISODateString = (date: Date): string => format(date, "yyyy-MM-dd")

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
  const moveToDateInStore = useGoalsStore((state) => state.moveToDate)
  const moveToBacklogInStore = useGoalsStore((state) => state.moveToBacklog)

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
    (title: string, label: string, description: string, globalGoalId?: string, milestoneId?: string) => {
      if (selectedDay === "backlog") {
        addGoalToStore(title, label, description, { isBacklog: true }, globalGoalId, milestoneId)
      } else if (selectedDay === "tomorrow") {
        addGoalToStore(title, label, description, { targetDate: toISODateString(new Date(Date.now() + 86400000)) }, globalGoalId, milestoneId)
      } else {
        addGoalToStore(title, label, description, { targetDate: toISODateString(new Date()) }, globalGoalId, milestoneId)
      }
    },
    [selectedDay, addGoalToStore]
  )

  const updateGoal = useCallback(
    (id: string, title: string, label: string, description: string, globalGoalId?: string, milestoneId?: string) => {
      updateGoalInStore(id, title, label, description, globalGoalId, milestoneId)
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
      if (selectedDay === "backlog") {
        return goal.isBacklog === true
      }

      // Skip backlog goals for today/tomorrow views
      if (goal.isBacklog) return false

      const targetDay = selectedDay === "tomorrow" ? new Date(Date.now() + 86400000) : new Date()
      const targetDateStr = toISODateString(targetDay)

      if (!goal.targetDate) return false

      // Compare ISO date strings directly
      return goal.targetDate === targetDateStr
    },
    [selectedDay]
  )

  const displayGoals = useMemo(
    () => {
      const filtered = goals.filter(shouldShowForSelectedDay)
      return filtered
    },
    [goals, shouldShowForSelectedDay, selectedDay]
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

  const moveFromBacklog = useCallback(
    (goalIds: string[]) => {
      if (selectedDay === "tomorrow") {
        const tomorrowDate = toISODateString(new Date(Date.now() + 86400000))
        moveToDateInStore(goalIds, tomorrowDate)
      } else {
        moveToTodayInStore(goalIds)
      }
    },
    [selectedDay, moveToTodayInStore, moveToDateInStore]
  )

  // Check if today is ended
  const isCurrentDayEnded = selectedDay === "today" && isTodayEnded()

  const handleUpdateGoals = useCallback((updatedGoals: Goal[]) => {
    // Обновляем goals в store на основе изменений из review
    // Используем type assertion для доступа к полю action из GoalWithDetails
    type GoalWithAction = Goal & { action?: TaskAction }
    const goalsWithActions = updatedGoals as GoalWithAction[]

    goalsWithActions.forEach((goal) => {
      const originalGoal = goals.find((g) => g.id === goal.id)
      if (originalGoal) {
        // Обрабатываем действия для незавершенных задач
        if (!goal.completed && goal.action) {
          // Сохраняем meta перед применением действия, чтобы она не потерялась
          const metaToPreserve = goal.meta
          
          switch (goal.action) {
            case "tomorrow":
              rescheduleInStore(goal.id)
              break
            case "backlog":
              moveToBacklogInStore(goal.id)
              break
            case "not-relevant":
              deleteGoalFromStore(goal.id)
              break
          }
          
          // Обновляем meta после применения действия, чтобы она сохранилась
          if (metaToPreserve) {
            const currentGoal = useGoalsStore.getState().goals.find((g) => g.id === goal.id)
            if (currentGoal) {
              const updatedGoal = {
                ...currentGoal,
                meta: metaToPreserve,
              }
              useGoalsStore.getState().setGoals(
                useGoalsStore.getState().goals.map((g) => (g.id === goal.id ? updatedGoal : g))
              )
              syncService.enqueueGoalChange("update", updatedGoal)
            }
          }
          
          // После применения действия не нужно обновлять другие поля
          return
        }

        // Обновляем meta если оно есть (для incomplete goals без action)
        if (goal.meta && !goal.completed) {
          // Обновляем goal с meta через прямое обновление в store
          const currentGoal = useGoalsStore.getState().goals.find((g) => g.id === goal.id)
          if (currentGoal) {
            const updatedGoal = {
              ...currentGoal,
              meta: goal.meta,
            }
            // Обновляем store
            useGoalsStore.getState().setGoals(
              useGoalsStore.getState().goals.map((g) => (g.id === goal.id ? updatedGoal : g))
            )
            // Ставим в очередь синхронизации
            syncService.enqueueGoalChange("update", updatedGoal)
          }
        }

        // Обновляем статус завершения если изменился
        if (goal.completed !== originalGoal.completed) {
          toggleCompleteInStore(goal.id)
        }

        // Обновляем основные поля если изменились
        if (goal.title !== originalGoal.title ||
            goal.description !== originalGoal.description ||
            goal.label !== originalGoal.label) {
          updateGoalInStore(goal.id, goal.title, goal.label || "", goal.description || "")
        }
      }
    })
  }, [goals, rescheduleInStore, moveToBacklogInStore, deleteGoalFromStore, toggleCompleteInStore, updateGoalInStore])

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex gap-2 p-1 bg-muted rounded-lg flex-shrink-0">
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

      <div className="flex items-center justify-between flex-shrink-0">
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
            <Button onClick={() => {
              setReviewOpen(true)
            }} variant="outline" size="sm">
              End Day
            </Button>
          )}
        </div>
      </div>

      {!isCurrentDayEnded && displayGoals.length > 0 && selectedDay === "today" && (() => {
        const completedCount = displayGoals.filter((g) => g.completed).length
        const totalCount = displayGoals.length
        const allCompleted = completedCount === totalCount
        
        return (
          <div className="rounded-lg p-4 flex-shrink-0 !mb-4" style={{ backgroundColor: 'lab(31.6% 36 -85 / 0.15)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Today's Progress</span>
              <span className={`text-sm font-bold transition-colors ${allCompleted ? "text-green-500" : "text-foreground"}`}>
                {completedCount} / {totalCount}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )
      })()}

      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
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
                  <div className="flex items-center gap-2 px-2">
                    <div className={`h-2 w-2 ${labelColor} rounded-full`} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      {label}
                    </span>
                  </div>
                  <div className="space-y-2">
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
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
      )}
      </div>

      <GoalDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSave={editingGoal 
          ? (title: string, label: string, description: string, globalGoalId?: string, milestoneId?: string) => updateGoal(editingGoal.id, title, label, description, globalGoalId, milestoneId) 
          : addGoal
        }
        goal={editingGoal}
      />

      <BacklogDialog
        open={backlogOpen}
        onClose={() => setBacklogOpen(false)}
        goals={goals.filter((g) => g.isBacklog === true)}
        onMoveToDate={moveFromBacklog}
      />

      <DayReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        goals={displayGoals}
        onUpdateGoals={handleUpdateGoals}
      />

      <GoalDetailDialog
        open={detailOpen}
        onClose={closeDetailDialog}
        goal={selectedGoalForDetail}
      />
    </div>
  )
}
