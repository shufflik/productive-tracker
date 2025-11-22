"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Goal } from "@/lib/types"

type GoalDialogProps = {
  open: boolean
  onClose: () => void
  onSave: (title: string, label: string, description: string) => void
  goal?: Goal | null
}

export function GoalDialog({ open, onClose, onSave, goal }: GoalDialogProps) {
  const [title, setTitle] = useState("")
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [titleError, setTitleError] = useState("")
  const [labelError, setLabelError] = useState("")

  useEffect(() => {
    if (goal) {
      setTitle(goal.title)
      setLabel(goal.label || "")
      setDescription(goal.description || "")
    } else {
      setTitle("")
      setLabel("")
      setDescription("")
    }
  }, [goal, open])

  const handleTitleChange = (value: string) => {
    if (value.length > 50) {
      setTitleError("Title must not exceed 50 characters")
      return
    }
    setTitle(value)
    setTitleError("")
  }

  const handleLabelChange = (value: string) => {
    if (value.length > 25) {
      setLabelError("Label must not exceed 25 characters")
      return
    }
    setLabel(value)
    setLabelError("")
  }

  const handleSave = () => {
    if (!title.trim() || !label.trim()) return // Both fields required
    if (title.length > 50) {
      setTitleError("Title must not exceed 50 characters")
      return
    }
    if (label.length > 25) {
      setLabelError("Label must not exceed 25 characters")
      return
    }

    onSave(title, label, description)
    onClose()
  }

  const isPostponed = goal?.meta?.isPostponed === true

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit Goal" : "New Goal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Complete project proposal"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              maxLength={50}
              onKeyDown={(e) => e.key === "Enter" && label.trim() && handleSave()}
              disabled={isPostponed}
              className={isPostponed ? "bg-muted cursor-not-allowed" : ""}
            />
            {titleError && (
              <p className="text-xs text-destructive">{titleError}</p>
            )}
            {isPostponed && (
              <p className="text-xs text-muted-foreground">
                Title cannot be changed for postponed tasks
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {title.length}/50 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="label"
              placeholder="e.g., Work, Personal, Health"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              maxLength={25}
              disabled={isPostponed}
              className={isPostponed ? "bg-muted cursor-not-allowed" : ""}
            />
            {labelError && (
              <p className="text-xs text-destructive">{labelError}</p>
            )}
            {isPostponed && (
              <p className="text-xs text-muted-foreground">
                Label cannot be changed for postponed tasks
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {label.length}/25 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details about this goal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !label.trim() || title.length > 50 || label.length > 25} className="flex-1">
            {goal ? "Update" : "Add"} Goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
