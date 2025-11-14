"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Conflict } from "@/lib/services/sync-service"
import type { Goal, Habit } from "@/lib/types"
import { AlertTriangle } from "lucide-react"

type ConflictsDialogProps = {
  open: boolean
  conflicts: Conflict[]
  onResolve: (resolutions: Map<string, "local" | "server">) => void
}

export function ConflictsDialog({ open, conflicts, onResolve }: ConflictsDialogProps) {
  const [resolutions, setResolutions] = useState<Map<string, "local" | "server">>(new Map())

  const handleResolutionChange = (conflictId: string, choice: "local" | "server") => {
    const newResolutions = new Map(resolutions)
    newResolutions.set(conflictId, choice)
    setResolutions(newResolutions)
  }

  const handleResolve = () => {
    // Убеждаемся, что все конфликты разрешены
    const allResolved = conflicts.every(c => resolutions.has(c.id))
    if (!allResolved) {
      return
    }
    onResolve(resolutions)
    setResolutions(new Map())
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleString()
  }

  const getEntityTitle = (entity: Goal | Habit | undefined) => {
    if (!entity) return "N/A"
    return entity.title
  }

  const getEntityDetails = (entity: Goal | Habit | undefined) => {
    if (!entity) return null
    if (entity.type === "goal") {
      const goal = entity as Goal
      return {
        type: "Goal",
        description: goal.description,
        targetDate: goal.targetDate,
        label: goal.label,
        completed: goal.completed,
        important: goal.important,
      }
    } else {
      const habit = entity as Habit
      return {
        type: "Habit",
        repeatType: habit.repeatType,
        currentStreak: habit.currentStreak,
        completed: habit.completed,
        important: habit.important,
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden" showCloseButton={false}>
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
          {conflicts.map((conflict) => {
            const localEntity = conflict.localVersion as Goal | Habit | undefined
            const serverEntity = conflict.serverVersion as Goal | Habit | undefined
            const resolution = resolutions.get(conflict.id) // undefined если не выбрано
            const localDetails = getEntityDetails(localEntity)
            const serverDetails = getEntityDetails(serverEntity)

            return (
              <div key={conflict.id} className="border border-border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">
                    {conflict.type === "goal" ? "Цель" : "Привычка"}: {getEntityTitle(localEntity) || getEntityTitle(serverEntity)}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{conflict.message}</p>
                </div>

                {/* Мобильная версия: вертикальная компоновка, десктоп: две колонки */}
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
                    {localEntity ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="break-words"><strong>Название:</strong> {localEntity.title}</p>
                        {localDetails && (
                          <>
                            {localDetails.description && (
                              <p className="break-words"><strong>Описание:</strong> {localDetails.description}</p>
                            )}
                            {localDetails.targetDate && <p><strong>Дата:</strong> {localDetails.targetDate}</p>}
                            {localDetails.label && <p><strong>Метка:</strong> {localDetails.label}</p>}
                            {localDetails.repeatType && <p><strong>Тип:</strong> {localDetails.repeatType}</p>}
                            {localDetails.currentStreak !== undefined && <p><strong>Стрик:</strong> {localDetails.currentStreak}</p>}
                            <p><strong>Выполнено:</strong> {localDetails.completed ? "Да" : "Нет"}</p>
                            {localDetails.important !== undefined && <p><strong>Важное:</strong> {localDetails.important ? "Да" : "Нет"}</p>}
                            {localEntity._localUpdatedAt && (
                              <p className="text-[10px] sm:text-xs"><strong>Обновлено:</strong> {formatDate(localEntity._localUpdatedAt)}</p>
                            )}
                          </>
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
                    {serverEntity ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="break-words"><strong>Название:</strong> {serverEntity.title}</p>
                        {serverDetails && (
                          <>
                            {serverDetails.description && (
                              <p className="break-words"><strong>Описание:</strong> {serverDetails.description}</p>
                            )}
                            {serverDetails.targetDate && <p><strong>Дата:</strong> {serverDetails.targetDate}</p>}
                            {serverDetails.label && <p><strong>Метка:</strong> {serverDetails.label}</p>}
                            {serverDetails.repeatType && <p><strong>Тип:</strong> {serverDetails.repeatType}</p>}
                            {serverDetails.currentStreak !== undefined && <p><strong>Стрик:</strong> {serverDetails.currentStreak}</p>}
                            <p><strong>Выполнено:</strong> {serverDetails.completed ? "Да" : "Нет"}</p>
                            {serverDetails.important !== undefined && <p><strong>Важное:</strong> {serverDetails.important ? "Да" : "Нет"}</p>}
                            {serverEntity._localUpdatedAt && (
                              <p className="text-[10px] sm:text-xs"><strong>Обновлено:</strong> {formatDate(serverEntity._localUpdatedAt)}</p>
                            )}
                          </>
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
            disabled={conflicts.length === 0 || !conflicts.every(c => resolutions.has(c.id))}
            className="w-full sm:w-auto text-sm"
          >
            Применить ({resolutions.size}/{conflicts.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

