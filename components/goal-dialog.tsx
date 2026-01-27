"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, Crosshair, X, Flag, TrendingUp, Layers } from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import type { Goal, GlobalGoal, Milestone } from "@/lib/types"

type GoalDialogProps = {
  open: boolean
  onClose: () => void
  onSave: (title: string, label: string, description: string, globalGoalId?: string, milestoneId?: string) => void
  goal?: Goal | null
}

const TYPE_INFO = {
  outcome: { icon: Flag, color: "rgb(139, 92, 246)" },
  process: { icon: TrendingUp, color: "rgb(34, 197, 94)" },
  hybrid: { icon: Layers, color: "rgb(59, 130, 246)" },
}

export function GoalDialog({ open, onClose, onSave, goal }: GoalDialogProps) {
  const globalGoals = useGlobalGoalsStore((state) => state.globalGoals)
  const getMilestonesForGoal = useGlobalGoalsStore((state) => state.getMilestonesForGoal)
  
  // Filter only active goals
  const activeGlobalGoals = useMemo(() => 
    globalGoals.filter((g) => 
      g.status === "in_progress" || g.status === "not_started"
    ),
    [globalGoals]
  )

  const [title, setTitle] = useState("")
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [globalGoalId, setGlobalGoalId] = useState<string | undefined>(undefined)
  const [milestoneId, setMilestoneId] = useState<string | undefined>(undefined)
  const [showGoalSelector, setShowGoalSelector] = useState(false)
  const [showMilestoneSelector, setShowMilestoneSelector] = useState(false)
  const [titleError, setTitleError] = useState("")
  const [labelError, setLabelError] = useState("")

  const selectedGlobalGoal = useMemo(() => 
    globalGoals.find((g) => g.id === globalGoalId),
    [globalGoals, globalGoalId]
  )

  const milestones = useMemo(() => {
    if (!globalGoalId || selectedGlobalGoal?.type !== "outcome") return []
    return getMilestonesForGoal(globalGoalId)
  }, [globalGoalId, selectedGlobalGoal, getMilestonesForGoal])

  const selectedMilestone = useMemo(() => 
    milestones.find((m) => m.id === milestoneId),
    [milestones, milestoneId]
  )

  useEffect(() => {
    if (goal) {
      setTitle(goal.title)
      setLabel(goal.label || "")
      setDescription(goal.description || "")
      setGlobalGoalId(goal.globalGoalId ?? undefined)
      setMilestoneId(goal.milestoneId ?? undefined)
    } else {
      setTitle("")
      setLabel("")
      setDescription("")
      setGlobalGoalId(undefined)
      setMilestoneId(undefined)
    }
    setShowGoalSelector(false)
    setShowMilestoneSelector(false)
  }, [goal, open])

  // Clear milestone when global goal changes
  useEffect(() => {
    if (selectedGlobalGoal?.type !== "outcome") {
      setMilestoneId(undefined)
    }
  }, [globalGoalId, selectedGlobalGoal])

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
    if (!title.trim() || !label.trim()) return
    if (title.length > 50) {
      setTitleError("Title must not exceed 50 characters")
      return
    }
    if (label.length > 25) {
      setLabelError("Label must not exceed 25 characters")
      return
    }

    onSave(title, label, description, globalGoalId, milestoneId)
    onClose()
  }

  const handleClearGlobalGoal = () => {
    setGlobalGoalId(undefined)
    setMilestoneId(undefined)
  }

  const isPostponed = goal?.meta?.isPostponed === true

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit Goal" : "New Goal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 min-w-0">
          <div className="space-y-2 min-w-0">
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
              className={`bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0 ${isPostponed ? "bg-muted cursor-not-allowed" : ""}`}
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

          <div className="space-y-2 min-w-0">
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
              className={`bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0 ${isPostponed ? "bg-muted cursor-not-allowed" : ""}`}
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

          {/* Global Goal Link */}
          {activeGlobalGoals.length > 0 && (
            <div className="space-y-2 min-w-0">
              <Label>Link to Global Goal</Label>
              {selectedGlobalGoal ? (
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border min-w-0 w-full overflow-hidden">
                    {(() => {
                      const typeInfo = TYPE_INFO[selectedGlobalGoal.type]
                      const TypeIcon = typeInfo.icon
                      return <TypeIcon className="w-5 h-5 flex-shrink-0" style={{ color: typeInfo.color }} />
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {selectedGlobalGoal.title}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {selectedGlobalGoal.type} goal
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearGlobalGoal}
                      className="p-1 hover:bg-muted rounded flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  
                  {/* Milestone selector for outcome goals */}
                  {selectedGlobalGoal.type === "outcome" && milestones.length > 0 && (
                    <div className="relative w-full min-w-0 px-3">
                      {selectedMilestone ? (
                        <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/30 min-w-0 w-full overflow-hidden">
                          <Flag className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                          <span className="text-sm text-foreground flex-1 truncate min-w-0">
                            {selectedMilestone.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => setMilestoneId(undefined)}
                            className="p-0.5 hover:bg-purple-500/20 rounded flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5 text-purple-500" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowMilestoneSelector(!showMilestoneSelector)}
                            className="w-full flex items-center justify-between p-2 bg-background border border-dashed border-purple-500/50 rounded-lg text-left hover:border-purple-500 transition-colors"
                          >
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Flag className="w-3.5 h-3.5" />
                              Select milestone <span className="text-destructive">*</span>
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showMilestoneSelector ? "rotate-180" : ""}`} />
                          </button>
                          
                          {showMilestoneSelector && (
                            <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-36 overflow-y-auto">
                              {milestones.map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setMilestoneId(m.id)
                                    setShowMilestoneSelector(false)
                                  }}
                                  className={`w-full flex items-center gap-2 p-2 hover:bg-muted text-left transition-colors text-sm ${
                                    m.isActive ? "bg-purple-500/5" : ""
                                  }`}
                                >
                                  <div className={`w-2 h-2 rounded-full ${
                                    m.isCompleted 
                                      ? "bg-green-500" 
                                      : m.isActive 
                                        ? "bg-purple-500" 
                                        : "bg-muted-foreground"
                                  }`} />
                                  <span className={m.isCompleted ? "text-muted-foreground" : ""}>
                                    {m.title}
                                  </span>
                                  {m.isActive && (
                                    <span className="text-xs text-purple-500 ml-auto">active</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowGoalSelector(!showGoalSelector)}
                    className="w-full flex items-center justify-between p-3 bg-background border border-border rounded-lg text-left hover:border-primary/50 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Crosshair className="w-4 h-4" />
                      Link to global goal (optional)
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showGoalSelector ? "rotate-180" : ""}`} />
                  </button>
                  
                  {showGoalSelector && (
                    <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {activeGlobalGoals.map((g) => {
                        const typeInfo = TYPE_INFO[g.type]
                        const TypeIcon = typeInfo.icon
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setGlobalGoalId(g.id)
                              setShowGoalSelector(false)
                            }}
                            className="w-full flex items-center gap-2 p-3 hover:bg-muted text-left transition-colors first:rounded-t-lg last:rounded-b-lg"
                          >
                            <TypeIcon className="w-5 h-5" style={{ color: typeInfo.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{g.title}</p>
                              <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                                <TypeIcon className="w-3 h-3" style={{ color: typeInfo.color }} />
                                {g.type}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details about this goal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="!field-sizing-fixed resize-none break-words bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !label.trim() || title.length > 50 || label.length > 25 || (selectedGlobalGoal?.type === "outcome" && milestones.length > 0 && !milestoneId)} className="flex-1">
            {goal ? "Update" : "Add"} Goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
