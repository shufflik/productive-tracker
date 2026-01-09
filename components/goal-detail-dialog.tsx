"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Crosshair, Flag } from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import type { Goal } from "@/lib/types"

type GoalDetailDialogProps = {
  open: boolean
  onClose: () => void
  goal: Goal | null
}

export function GoalDetailDialog({ open, onClose, goal }: GoalDetailDialogProps) {
  const getGlobalGoalById = useGlobalGoalsStore((state) => state.getGlobalGoalById)
  const milestones = useGlobalGoalsStore((state) => state.milestones)

  if (!goal) return null

  const linkedGlobalGoal = goal.globalGoalId ? getGlobalGoalById(goal.globalGoalId) : undefined
  const linkedMilestone = goal.milestoneId ? milestones.find(m => m.id === goal.milestoneId) : undefined

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="break-words">Goal Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Title</p>
            <p className="text-base text-foreground break-words">{goal.title}</p>
          </div>

          {goal.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 max-h-[7rem] overflow-auto scrollbar-hide">
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{goal.description}</p>
              </div>
            </div>
          )}

          {goal.label && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Label</p>
              <p className="text-base text-foreground break-words">{goal.label}</p>
            </div>
          )}

          {linkedGlobalGoal && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Crosshair className="w-4 h-4" />
                <span>Global Goal</span>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-foreground">{linkedGlobalGoal.title}</p>
                {linkedMilestone && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <Flag className="w-3 h-3" />
                    <span>{linkedMilestone.title}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Button variant="outline" onClick={onClose} className="w-full hover:bg-transparent">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}

