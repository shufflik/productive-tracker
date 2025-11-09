"use client"

import { SwipeableListItem, SwipeAction, TrailingActions, Type } from "react-swipeable-list"
import "react-swipeable-list/dist/styles.css"
import { Pencil, Trash2, TrendingUp, Star } from "lucide-react"
import type { Goal } from "@/lib/types"

type SwipeableHabitItemProps = {
  habit: Goal
  isCompleted: boolean
  streak: number
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onOpenDetail: () => void
}

export function SwipeableHabitItem({
  habit,
  isCompleted,
  streak,
  onToggle,
  onEdit,
  onDelete,
  onOpenDetail,
}: SwipeableHabitItemProps) {
  const trailingActions = () => (
    <TrailingActions>
      <div className="flex h-full overflow-hidden rounded-lg">
        <SwipeAction onClick={onEdit}>
          <div className="h-full bg-blue-500 flex items-center justify-center px-6 text-white">
            <Pencil className="w-5 h-5" />
          </div>
        </SwipeAction>
        <SwipeAction destructive onClick={onDelete}>
          <div className="h-full bg-red-500 flex items-center justify-center px-6 text-white">
            <Trash2 className="w-5 h-5" />
          </div>
        </SwipeAction>
      </div>
    </TrailingActions>
  )

  return (
    <SwipeableListItem listType={Type.IOS} trailingActions={trailingActions()} threshold={0.25} blockSwipe={false} maxSwipe={0.4}>
      <div className="bg-card border border-border flex items-center gap-3 p-4 w-full">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            isCompleted ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary"
          }`}
        >
          {isCompleted && (
            <svg
              className="w-4 h-4 text-primary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <button onClick={onOpenDetail} className="flex-1 min-w-0 text-left flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {habit.important && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
              <p className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {habit.title}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {habit.repeatType === "daily" ? "Every Day" : `${habit.repeatDays?.length} days/week`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-lg font-bold text-primary">{streak}</span>
          </div>
        </button>
      </div>
    </SwipeableListItem>
  )
}
