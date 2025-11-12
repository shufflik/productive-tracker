"use client"

import { useEffect, useState } from "react"
import { useDayStateStore } from "@/lib/stores/day-state-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { DayReviewDialog } from "@/components/day-review-dialog"
import type { Goal } from "@/lib/types"

/**
 * Компонент для автоматического показа диалогов review для пропущенных дней
 * Монтируется в корне приложения и работает в фоне
 */
export function PendingDayReviewsManager() {
  const checkMissedDays = useDayStateStore((state) => state.checkMissedDays)
  const pendingReviewDates = useDayStateStore((state) => state.pendingReviewDates)
  const completePendingReview = useDayStateStore((state) => state.completePendingReview)
  
  const goalsFromStore = useGoalsStore((state) => state.goals)
  const updateGoal = useGoalsStore((state) => state.updateGoal)
  const toggleComplete = useGoalsStore((state) => state.toggleComplete)
  const rescheduleForTomorrow = useGoalsStore((state) => state.rescheduleForTomorrow)
  const moveToBacklog = useGoalsStore((state) => state.moveToBacklog)
  
  const [currentReviewDate, setCurrentReviewDate] = useState<string | null>(null)
  const [currentDateGoals, setCurrentDateGoals] = useState<Goal[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Проверка пропущенных дней при монтировании
  useEffect(() => {
    if (!isInitialized) {
      checkMissedDays()
      setIsInitialized(true)
    }
  }, [isInitialized, checkMissedDays])

  // Показываем диалог для первой даты из очереди
  useEffect(() => {
    if (isInitialized && pendingReviewDates.length > 0 && !currentReviewDate) {
      // Сортируем даты по возрастанию (сначала старые)
      const sortedDates = [...pendingReviewDates].sort()
      const nextDate = sortedDates[0]
      setCurrentReviewDate(nextDate)
      
      // Конвертируем ISO дату в toDateString формат для сравнения с goals
      const nextDateAsDateString = new Date(nextDate + "T00:00:00").toDateString()
      
      // Загружаем goals для этой даты
      const dateGoals = goalsFromStore.filter(
        (g) => g.type === "temporary" && g.targetDate === nextDateAsDateString
      ) as Goal[]
      setCurrentDateGoals(dateGoals)
    }
  }, [isInitialized, pendingReviewDates, currentReviewDate, goalsFromStore])

  const handleCloseReview = () => {
    if (currentReviewDate) {
      completePendingReview(currentReviewDate)
      setCurrentReviewDate(null)
      setCurrentDateGoals([])
    }
  }

  const handleUpdateGoals = (updatedGoals: Goal[]) => {
    // Обновляем goals в store на основе изменений из review
    updatedGoals.forEach((goal) => {
      const originalGoal = goalsFromStore.find((g) => g.id === goal.id)
      if (originalGoal) {
        // Обновляем статус завершения если изменился
        if (goal.completed !== originalGoal.completed) {
          toggleComplete(goal.id)
        }
        
        // Обновляем основные поля если изменились
        if (goal.type === "temporary" && originalGoal.type === "temporary") {
          if (goal.title !== originalGoal.title || 
              goal.description !== originalGoal.description || 
              goal.label !== originalGoal.label) {
            updateGoal(goal.id, goal.title, goal.label || "", goal.description || "")
          }
        }
      }
    })
  }

  return (
    <DayReviewDialog
      open={!!currentReviewDate}
      onClose={handleCloseReview}
      goals={currentDateGoals}
      onUpdateGoals={handleUpdateGoals}
      date={currentReviewDate || undefined}
      allowCancel={false}
    />
  )
}

