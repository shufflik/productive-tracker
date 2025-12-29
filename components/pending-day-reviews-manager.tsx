"use client"

import { useEffect, useState } from "react"
import { useDayStateStore } from "@/lib/stores/day-state-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { DayReviewDialog, type TaskAction } from "@/components/day-review-dialog"
import { syncService } from "@/lib/services/sync"
import type { Goal } from "@/lib/types"
import type { PendingReviewGoal } from "@/lib/services/sync/types"

/**
 * Компонент для автоматического показа диалогов review для пропущенных дней
 * Монтируется в корне приложения и работает в фоне
 */
export function PendingDayReviewsManager() {
  const pendingReview = useDayStateStore((state) => state.pendingReview)
  const completePendingReview = useDayStateStore((state) => state.completePendingReview)

  const updateGoal = useGoalsStore((state) => state.updateGoal)
  const toggleComplete = useGoalsStore((state) => state.toggleComplete)
  const rescheduleForTomorrow = useGoalsStore((state) => state.rescheduleForTomorrow)
  const moveToBacklog = useGoalsStore((state) => state.moveToBacklog)
  const moveToToday = useGoalsStore((state) => state.moveToToday)
  const deleteGoal = useGoalsStore((state) => state.deleteGoal)

  const [currentReviewDate, setCurrentReviewDate] = useState<string | null>(null)
  const [currentDateGoals, setCurrentDateGoals] = useState<Goal[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Инициализация - pendingReview приходит с бекенда через sync
  useEffect(() => {
    if (!isInitialized) {
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
    const pendingDates = Object.keys(pendingReview)
    if (isInitialized && pendingDates.length > 0 && !currentReviewDate) {
      // Сортируем даты по возрастанию (сначала старые)
      const sortedDates = pendingDates.sort()
      const nextDate = sortedDates[0]
      setCurrentReviewDate(nextDate)
      console.log(`[PendingDayReviewsManager] Pending review days ${sortedDates}`)

      // Goals приходят с бекенда, конвертируем в формат Goal
      const reviewGoals = pendingReview[nextDate] || []
      const dateGoals: Goal[] = reviewGoals.map((g: PendingReviewGoal) => ({
        id: g.id,
        title: g.title,
        description: g.description || undefined,
        targetDate: g.targetDate || undefined,
        isBacklog: g.isBacklog,
        label: g.label || undefined,
        completed: g.completed,
        important: g.important,
        meta: g.meta as Goal["meta"],
        globalGoalId: g.globalGoalId,
        milestoneId: g.milestoneId,
        _version: g._version,
      }))
      setCurrentDateGoals(dateGoals)
    }
  }, [isInitialized, pendingReview, currentReviewDate])

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

    // Получаем актуальное состояние goals из store
    let storeGoals = useGoalsStore.getState().goals

    goalsWithActions.forEach((goal) => {
      let originalGoal = storeGoals.find((g) => g.id === goal.id)

      // Если goal нет в кеше — добавляем из pendingReview
      if (!originalGoal) {
        const pendingGoal = currentDateGoals.find((g) => g.id === goal.id)
        if (pendingGoal) {
          // Добавляем goal в store
          const newGoals = [...useGoalsStore.getState().goals, pendingGoal]
          useGoalsStore.getState().setGoals(newGoals)
          syncService.enqueueGoalChange("create", pendingGoal)
          storeGoals = newGoals
          originalGoal = pendingGoal
        }
      }

      if (!originalGoal) return

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
            const updatedGoalWithMeta = {
              ...currentGoal,
              meta: metaToPreserve,
            }
            useGoalsStore.getState().setGoals(
              useGoalsStore.getState().goals.map((g) => (g.id === goal.id ? updatedGoalWithMeta : g))
            )
            syncService.enqueueGoalChange("update", updatedGoalWithMeta)
          }
        }

        // После применения действия не нужно обновлять другие поля
        return
      }

      // Обновляем meta если оно есть (для incomplete goals без action)
      if (goal.meta && !goal.completed) {
        const currentGoal = useGoalsStore.getState().goals.find((g) => g.id === goal.id)
        if (currentGoal) {
          const updatedGoalWithMeta = {
            ...currentGoal,
            meta: goal.meta,
          }
          useGoalsStore.getState().setGoals(
            useGoalsStore.getState().goals.map((g) => (g.id === goal.id ? updatedGoalWithMeta : g))
          )
          syncService.enqueueGoalChange("update", updatedGoalWithMeta)
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

