"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Package } from "lucide-react"
import type { Goal } from "@/lib/types"

type BacklogDialogProps = {
  open: boolean
  onClose: () => void
  goals: Goal[]
  onMoveToDate: (goalIds: string[]) => void
}

export function BacklogDialog({ open, onClose, goals, onMoveToDate }: BacklogDialogProps) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])

  const toggleGoal = (goalId: string) => {
    if (selectedGoals.includes(goalId)) {
      setSelectedGoals(selectedGoals.filter((id) => id !== goalId))
    } else {
      setSelectedGoals([...selectedGoals, goalId])
    }
  }

  const handleAdd = () => {
    if (selectedGoals.length > 0) {
      onMoveToDate(selectedGoals)
      setSelectedGoals([])
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedGoals([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add from Backlog</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4 overflow-y-auto max-h-[50vh]">
          {goals.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No goals in backlog</p>
            </div>
          ) : (
            goals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => toggleGoal(goal.id)}
              >
                <Checkbox checked={selectedGoals.includes(goal.id)} onCheckedChange={() => toggleGoal(goal.id)} />
                <span className="flex-1 min-w-0 text-sm text-foreground break-words">{goal.title}</span>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selectedGoals.length === 0} className="flex-1">
            Add {selectedGoals.length > 0 && `(${selectedGoals.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
