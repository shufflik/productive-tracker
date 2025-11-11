"use client"

import { SwipeableListItem, SwipeAction, TrailingActions, LeadingActions, Type } from "react-swipeable-list"
import "react-swipeable-list/dist/styles.css"
import { Pencil, TrendingUp, Star, Check } from "lucide-react"
import type { Habit } from "@/lib/types"

type SwipeableHabitItemProps = {
  habit: Habit
  isCompleted: boolean
  streak: number
  isCurrentDate: boolean
  onToggle: () => void
  onEdit: () => void
  onOpenDetail: () => void
}

export function SwipeableHabitItem({
  habit,
  isCompleted,
  streak,
  isCurrentDate,
  onToggle,
  onEdit,
  onOpenDetail,
}: SwipeableHabitItemProps) {
  const leadingActions = () => (
    <LeadingActions>
      <div className="flex h-full overflow-hidden rounded-lg">
        <SwipeAction onClick={onToggle}>
          <div className={`h-full flex items-center justify-center px-8 text-white ${
            isCompleted ? "bg-gray-500" : "bg-green-500"
          }`}>
            <Check className="w-5 h-5" />
          </div>
        </SwipeAction>
      </div>
    </LeadingActions>
  )

  const trailingActions = () => (
    <TrailingActions>
      <div className="flex h-full overflow-hidden rounded-lg">
        <SwipeAction onClick={onEdit}>
          <div className="h-full bg-blue-500 flex items-center justify-center px-8 text-white">
            <Pencil className="w-5 h-5" />
          </div>
        </SwipeAction>
      </div>
    </TrailingActions>
  )

  return (
    <SwipeableListItem 
      listType={Type.IOS} 
      leadingActions={isCurrentDate ? leadingActions() : undefined}
      trailingActions={isCurrentDate ? trailingActions() : undefined} 
      threshold={0.25} 
      blockSwipe={!isCurrentDate} 
      maxSwipe={0.25}
    >
      <div className="relative w-full">
        <div 
          className={`bg-card border border-border rounded-lg p-4 flex items-start gap-3 w-full transition-all duration-300 cursor-pointer ${
            !isCurrentDate ? "opacity-60" : ""
          }`}
          onClick={() => onOpenDetail()}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {habit.important && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
              <p className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {habit.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-lg font-bold text-primary">{streak}</span>
          </div>
        </div>
      </div>
    </SwipeableListItem>
  )
}
