"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Pencil, Trash2, Check, Calendar, Star } from "lucide-react"
import type { Goal } from "@/lib/types"

interface SwipeableGoalItemProps {
  goal: Goal
  selectedDay: "today" | "tomorrow" | "backlog"
  onToggleComplete: (id: string) => void
  onEdit: (goal: Goal) => void
  onDelete: (id: string) => void
  onReschedule: (id: string) => void
  onToggleImportant: (id: string) => void
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

export function SwipeableGoalItem({
  goal,
  selectedDay,
  onToggleComplete,
  onEdit,
  onDelete,
  onReschedule,
  onToggleImportant,
  isOpen = false,
  onOpenChange,
}: SwipeableGoalItemProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const startTranslateX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasMoved = useRef(false)

  const leftActionWidth = 128 // Width of left actions (2 buttons × 64px)
  const rightActionWidth = 128 // Width of right actions (2 buttons × 64px)
  const minDragDistance = 5 // Minimum pixels to move before considering it a drag

  useEffect(() => {
    if (!isOpen && translateX !== 0) {
      setTranslateX(0)
    }
  }, [isOpen, translateX])

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return

      const diff = clientX - startX.current

      // Check if we've moved enough to consider it a drag
      if (!hasMoved.current && Math.abs(diff) > minDragDistance) {
        hasMoved.current = true
      }

      const newTranslate = startTranslateX.current + diff

      // Apply translation with resistance at edges
      if (newTranslate >= -rightActionWidth && newTranslate <= leftActionWidth) {
        setTranslateX(newTranslate)
      } else if (newTranslate < -rightActionWidth) {
        const excess = newTranslate + rightActionWidth
        setTranslateX(-rightActionWidth + excess * 0.2)
      } else if (newTranslate > leftActionWidth) {
        const excess = newTranslate - leftActionWidth
        setTranslateX(leftActionWidth + excess * 0.2)
      }

      currentX.current = clientX
    },
    [isDragging, leftActionWidth, rightActionWidth],
  )

  const handleEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    // If we haven't moved enough, don't consider it a swipe
    if (!hasMoved.current) {
      setTranslateX(0)
      onOpenChange?.(false)
      return
    }

    const leftThreshold = leftActionWidth * 0.4
    const rightThreshold = rightActionWidth * 0.4

    if (translateX > leftThreshold) {
      setTranslateX(leftActionWidth)
      onOpenChange?.(true)
    } else if (translateX < -rightThreshold) {
      setTranslateX(-rightActionWidth)
      onOpenChange?.(true)
    } else {
      setTranslateX(0)
      onOpenChange?.(false)
    }

    hasMoved.current = false
  }, [isDragging, translateX, leftActionWidth, rightActionWidth, onOpenChange])

  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      handleMove(e.clientX)
    }

    const handleGlobalMouseUp = (e: MouseEvent) => {
      e.preventDefault()
      handleEnd()
    }

    document.addEventListener("mousemove", handleGlobalMouseMove, { passive: false })
    document.addEventListener("mouseup", handleGlobalMouseUp, { passive: false })
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove)
      document.removeEventListener("mouseup", handleGlobalMouseUp)
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }
  }, [isDragging, handleMove, handleEnd])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTranslateX(0)
        onOpenChange?.(false)
      }
    }

    if (translateX !== 0) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [translateX, onOpenChange])

  const handleStart = (clientX: number, e?: React.MouseEvent | React.TouchEvent) => {
    // Prevent starting drag on action buttons
    if (e && (e.target as HTMLElement).closest("button:not(.swipe-container)")) {
      return
    }

    startX.current = clientX
    currentX.current = clientX
    startTranslateX.current = translateX
    hasMoved.current = false
    setIsDragging(true)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX, e)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (hasMoved.current) {
      e.preventDefault()
    }
    handleMove(e.touches[0].clientX)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return
    e.preventDefault()
    handleStart(e.clientX, e)
  }

  const handleActionClick = (action: () => void) => {
    setTranslateX(0)
    onOpenChange?.(false)
    action()
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg">
      {/* Left actions (swipe right to reveal) */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center">
        <button
          onClick={() => handleActionClick(() => onToggleImportant(goal.id))}
          className={`w-16 h-full flex items-center justify-center text-white active:opacity-80 transition-colors ${
            goal.important ? "bg-amber-500" : "bg-gray-500"
          }`}
          aria-label={goal.important ? "Unmark as important" : "Mark as important"}
        >
          <Star className={`w-5 h-5 ${goal.important ? "fill-white" : ""}`} />
        </button>
        <button
          onClick={() => handleActionClick(() => onReschedule(goal.id))}
          className="w-16 h-full bg-purple-500 flex items-center justify-center text-white active:bg-purple-600 transition-colors"
          aria-label="Reschedule for tomorrow"
        >
          <Calendar className="w-5 h-5" />
        </button>
      </div>

      {/* Right actions (swipe left to reveal) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center">
        <button
          onClick={() => handleActionClick(() => onEdit(goal))}
          className="w-16 h-full bg-blue-500 flex items-center justify-center text-white active:bg-blue-600 transition-colors"
          aria-label="Edit goal"
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleActionClick(() => onDelete(goal.id))}
          className="w-16 h-full bg-red-500 flex items-center justify-center text-white active:bg-red-600 transition-colors"
          aria-label="Delete goal"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Main content */}
      <div
        className="swipe-container bg-card border border-border rounded-lg p-4 flex items-start gap-3 relative"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "pan-y",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleMouseDown}
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
          {goal.label && <p className="text-xs text-muted-foreground mt-1">{goal.label}</p>}
        </div>
      </div>
    </div>
  )
}
