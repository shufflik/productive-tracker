"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"
import { Pencil, Trash2, Check, Star, Clock, Target } from "lucide-react"
import { GoalMoveMenu } from "@/components/goal-move-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [canDrag, setCanDrag] = useState(false)
  const dragX = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLParagraphElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Convert Tailwind color class to border color
  const getBorderColor = () => {
    if (!labelColor) return undefined

    const colorMap: Record<string, string> = {
      'bg-blue-500': 'rgb(59, 130, 246)',
      'bg-green-500': 'rgb(34, 197, 94)',
      'bg-purple-500': 'rgb(168, 85, 247)',
      'bg-pink-500': 'rgb(236, 72, 153)',
      'bg-yellow-500': 'rgb(234, 179, 8)',
      'bg-orange-500': 'rgb(249, 115, 22)',
      'bg-red-500': 'rgb(239, 68, 68)',
      'bg-cyan-500': 'rgb(6, 182, 212)',
      'bg-indigo-500': 'rgb(99, 102, 241)',
      'bg-teal-500': 'rgb(20, 184, 166)',
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

  const handlePanStart = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Проверяем, что движение горизонтальное (не вертикальное)
    if (Math.abs(info.delta.x) > Math.abs(info.delta.y)) {
      setCanDrag(true)
    }
  }

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

    // Сбрасываем canDrag после завершения drag
    setCanDrag(false)
  }

  const closeSwipe = () => {
    setIsOpen(null)
  }

  const handleAction = (action: () => void) => {
    action()
    closeSwipe()
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
    closeSwipe()
  }

  const handleDeleteConfirm = () => {
    onDelete(goal.id)
    setShowDeleteConfirm(false)
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  // Transform for opacity of actions based on drag position
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
  }, [goal.title])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg"
    >
      {/* Leading Actions (Left Swipe - appears on right) */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex items-center"
        style={{ opacity: rightActionOpacity }}
      >
        <div className="flex h-full overflow-hidden rounded-lg">
          <button
            onClick={() => handleAction(() => onEdit(goal))}
            className="h-full bg-blue-500 flex items-center justify-center px-6 text-white"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleAction(() => handleDelete())}
            className="h-full bg-red-500 flex items-center justify-center px-6 text-white"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Trailing Actions (Right Swipe - appears on left) */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 flex items-center"
        style={{ opacity: leftActionOpacity }}
      >
        <div className="flex h-full overflow-hidden rounded-lg">
          <button
            onClick={() => handleAction(() => onToggleImportant(goal.id))}
            className={`h-full flex items-center justify-center px-6 text-white ${
              goal.important ? "bg-amber-500" : "bg-gray-500"
            }`}
          >
            <Star className={`w-5 h-5 ${goal.important ? "fill-white" : ""}`} />
          </button>
          <div className="h-full">
            <GoalMoveMenu
              onMoveToToday={() => handleAction(() => onMoveToToday(goal.id))}
              onMoveToTomorrow={() => handleAction(() => onMoveToTomorrow(goal.id))}
              onMoveToBacklog={() => handleAction(() => onMoveToBacklog(goal.id))}
              availableOptions={getMoveOptions()}
              isTodayEnded={isTodayEnded}
            />
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        drag={movingMessage ? false : (canDrag ? "x" : false)}
        dragConstraints={{ left: -140, right: 140 }}
        dragElastic={0.01}
        dragMomentum={false}
        dragDirectionLock={true}
        onPanStart={handlePanStart}
        onDragEnd={handleDragEnd}
        animate={{
          x: isOpen === 'left' ? 140 : isOpen === 'right' ? -140 : 0
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
          className={`bg-card border border-border rounded-lg p-4 flex items-center gap-3 w-full transition-all duration-300 cursor-pointer overflow-hidden ${movingMessage ? 'opacity-40 grayscale' : 'opacity-100'}`}
          style={{
            ...(labelColor ? { borderLeftWidth: '3px', borderLeftColor: getBorderColor() } : {}),
            height: '4rem',
          }}
          onClick={() => {
            if (isOpen) {
              closeSwipe()
            } else {
              onOpenDetail(goal)
            }
          }}
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

          <div className="flex-1 min-w-0 flex items-center">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {goal.important && <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
              <p
                ref={titleRef}
                className={`font-medium min-w-0 break-words flex-1 ${goal.completed && selectedDay === "today" ? "line-through text-muted-foreground" : "text-foreground"}`}
                style={{ fontSize: '16px', lineHeight: '1.5' }}
              >
                {goal.title}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
              {goal.globalGoalId && (
                <Target className="w-3.5 h-3.5 text-primary" aria-label="Linked to global goal" />
              )}
              {goal.meta?.isPostponed && (
                <Clock className="w-3.5 h-3.5 text-muted-foreground" aria-label="Postponed task" />
              )}
            </div>
          </div>
        </div>

        {movingMessage && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg">
            <p className="text-sm font-medium text-foreground px-4 py-2 bg-card border border-border rounded-md shadow-lg z-10">
              {movingMessage}
            </p>
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[90%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{goal.title}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600 text-white border-red-500"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
