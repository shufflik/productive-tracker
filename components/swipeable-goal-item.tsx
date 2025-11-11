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
  onOpenDetail: (goal: Goal) => void
  movingMessage?: string
  isTodayEnded?: boolean
  labelColor?: string
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
  onOpenDetail,
  movingMessage,
  isTodayEnded = false,
  labelColor,
}: SwipeableGoalItemProps) {
  const [swipeKey, setSwipeKey] = useState(0)

  const resetSwipe = () => {
    setSwipeKey(prev => prev + 1)
  }

  // Convert Tailwind color class to rgba
  const getBackgroundColor = () => {
    if (!labelColor) return undefined
    
    const colorMap: Record<string, string> = {
      'bg-blue-500': 'rgba(59, 130, 246, 0.02)',
      'bg-green-500': 'rgba(34, 197, 94, 0.02)',
      'bg-purple-500': 'rgba(168, 85, 247, 0.02)',
      'bg-pink-500': 'rgba(236, 72, 153, 0.02)',
      'bg-yellow-500': 'rgba(234, 179, 8, 0.02)',
      'bg-orange-500': 'rgba(249, 115, 22, 0.02)',
      'bg-red-500': 'rgba(239, 68, 68, 0.02)',
      'bg-cyan-500': 'rgba(6, 182, 212, 0.02)',
      'bg-indigo-500': 'rgba(99, 102, 241, 0.02)',
      'bg-teal-500': 'rgba(20, 184, 166, 0.02)',
    }
    
    return colorMap[labelColor]
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
        <div 
          className={`border border-border rounded-lg p-4 flex items-start gap-3 w-full transition-all duration-300 cursor-pointer ${movingMessage ? 'opacity-40 grayscale' : 'opacity-100'} ${!labelColor ? 'bg-card' : ''}`}
          style={labelColor ? { backgroundColor: getBackgroundColor() } : undefined}
          onClick={() => onOpenDetail(goal)}
        >
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
            {goal.label && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {goal.label}
                </span>
              </div>
            )}
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
