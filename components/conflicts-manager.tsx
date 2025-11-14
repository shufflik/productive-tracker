"use client"

import { useEffect, useState } from "react"
import { ConflictsDialog } from "@/components/conflicts-dialog"
import { syncService } from "@/lib/services/sync-service"
import type { Conflict } from "@/lib/services/sync-service"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import type { Goal, Habit } from "@/lib/types"

/**
 * Компонент для управления конфликтами синхронизации
 * Монтируется в корне приложения и работает в фоне
 */
export function ConflictsManager() {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [isOpen, setIsOpen] = useState(false)
  
  const deleteGoal = useGoalsStore((state) => state.deleteGoal)
  const setGoals = useGoalsStore((state) => state.setGoals)
  
  const deleteHabit = useHabitsStore((state) => state.deleteHabit)
  const setHabits = useHabitsStore((state) => state.setHabits)

  useEffect(() => {
    // Регистрируем обработчик конфликтов
    syncService.registerConflictsHandler((newConflicts) => {
      if (newConflicts.length > 0) {
        setConflicts(newConflicts)
        setIsOpen(true)
      }
    })
  }, [])

  const handleResolve = (resolutions: Map<string, "local" | "server">) => {
    // Применяем разрешения конфликтов
    for (const conflict of conflicts) {
      const resolution = resolutions.get(conflict.id)
      if (!resolution) continue

      if (conflict.type === "goal") {
        if (resolution === "local") {
          // Оставляем локальную версию - ничего не делаем, она уже в store
          // Если это была операция delete, нужно убедиться что она удалена
          if (conflict.localOperation === "delete") {
            // Локальная версия уже удалена, ничего не делаем
          }
        } else if (resolution === "server") {
          // Применяем серверную версию
          if (conflict.serverVersion) {
            const serverGoal = conflict.serverVersion as Goal
            // Обновляем или добавляем серверную версию (заменяем полностью)
            const currentGoals = useGoalsStore.getState().goals
            const updatedGoals = currentGoals.filter(g => g.id !== serverGoal.id)
            updatedGoals.push(serverGoal)
            setGoals(updatedGoals)
          } else {
            // Серверная версия отсутствует - удаляем
            deleteGoal(conflict.id)
          }
        }
      } else if (conflict.type === "habit") {
        if (resolution === "local") {
          // Оставляем локальную версию - ничего не делаем
          if (conflict.localOperation === "delete") {
            // Локальная версия уже удалена, ничего не делаем
          }
        } else if (resolution === "server") {
          // Применяем серверную версию
          if (conflict.serverVersion) {
            const serverHabit = conflict.serverVersion as Habit
            // Обновляем или добавляем серверную версию (заменяем полностью)
            const currentHabits = useHabitsStore.getState().habits
            const updatedHabits = currentHabits.filter(h => h.id !== serverHabit.id)
            updatedHabits.push(serverHabit)
            setHabits(updatedHabits)
          } else {
            // Серверная версия отсутствует - удаляем
            deleteHabit(conflict.id)
          }
        }
      }
    }

    // Закрываем диалог и очищаем конфликты
    setIsOpen(false)
    setConflicts([])
    
    // Уведомляем sync-service о разрешении конфликтов
    syncService.onConflictsResolved()
  }

  return (
    <ConflictsDialog
      open={isOpen}
      conflicts={conflicts}
      onResolve={handleResolve}
    />
  )
}

