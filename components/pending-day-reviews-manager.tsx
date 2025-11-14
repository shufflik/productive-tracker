"use client"

import { useEffect, useState } from "react"
import { useDayStateStore } from "@/lib/stores/day-state-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { DayReviewDialog, type TaskAction } from "@/components/day-review-dialog"
import { syncService } from "@/lib/services/sync-service"
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
  const deleteGoal = useGoalsStore((state) => state.deleteGoal)
  
  const [currentReviewDate, setCurrentReviewDate] = useState<string | null>(null)
  const [currentDateGoals, setCurrentDateGoals] = useState<Goal[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Проверка пропущенных дней ПОСЛЕ синхронизации
  // Это гарантирует, что используется синхронизированный lastActiveDate
  useEffect(() => {
    if (!isInitialized) {
      // Сначала синхронизируемся, затем проверяем пропущенные дни
      syncService.sync().then(() => {
        // После синхронизации lastActiveDate обновлен с сервера
        // Теперь можно проверить пропущенные дни с актуальными данными
        checkMissedDays(goalsFromStore)
        setIsInitialized(true)
      }).catch((error) => {
        // Даже если синхронизация провалилась, проверяем локально
        console.error("[PendingDayReviewsManager] Sync failed, checking locally:", error)
      checkMissedDays(goalsFromStore)
      setIsInitialized(true)
      })
    }
  }, [isInitialized, checkMissedDays, goalsFromStore])

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
        (g) => g.type === "goal" && g.targetDate === nextDateAsDateString
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
    // Используем type assertion для доступа к полю action из GoalWithDetails
    type GoalWithAction = Goal & { action?: TaskAction }
    const goalsWithActions = updatedGoals as GoalWithAction[]
    
    goalsWithActions.forEach((goal) => {
      const originalGoal = goalsFromStore.find((g) => g.id === goal.id)
      if (originalGoal) {
        // Обрабатываем действия для незавершенных задач
        if (!goal.completed && goal.action) {
          switch (goal.action) {
            case "tomorrow":
              rescheduleForTomorrow(goal.id)
              break
            case "backlog":
              moveToBacklog(goal.id)
              break
            case "not-relevant":
              deleteGoal(goal.id)
              break
          }
          // После применения действия не нужно обновлять другие поля
          return
        }
        
        // Обновляем статус завершения если изменился
        if (goal.completed !== originalGoal.completed) {
          toggleComplete(goal.id)
        }
        
        // Обновляем основные поля если изменились
        if (goal.type === "goal" && originalGoal.type === "goal") {
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

