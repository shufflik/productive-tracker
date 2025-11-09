"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
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
  currentOpenId: string | null
  onSwipeChange: (id: string | null) => void
}

export function SwipeableHabitItem({
  habit,
  isCompleted,
  streak,
  onToggle,
  onEdit,
  onDelete,
  onOpenDetail,
  currentOpenId,
  onSwipeChange,
}: SwipeableHabitItemProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)
  const hasDraggedRef = useRef(false)

  const SWIPE_THRESHOLD = 0.4
  const MAX_SWIPE = 140

  const closeSwipe = useCallback(() => {
    setTranslateX(0)
  }, [])

  useEffect(() => {
    if (currentOpenId !== null && currentOpenId !== habit.id) {
      closeSwipe()
    }
  }, [currentOpenId, habit.id, closeSwipe])

  const handleStart = useCallback(
    (clientX: number) => {
      startXRef.current = clientX
      currentXRef.current = translateX
      setIsDragging(true)
      hasDraggedRef.current = false
    },
    [translateX],
  )

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return

      const deltaX = clientX - startXRef.current
      if (Math.abs(deltaX) > 5) {
        hasDraggedRef.current = true
      }

      let newTranslateX = currentXRef.current + deltaX

      if (newTranslateX > 0) {
        newTranslateX = 0
      } else if (newTranslateX < -MAX_SWIPE) {
        newTranslateX = -MAX_SWIPE + (newTranslateX + MAX_SWIPE) * 0.1
      }

      setTranslateX(newTranslateX)
    },
    [isDragging],
  )

  const handleEnd = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)

    const threshold = MAX_SWIPE * SWIPE_THRESHOLD

    if (translateX < -threshold) {
      setTranslateX(-MAX_SWIPE)
      onSwipeChange(habit.id)
    } else {
      setTranslateX(0)
      onSwipeChange(null)
    }
  }, [isDragging, translateX, onSwipeChange, habit.id])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      handleMove(e.clientX)
    }

    const handleMouseUp = () => {
      handleEnd()
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "grabbing"
      document.body.style.userSelect = "none"

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }
    }
  }, [isDragging, handleMove, handleEnd])

  const handleClick = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasDraggedRef.current) {
      onToggle()
    }
  }

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
    closeSwipe()
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={(e) => handleActionClick(e, onEdit)}
          className="w-16 bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white transition-colors"
          aria-label="Edit"
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => handleActionClick(e, onDelete)}
          className="w-16 bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div
        className="bg-card border border-border flex items-center gap-3 p-4 touch-pan-y select-none cursor-grab active:cursor-grabbing transition-transform"
        style={{
          transform: `translateX(${translateX}px)`,
          transitionDuration: isDragging ? "0ms" : "200ms",
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          handleStart(e.clientX)
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onClick={handleClick}
      >
        <button
          onClick={handleCheckboxClick}
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
    </div>
  )
}
