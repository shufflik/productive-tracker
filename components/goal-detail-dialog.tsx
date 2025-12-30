"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Goal } from "@/lib/types"

type GoalDetailDialogProps = {
  open: boolean
  onClose: () => void
  goal: Goal | null
}

export function GoalDetailDialog({ open, onClose, goal }: GoalDetailDialogProps) {
  if (!goal) return null

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
        </div>

        <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}

