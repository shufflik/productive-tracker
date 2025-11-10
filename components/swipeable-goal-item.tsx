"use client"

import { useState } from "react"
import { SwipeableListItem, SwipeAction, TrailingActions, LeadingActions, Type } from "react-swipeable-list"
import "react-swipeable-list/dist/styles.css"
import { Pencil, Trash2, Check, Star } from "lucide-react"
import { GoalMoveMenu } from "@/components/goal-move-menu"
import type { Goal } from "@/lib/types"

interface SwipeableGoalItemProps {
  goal: Goal
  selectedDay: "today" | "tomorrow" | "backlog"
  onToggleComplete: (id: string) => void
  onEdit: (goal: Goal) => void
  onDelete: (id: string) => void
  onMoveToToday: (id: string) => void
  onMoveToTomorrow: (id: string) => void
  onMoveToBacklog: (id: string) => void
  onToggleImportant: (id: string) => void
  movingMessage?: string
  isTodayEnded?: boolean
}

export function SwipeableGoalItem({
  goal,
  selectedDay,
  onToggleComplete,
  onEdit,
  onDelete,
  onMoveToToday,
  onMoveToTomorrow,
  onMoveToBacklog,
  onToggleImportant,
  movingMessage,
  isTodayEnded = false,
}: SwipeableGoalItemProps) {
  const [swipeKey, setSwipeKey] = useState(0)

  const resetSwipe = () => {
    setSwipeKey(prev => prev + 1)
  }

  // Определяем доступные опции перемещения в зависимости от текущего раздела
  const getMoveOptions = (): ("today" | "tomorrow" | "backlog")[] => {
    switch (selectedDay) {
      case "today":
        return ["tomorrow", "backlog"]
      case "tomorrow":
        return ["today", "backlog"]
      case "backlog":
        return ["today", "tomorrow"]
      default:
        return []
    }
  }
  const trailingActions = () => (
    <TrailingActions>
      <div className="flex h-full overflow-hidden rounded-lg">
        <SwipeAction onClick={() => { onEdit(goal); resetSwipe() }}>
          <div className="h-full bg-blue-500 flex items-center justify-center px-6 text-white">
            <Pencil className="w-5 h-5" />
          </div>
        </SwipeAction>
        <SwipeAction destructive onClick={() => { onDelete(goal.id); resetSwipe() }}>
          <div className="h-full bg-red-500 flex items-center justify-center px-6 text-white">
            <Trash2 className="w-5 h-5" />
          </div>
        </SwipeAction>
      </div>
    </TrailingActions>
  )

  const leadingActions = () => (
    <LeadingActions>
      <div className="flex h-full overflow-hidden rounded-lg">
        <SwipeAction onClick={() => { onToggleImportant(goal.id); resetSwipe() }}>
          <div
            className={`h-full flex items-center justify-center px-6 text-white ${
              goal.important ? "bg-amber-500" : "bg-gray-500"
            }`}
          >
            <Star className={`w-5 h-5 ${goal.important ? "fill-white" : ""}`} />
          </div>
        </SwipeAction>
        <div className="h-full">
          <GoalMoveMenu
            onMoveToToday={() => { onMoveToToday(goal.id); resetSwipe() }}
            onMoveToTomorrow={() => { onMoveToTomorrow(goal.id); resetSwipe() }}
            onMoveToBacklog={() => { onMoveToBacklog(goal.id); resetSwipe() }}
            availableOptions={getMoveOptions()}
            isTodayEnded={isTodayEnded}
          />
        </div>
      </div>
    </LeadingActions>
  )

  return (
    <SwipeableListItem
      key={swipeKey}
      listType={Type.IOS}
      leadingActions={leadingActions()}
      trailingActions={trailingActions()}
      threshold={0.25}
      blockSwipe={!!movingMessage}
      maxSwipe={0.4}
    >
      <div className="relative w-full">
        <div className={`bg-card border border-border rounded-lg p-4 flex items-start gap-3 w-full transition-all duration-300 ${movingMessage ? 'opacity-40 grayscale' : 'opacity-100'}`}>
          {selectedDay === "today" && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleComplete(goal.id)
              }}
              className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                goal.completed ? "bg-primary border-primary" : "border-border hover:border-primary"
              }`}
              aria-label={goal.completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {goal.completed && <Check className="w-4 h-4 text-primary-foreground" />}
            </button>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {goal.important && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
              <p
                className={`font-medium ${goal.completed && selectedDay === "today" ? "line-through text-muted-foreground" : "text-foreground"}`}
              >
                {goal.title}
              </p>
            </div>
            {goal.label && <p className="text-xs text-muted-foreground mt-1">{goal.label}</p>}
          </div>
        </div>
        
        {movingMessage && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg">
            <p className="text-sm font-medium text-foreground px-4 py-2 bg-card border border-border rounded-md shadow-lg z-10">
              {movingMessage}
            </p>
          </div>
        )}
      </div>
    </SwipeableListItem>
  )
}
