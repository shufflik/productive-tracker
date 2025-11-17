"use client"

import { useState, useRef } from "react"
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"
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
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null)
  const dragX = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    // Threshold for opening the swipe actions - более низкий порог для snap
    const swipeThreshold = 10
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
          className={`bg-card border border-border rounded-lg p-4 flex items-start gap-3 w-full transition-all duration-300 cursor-pointer ${
            !isCurrentDate ? "opacity-60" : ""
          }`}
          onClick={() => {
            if (isOpen) {
              closeSwipe()
            } else {
              onOpenDetail()
            }
          }}
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
      </motion.div>
    </div>
  )
}
