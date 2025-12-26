"use client"

import { useEffect, useState } from "react"
import { ConflictsDialog } from "@/components/conflicts-dialog"
import { syncService } from "@/lib/services/sync"
import type { SyncConflicts } from "@/lib/services/sync"

/**
 * Компонент для управления конфликтами синхронизации
 * Монтируется в корне приложения и работает в фоне
 */
export function ConflictsManager() {
  const [conflicts, setConflicts] = useState<SyncConflicts>({
    goals: [],
    habits: [],
    globalGoals: [],
    milestones: [],
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Регистрируем обработчик конфликтов
    syncService.registerConflictsHandler((newConflicts) => {
      const hasConflicts =
        newConflicts.goals.length > 0 ||
        newConflicts.habits.length > 0 ||
        newConflicts.globalGoals.length > 0 ||
        newConflicts.milestones.length > 0
      if (hasConflicts) {
        setConflicts(newConflicts)
        setIsOpen(true)
      }
    })
  }, [])

  const handleResolve = (resolutions: Map<string, "local" | "server">) => {
    // Применяем разрешения конфликтов через sync-service
    const allConflicts = [
      ...conflicts.goals,
      ...conflicts.habits,
      ...conflicts.globalGoals,
      ...conflicts.milestones,
    ]
    for (const conflict of allConflicts) {
      const resolution = resolutions.get(conflict.id)
      if (!resolution) continue

      // Вызываем resolveConflict для каждого конфликта
      // Он обновит localStorage и очередь правильно
      syncService.resolveConflict(conflict.id, resolution)
    }

    // Закрываем диалог и очищаем конфликты
    setIsOpen(false)
    setConflicts({ goals: [], habits: [], globalGoals: [], milestones: [] })

    // Уведомляем sync-service о разрешении всех конфликтов
    // Это запустит sync и возобновит polling
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

