"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"
import { Pencil, TrendingUp, Star, Check, Crosshair } from "lucide-react"
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
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null)
  const dragX = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLParagraphElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    // Threshold for opening the swipe actions - более низкий порог для snap
    const swipeThreshold = 1
    const velocityThreshold = 300

    // Всегда снапим в одно из состояний: открыто или закрыто
    if (offset > swipeThreshold || velocity > velocityThreshold) {
      setIsOpen('left')
    } else if (offset < -swipeThreshold || velocity < -velocityThreshold) {
      setIsOpen('right')
    } else {
      setIsOpen(null)
    }
  }

  const closeSwipe = () => {
    setIsOpen(null)
  }

  const handleAction = (action: () => void) => {
    action()
    closeSwipe()
  }

  const leftActionOpacity = useTransform(dragX, [0, 100], [0, 1])
  const rightActionOpacity = useTransform(dragX, [-100, 0], [1, 0])

  // Автоматическое уменьшение шрифта при переносе текста
  useEffect(() => {
    const titleElement = titleRef.current
    const contentElement = contentRef.current
    if (!titleElement || !contentElement) return

    let fontSize = 16
    const minFontSize = 11
    const targetHeight = 64

    const checkFit = () => {
      titleElement.style.fontSize = `${fontSize}px`
      if (contentElement.scrollHeight > targetHeight && fontSize > minFontSize) {
        fontSize = Math.max(minFontSize, fontSize - 0.5)
        setTimeout(checkFit, 0)
      }
    }

    setTimeout(checkFit, 10)
  }, [habit.title])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg"
    >
      {/* Leading Actions (Right Swipe - Check/Uncheck) */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 flex items-center"
        style={{ opacity: leftActionOpacity }}
      >
        <div className="flex h-full overflow-hidden rounded-lg">
          <button
            onClick={() => handleAction(onToggle)}
            className={`h-full flex items-center justify-center px-8 text-white ${
              isCompleted ? "bg-gray-500" : "bg-green-500"
            }`}
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Trailing Actions (Left Swipe - Edit) */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex items-center"
        style={{ opacity: rightActionOpacity }}
      >
        <div className="flex h-full overflow-hidden rounded-lg">
          <button
            onClick={() => handleAction(onEdit)}
            className="h-full bg-blue-500 flex items-center justify-center px-8 text-white"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        drag={isCurrentDate ? "x" : false}
        dragConstraints={{ left: -90, right: 90 }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={{
          x: isOpen === 'left' ? 90 : isOpen === 'right' ? -90 : 0
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 20,
          mass: 0.5
        }}
        style={{ x: dragX }}
        className="relative"
      >
        <div
          ref={contentRef}
          className={`bg-card border border-border rounded-lg p-4 flex items-center gap-3 w-full transition-all duration-300 cursor-pointer overflow-hidden ${
            !isCurrentDate ? "opacity-60" : ""
          }`}
          style={{ height: '4rem' }}
          onClick={() => {
            if (isOpen) {
              closeSwipe()
            } else {
              onOpenDetail()
            }
          }}
        >
          <div className="flex-1 min-w-0 flex items-center">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {habit.important && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
              <p
                ref={titleRef}
                className={`font-medium min-w-0 break-words flex-1 ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}
                style={{ fontSize: '16px', lineHeight: '1.5' }}
              >
                {habit.title}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
              {habit.globalGoalId && (
                <Crosshair className="w-3.5 h-3.5 text-primary" aria-label="Linked to global goal" />
              )}
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-lg font-bold text-primary">{streak}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
