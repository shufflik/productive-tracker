"use client"

import { Check, Circle, Target } from "lucide-react"
import type { Goal, Habit } from "@/lib/types"

type LinkedItemsListProps = {
  linkedGoals: Goal[]
  linkedHabits: Habit[]
  maxGoals?: number
}

export function LinkedItemsList({ linkedGoals, linkedHabits, maxGoals = 3 }: LinkedItemsListProps) {
  if (linkedGoals.length === 0 && linkedHabits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Привяжите задачи и привычки для отслеживания активности.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {linkedHabits.map(h => (
        <div key={h.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm">{h.title}</span>
          <span className="text-xs text-muted-foreground ml-auto">привычка</span>
        </div>
      ))}
      {linkedGoals.slice(0, maxGoals).map(g => (
        <div key={g.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
          {g.completed ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm">{g.title}</span>
        </div>
      ))}
    </div>
  )
}
