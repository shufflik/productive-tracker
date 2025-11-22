"use client"

import { useEffect, useState } from "react"
import { useDayStateStore } from "@/lib/stores/day-state-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { DayReviewDialog, type TaskAction } from "@/components/day-review-dialog"
import { syncService } from "@/lib/services/sync"
import type { Goal } from "@/lib/types"
import { getTodayLocalISO } from "@/lib/utils/date"

/**
 * Компонент для автоматического показа диалогов review для пропущенных дней
 * Монтируется в корне приложения и работает в фоне
 */
export function PendingDayReviewsManager() {
  const pendingReviewDates = useDayStateStore((state) => state.pendingReviewDates)
  const completePendingReview = useDayStateStore((state) => state.completePendingReview)
  
  const goalsFromStore = useGoalsStore((state) => state.goals)
  const updateGoal = useGoalsStore((state) => state.updateGoal)
  const toggleComplete = useGoalsStore((state) => state.toggleComplete)
  const rescheduleForTomorrow = useGoalsStore((state) => state.rescheduleForTomorrow)
  const moveToBacklog = useGoalsStore((state) => state.moveToBacklog)
  const moveToToday = useGoalsStore((state) => state.moveToToday)
  const deleteGoal = useGoalsStore((state) => state.deleteGoal)
  
  const [currentReviewDate, setCurrentReviewDate] = useState<string | null>(null)
  const [currentDateGoals, setCurrentDateGoals] = useState<Goal[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Инициализация - pendingReviewDates теперь приходят с бекенда через sync
  useEffect(() => {
    if (!isInitialized) {
      // Синхронизируемся, pendingReviewDates придут в ответе sync
      syncService.sync().then(() => {
        setIsInitialized(true)
      }).catch((error) => {
        console.error("[PendingDayReviewsManager] Sync failed:", error)
        setIsInitialized(true)
      })
    }
  }, [isInitialized])

  // Показываем диалог для первой даты из очереди
  useEffect(() => {
    if (isInitialized && pendingReviewDates.length > 0 && !currentReviewDate) {
      // Сортируем даты по возрастанию (сначала старые)
      const sortedDates = [...pendingReviewDates].sort()
      const nextDate = sortedDates[0]
      setCurrentReviewDate(nextDate)
      console.log(`[PendingDayReviewsManager] Pending review days ${sortedDates}`)
      
      // Конвертируем ISO дату в toDateString формат для сравнения с goals
      const nextDateAsDateString = new Date(nextDate + "T00:00:00").toDateString()
      
      // Загружаем goals для этой даты
      const dateGoals = goalsFromStore.filter(
        (g) => g.targetDate === nextDateAsDateString
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
          // Сохраняем meta перед применением действия, чтобы она не потерялась
          const metaToPreserve = goal.meta
          
          switch (goal.action) {
            case "today":
              moveToToday(goal.id)
              break
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
          
          // Обновляем meta после применения действия, чтобы она сохранилась
          if (metaToPreserve) {
            const currentGoal = useGoalsStore.getState().goals.find((g) => g.id === goal.id)
            if (currentGoal) {
              const updatedGoal = {
                ...currentGoal,
                meta: metaToPreserve,
              }
              useGoalsStore.getState().setGoals(
                useGoalsStore.getState().goals.map((g) => (g.id === goal.id ? updatedGoal : g))
              )
              syncService.enqueueGoalChange("update", updatedGoal)
            }
          }
          
          // После применения действия не нужно обновлять другие поля
          return
        }

        // Обновляем meta если оно есть (для incomplete goals без action)
        if (goal.meta && !goal.completed) {
          // Обновляем goal с meta через прямое обновление в store
          const currentGoal = useGoalsStore.getState().goals.find((g) => g.id === goal.id)
          if (currentGoal) {
            const updatedGoal = {
              ...currentGoal,
              meta: goal.meta,
            }
            // Обновляем store
            useGoalsStore.getState().setGoals(
              useGoalsStore.getState().goals.map((g) => (g.id === goal.id ? updatedGoal : g))
            )
            // Ставим в очередь синхронизации
            syncService.enqueueGoalChange("update", updatedGoal)
          }
        }
        
        // Обновляем статус завершения если изменился
        if (goal.completed !== originalGoal.completed) {
          toggleComplete(goal.id)
        }

        // Обновляем основные поля если изменились
        if (goal.title !== originalGoal.title ||
            goal.description !== originalGoal.description ||
            goal.label !== originalGoal.label) {
          updateGoal(goal.id, goal.title, goal.label || "", goal.description || "")
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

