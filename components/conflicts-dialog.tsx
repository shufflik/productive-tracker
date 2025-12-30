"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { SyncConflicts } from "@/lib/services/sync"
import type { Goal, Habit, GlobalGoal, Milestone } from "@/lib/types"
import { AlertTriangle } from "lucide-react"

type ConflictsDialogProps = {
  open: boolean
  conflicts: SyncConflicts
  onResolve: (resolutions: Map<string, "local" | "server">) => void
}

export function ConflictsDialog({ open, conflicts, onResolve }: ConflictsDialogProps) {
  const [resolutions, setResolutions] = useState<Map<string, "local" | "server">>(new Map())

  const totalConflicts = conflicts.goals.length + conflicts.habits.length + conflicts.globalGoals.length + conflicts.milestones.length

  const handleResolutionChange = (conflictId: string, choice: "local" | "server") => {
    const newResolutions = new Map(resolutions)
    newResolutions.set(conflictId, choice)
    setResolutions(newResolutions)
  }

  const handleResolve = () => {
    // Убеждаемся, что все конфликты разрешены
    const allGoalsResolved = conflicts.goals.every(c => resolutions.has(c.id))
    const allHabitsResolved = conflicts.habits.every(c => resolutions.has(c.id))
    const allGlobalGoalsResolved = conflicts.globalGoals.every(c => resolutions.has(c.id))
    const allMilestonesResolved = conflicts.milestones.every(c => resolutions.has(c.id))

    if (!allGoalsResolved || !allHabitsResolved || !allGlobalGoalsResolved || !allMilestonesResolved) {
      return
    }
    onResolve(resolutions)
    setResolutions(new Map())
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleString()
  }

  const getGoalDetails = (goal: Goal | undefined) => {
    if (!goal) return null
    return {
      type: "Goal",
      description: goal.description,
      targetDate: goal.targetDate,
      label: goal.label,
      completed: goal.completed,
      important: goal.important,
    }
  }

  const getHabitDetails = (habit: Habit | undefined) => {
    if (!habit) return null
    return {
      type: "Habit",
      repeatType: habit.repeatType,
      currentStreak: habit.currentStreak,
      completed: habit.completed,
      important: habit.important,
    }
  }

  const getGlobalGoalDetails = (globalGoal: GlobalGoal | undefined) => {
    if (!globalGoal) return null
    return {
      type: globalGoal.type,
      description: globalGoal.description,
      status: globalGoal.status,
      periodStart: globalGoal.periodStart,
      periodEnd: globalGoal.periodEnd,
      targetValue: globalGoal.targetValue,
      currentValue: globalGoal.currentValue,
      unit: globalGoal.unit,
    }
  }

  const getMilestoneDetails = (milestone: Milestone | undefined) => {
    if (!milestone) return null
    return {
      description: milestone.description,
      order: milestone.order,
      isActive: milestone.isActive,
      isCompleted: milestone.isCompleted,
      enteredAt: milestone.enteredAt,
      exitedAt: milestone.exitedAt,
    }
  }

  const formatGlobalGoalType = (type: GlobalGoal["type"]) => {
    switch (type) {
      case "outcome": return "Результат"
      case "process": return "Процесс"
      case "hybrid": return "Гибридная"
      default: return type
    }
  }

  const formatGlobalGoalStatus = (status: GlobalGoal["status"]) => {
    switch (status) {
      case "not_started": return "Не начата"
      case "in_progress": return "В процессе"
      case "achieved": return "Достигнута"
      default: return status
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden" showCloseButton={false}>
        {/* Фиксированный header */}
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0 border-b border-border text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-base sm:text-lg">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
            <span>Конфликты синхронизации</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm mt-1">
            Обнаружены конфликты при синхронизации данных. Выберите версию для каждого конфликта.
          </DialogDescription>
        </DialogHeader>

        {/* Скроллируемая область с конфликтами */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* Goals conflicts */}
          {conflicts.goals.map((conflict) => {
            const localGoal = conflict.localEntity
            const serverGoal = conflict.serverEntity
            const resolution = resolutions.get(conflict.id)
            const localDetails = getGoalDetails(localGoal)
            const serverDetails = getGoalDetails(serverGoal)

            return (
              <div key={conflict.id} className="border border-border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">
                    Цель: {localGoal?.title || serverGoal?.title || "N/A"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{conflict.message}</p>
                </div>

                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Локальная версия */}
                  <div className={`border-2 rounded-lg p-2 sm:p-3 ${resolution === "local" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">Локальная версия</span>
                      <Button
                        size="sm"
                        variant={resolution === "local" ? "default" : "outline"}
                        onClick={() => handleResolutionChange(conflict.id, "local")}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        {resolution === "local" ? "✓ Выбрано" : "Выбрать"}
                      </Button>
                    </div>
                    {localGoal ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="break-words"><strong>Название:</strong> {localGoal.title}</p>
                        {localDetails?.description && (
                          <p className="break-words"><strong>Описание:</strong> {localDetails.description}</p>
                        )}
                        {localDetails?.targetDate && <p><strong>Дата:</strong> {localDetails.targetDate}</p>}
                        {localDetails?.label && <p><strong>Метка:</strong> {localDetails.label}</p>}
                        <p><strong>Выполнено:</strong> {localDetails?.completed ? "Да" : "Нет"}</p>
                        {localDetails?.important !== undefined && <p><strong>Важное:</strong> {localDetails.important ? "Да" : "Нет"}</p>}
                        {localGoal._localUpdatedAt && (
                          <p className="text-[10px] sm:text-xs"><strong>Обновлено:</strong> {formatDate(localGoal._localUpdatedAt)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Локальная версия отсутствует</p>
                    )}
                  </div>

                  {/* Серверная версия */}
                  <div className={`border-2 rounded-lg p-2 sm:p-3 ${resolution === "server" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">Серверная версия</span>
                      <Button
                        size="sm"
                        variant={resolution === "server" ? "default" : "outline"}
                        onClick={() => handleResolutionChange(conflict.id, "server")}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        {resolution === "server" ? "✓ Выбрано" : "Выбрать"}
                      </Button>
                    </div>
                    {serverGoal ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="break-words"><strong>Название:</strong> {serverGoal.title}</p>
                        {serverDetails?.description && (
                          <p className="break-words"><strong>Описание:</strong> {serverDetails.description}</p>
                        )}
                        {serverDetails?.targetDate && <p><strong>Дата:</strong> {serverDetails.targetDate}</p>}
                        {serverDetails?.label && <p><strong>Метка:</strong> {serverDetails.label}</p>}
                        <p><strong>Выполнено:</strong> {serverDetails?.completed ? "Да" : "Нет"}</p>
                        {serverDetails?.important !== undefined && <p><strong>Важное:</strong> {serverDetails.important ? "Да" : "Нет"}</p>}
                        {serverGoal._localUpdatedAt && (
                          <p className="text-[10px] sm:text-xs"><strong>Обновлено:</strong> {formatDate(serverGoal._localUpdatedAt)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Серверная версия отсутствует</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Habits conflicts */}
          {conflicts.habits.map((conflict) => {
            const localHabit = conflict.localEntity
            const serverHabit = conflict.serverEntity
            const resolution = resolutions.get(conflict.id)
            const localDetails = getHabitDetails(localHabit)
            const serverDetails = getHabitDetails(serverHabit)

            return (
              <div key={conflict.id} className="border border-border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">
                    Привычка: {localHabit?.title || serverHabit?.title || "N/A"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{conflict.message}</p>
                </div>

                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Локальная версия */}
                  <div className={`border-2 rounded-lg p-2 sm:p-3 ${resolution === "local" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">Локальная версия</span>
                      <Button
                        size="sm"
                        variant={resolution === "local" ? "default" : "outline"}
                        onClick={() => handleResolutionChange(conflict.id, "local")}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        {resolution === "local" ? "✓ Выбрано" : "Выбрать"}
                      </Button>
                    </div>
                    {localHabit ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="break-words"><strong>Название:</strong> {localHabit.title}</p>
                        {localDetails?.repeatType && <p><strong>Тип:</strong> {localDetails.repeatType}</p>}
                        {localDetails?.currentStreak !== undefined && <p><strong>Стрик:</strong> {localDetails.currentStreak}</p>}
                        <p><strong>Выполнено:</strong> {localDetails?.completed ? "Да" : "Нет"}</p>
                        {localDetails?.important !== undefined && <p><strong>Важное:</strong> {localDetails.important ? "Да" : "Нет"}</p>}
                        {localHabit._localUpdatedAt && (
                          <p className="text-[10px] sm:text-xs"><strong>Обновлено:</strong> {formatDate(localHabit._localUpdatedAt)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Локальная версия отсутствует</p>
                    )}
                  </div>

                  {/* Серверная версия */}
                  <div className={`border-2 rounded-lg p-2 sm:p-3 ${resolution === "server" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">Серверная версия</span>
                      <Button
                        size="sm"
                        variant={resolution === "server" ? "default" : "outline"}
                        onClick={() => handleResolutionChange(conflict.id, "server")}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        {resolution === "server" ? "✓ Выбрано" : "Выбрать"}
                      </Button>
                    </div>
                    {serverHabit ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="break-words"><strong>Название:</strong> {serverHabit.title}</p>
                        {serverDetails?.repeatType && <p><strong>Тип:</strong> {serverDetails.repeatType}</p>}
                        {serverDetails?.currentStreak !== undefined && <p><strong>Стрик:</strong> {serverDetails.currentStreak}</p>}
                        <p><strong>Выполнено:</strong> {serverDetails?.completed ? "Да" : "Нет"}</p>
                        {serverDetails?.important !== undefined && <p><strong>Важное:</strong> {serverDetails.important ? "Да" : "Нет"}</p>}
                        {serverHabit._localUpdatedAt && (
                          <p className="text-[10px] sm:text-xs"><strong>Обновлено:</strong> {formatDate(serverHabit._localUpdatedAt)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Серверная версия отсутствует</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* GlobalGoals conflicts */}
          {conflicts.globalGoals.map((conflict) => {
            const localGlobalGoal = conflict.localEntity
            const serverGlobalGoal = conflict.serverEntity
            const resolution = resolutions.get(conflict.id)
            const localDetails = getGlobalGoalDetails(localGlobalGoal)
            const serverDetails = getGlobalGoalDetails(serverGlobalGoal)

            return (
              <div key={conflict.id} className="border border-border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">
                    Глобальная цель: {localGlobalGoal?.title || serverGlobalGoal?.title || "N/A"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{conflict.message}</p>
                </div>

                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Локальная версия */}
                  <div className={`border-2 rounded-lg p-2 sm:p-3 ${resolution === "local" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">Локальная версия</span>
                      <Button
                        size="sm"
                        variant={resolution === "local" ? "default" : "outline"}
                        onClick={() => handleResolutionChange(conflict.id, "local")}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        {resolution === "local" ? "✓ Выбрано" : "Выбрать"}
                      </Button>
                    </div>
                    {localGlobalGoal ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="break-words"><strong>Название:</strong> {localGlobalGoal.title}</p>
                        {localDetails?.type && <p><strong>Тип:</strong> {formatGlobalGoalType(localDetails.type)}</p>}
                        {localDetails?.status && <p><strong>Статус:</strong> {formatGlobalGoalStatus(localDetails.status)}</p>}
                        {localDetails?.description && (
                          <p className="break-words"><strong>Описание:</strong> {localDetails.description}</p>
                        )}
                        {localDetails?.periodStart && <p><strong>Начало:</strong> {localDetails.periodStart}</p>}
                        {localDetails?.periodEnd && <p><strong>Окончание:</strong> {localDetails.periodEnd}</p>}
                        {localDetails?.targetValue !== undefined && localDetails?.unit && (
                          <p><strong>Прогресс:</strong> {localDetails.currentValue ?? 0}/{localDetails.targetValue} {localDetails.unit}</p>
                        )}
                        {localGlobalGoal._localUpdatedAt && (
                          <p className="text-[10px] sm:text-xs"><strong>Обновлено:</strong> {formatDate(localGlobalGoal._localUpdatedAt)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Локальная версия отсутствует</p>
                    )}
                  </div>

                  {/* Серверная версия */}
                  <div className={`border-2 rounded-lg p-2 sm:p-3 ${resolution === "server" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">Серверная версия</span>
                      <Button
                        size="sm"
                        variant={resolution === "server" ? "default" : "outline"}
                        onClick={() => handleResolutionChange(conflict.id, "server")}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        {resolution === "server" ? "✓ Выбрано" : "Выбрать"}
                      </Button>
                    </div>
                    {serverGlobalGoal ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="break-words"><strong>Название:</strong> {serverGlobalGoal.title}</p>
                        {serverDetails?.type && <p><strong>Тип:</strong> {formatGlobalGoalType(serverDetails.type)}</p>}
                        {serverDetails?.status && <p><strong>Статус:</strong> {formatGlobalGoalStatus(serverDetails.status)}</p>}
                        {serverDetails?.description && (
                          <p className="break-words"><strong>Описание:</strong> {serverDetails.description}</p>
                        )}
                        {serverDetails?.periodStart && <p><strong>Начало:</strong> {serverDetails.periodStart}</p>}
                        {serverDetails?.periodEnd && <p><strong>Окончание:</strong> {serverDetails.periodEnd}</p>}
                        {serverDetails?.targetValue !== undefined && serverDetails?.unit && (
                          <p><strong>Прогресс:</strong> {serverDetails.currentValue ?? 0}/{serverDetails.targetValue} {serverDetails.unit}</p>
                        )}
                        {serverGlobalGoal._localUpdatedAt && (
                          <p className="text-[10px] sm:text-xs"><strong>Обновлено:</strong> {formatDate(serverGlobalGoal._localUpdatedAt)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Серверная версия отсутствует</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Milestones conflicts */}
          {conflicts.milestones.map((conflict) => {
            const localMilestone = conflict.localEntity
            const serverMilestone = conflict.serverEntity
            const resolution = resolutions.get(conflict.id)
            const localDetails = getMilestoneDetails(localMilestone)
            const serverDetails = getMilestoneDetails(serverMilestone)

            return (
              <div key={conflict.id} className="border border-border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">
                    Этап: {localMilestone?.title || serverMilestone?.title || "N/A"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{conflict.message}</p>
                </div>

                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Локальная версия */}
                  <div className={`border-2 rounded-lg p-2 sm:p-3 ${resolution === "local" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">Локальная версия</span>
                      <Button
                        size="sm"
                        variant={resolution === "local" ? "default" : "outline"}
                        onClick={() => handleResolutionChange(conflict.id, "local")}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        {resolution === "local" ? "✓ Выбрано" : "Выбрать"}
                      </Button>
                    </div>
                    {localMilestone ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="break-words"><strong>Название:</strong> {localMilestone.title}</p>
                        {localDetails?.description && (
                          <p className="break-words"><strong>Описание:</strong> {localDetails.description}</p>
                        )}
                        <p><strong>Порядок:</strong> {localDetails?.order}</p>
                        <p><strong>Активный:</strong> {localDetails?.isActive ? "Да" : "Нет"}</p>
                        <p><strong>Завершён:</strong> {localDetails?.isCompleted ? "Да" : "Нет"}</p>
                        {localDetails?.enteredAt && <p><strong>Начат:</strong> {localDetails.enteredAt}</p>}
                        {localDetails?.exitedAt && <p><strong>Завершён:</strong> {localDetails.exitedAt}</p>}
                        {localMilestone._localUpdatedAt && (
                          <p className="text-[10px] sm:text-xs"><strong>Обновлено:</strong> {formatDate(localMilestone._localUpdatedAt)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Локальная версия отсутствует</p>
                    )}
                  </div>

                  {/* Серверная версия */}
                  <div className={`border-2 rounded-lg p-2 sm:p-3 ${resolution === "server" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-foreground">Серверная версия</span>
                      <Button
                        size="sm"
                        variant={resolution === "server" ? "default" : "outline"}
                        onClick={() => handleResolutionChange(conflict.id, "server")}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        {resolution === "server" ? "✓ Выбрано" : "Выбрать"}
                      </Button>
                    </div>
                    {serverMilestone ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="break-words"><strong>Название:</strong> {serverMilestone.title}</p>
                        {serverDetails?.description && (
                          <p className="break-words"><strong>Описание:</strong> {serverDetails.description}</p>
                        )}
                        <p><strong>Порядок:</strong> {serverDetails?.order}</p>
                        <p><strong>Активный:</strong> {serverDetails?.isActive ? "Да" : "Нет"}</p>
                        <p><strong>Завершён:</strong> {serverDetails?.isCompleted ? "Да" : "Нет"}</p>
                        {serverDetails?.enteredAt && <p><strong>Начат:</strong> {serverDetails.enteredAt}</p>}
                        {serverDetails?.exitedAt && <p><strong>Завершён:</strong> {serverDetails.exitedAt}</p>}
                        {serverMilestone._localUpdatedAt && (
                          <p className="text-[10px] sm:text-xs"><strong>Обновлено:</strong> {formatDate(serverMilestone._localUpdatedAt)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Серверная версия отсутствует</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Фиксированный footer */}
        <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 flex-shrink-0 border-t border-border flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            onClick={handleResolve}
            disabled={totalConflicts === 0 || resolutions.size < totalConflicts}
            className="w-full sm:w-auto text-sm"
          >
            Применить ({resolutions.size}/{totalConflicts})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

