"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Pencil, 
  Trash2,
  ChevronDown, 
  ChevronUp,
  Plus,
  Check,
  Circle,
  Flag,
  TrendingUp,
  Layers,
  Clock,
  Target
} from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import type { GlobalGoal, GlobalGoalStatus, Milestone, OutcomeProgress, ProcessProgress, HybridProgress } from "@/lib/types"

const STATUS_OPTIONS: { value: GlobalGoalStatus; label: string; color: string }[] = [
  { value: "not_started", label: "Not Started", color: "rgb(156, 163, 175)" },
  { value: "in_progress", label: "In Progress", color: "rgb(59, 130, 246)" },
  { value: "blocked", label: "Blocked", color: "rgb(249, 115, 22)" },
  { value: "achieved", label: "Achieved", color: "rgb(34, 197, 94)" },
  { value: "abandoned", label: "Abandoned", color: "rgb(107, 114, 128)" },
]

type GlobalGoalDetailDialogProps = {
  open: boolean
  onClose: () => void
  goal: GlobalGoal | null
}

function OutcomeDetailView({ goal, progress }: { goal: GlobalGoal; progress: OutcomeProgress }) {
  const allMilestones = useGlobalGoalsStore((state) => state.milestones)
  const addMilestone = useGlobalGoalsStore((state) => state.addMilestone)
  const activateMilestone = useGlobalGoalsStore((state) => state.activateMilestone)
  const completeMilestone = useGlobalGoalsStore((state) => state.completeMilestone)
  const goals = useGoalsStore((state) => state.goals)
  
  const milestones = useMemo(() => 
    allMilestones
      .filter((m) => m.globalGoalId === goal.id)
      .sort((a, b) => a.order - b.order),
    [allMilestones, goal.id]
  )
  
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("")
  
  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return
    await addMilestone(goal.id, newMilestoneTitle.trim())
    setNewMilestoneTitle("")
    setShowAddMilestone(false)
  }
  
  const linkedGoals = useMemo(() => 
    goals.filter(g => g.globalGoalId === goal.id),
    [goals, goal.id]
  )
  
  return (
    <div className="space-y-6">
      {/* Current Phase */}
      {progress.currentMilestone && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-600">Current Phase</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">{progress.currentMilestone.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            <Clock className="w-3.5 h-3.5 inline mr-1" />
            {progress.timeInCurrentMilestone} days in this phase
          </p>
        </div>
      )}
      
      {/* Milestones */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">Milestones</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowAddMilestone(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        
        {showAddMilestone && (
          <div className="flex gap-2">
            <Input
              placeholder="Milestone title"
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
              autoFocus
            />
            <Button size="sm" onClick={handleAddMilestone}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddMilestone(false)}>Cancel</Button>
          </div>
        )}
        
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No milestones yet. Add your first phase.
          </p>
        ) : (
          <div className="space-y-2">
            {milestones.map((milestone, index) => {
              const activityData = progress.activityByMilestone[milestone.id]
              const isActive = milestone.isActive
              const isCompleted = milestone.isCompleted
              
              return (
                <div 
                  key={milestone.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    isActive 
                      ? "border-purple-500 bg-purple-500/5" 
                      : isCompleted 
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted 
                        ? "bg-green-500 text-white" 
                        : isActive 
                          ? "bg-purple-500 text-white"
                          : "bg-muted"
                    }`}>
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className={`font-medium ${isCompleted ? "text-muted-foreground" : "text-foreground"}`}>
                        {milestone.title}
                      </p>
                      {activityData && (
                        <p className="text-xs text-muted-foreground">
                          {activityData.goalsCompleted}/{activityData.goalsTotal} goals • {activityData.daysActive} days active
                        </p>
                      )}
                    </div>
                    
                    {!isCompleted && !isActive && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => activateMilestone(goal.id, milestone.id)}
                      >
                        Start
                      </Button>
                    )}
                    
                    {isActive && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => completeMilestone(goal.id, milestone.id)}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Linked Goals */}
      {linkedGoals.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-foreground">Recent Activity ({linkedGoals.length} goals)</h3>
          <div className="space-y-1">
            {linkedGoals.slice(0, 5).map(g => (
              <div key={g.id} className="flex items-center gap-2 text-sm py-1">
                {g.completed ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={g.completed ? "text-muted-foreground" : "text-foreground"}>{g.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProcessDetailView({ goal, progress }: { goal: GlobalGoal; progress: ProcessProgress }) {
  const goals = useGoalsStore((state) => state.goals)
  const habits = useHabitsStore((state) => state.habits)
  
  const linkedGoals = useMemo(() => goals.filter(g => g.globalGoalId === goal.id), [goals, goal.id])
  const linkedHabits = useMemo(() => habits.filter(h => h.globalGoalId === goal.id), [habits, goal.id])
  
  const trendEmoji = progress.trend === "up" ? "📈" : progress.trend === "down" ? "📉" : "➡️"
  
  return (
    <div className="space-y-6">
      {/* Activity Index */}
      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">Activity Index</span>
          </div>
          <span className="text-2xl font-bold text-green-600">{progress.activityIndex}%</span>
        </div>
        
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.activityIndex}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
          <span>{trendEmoji} {progress.trend}</span>
          <span>🔥 {progress.streakDays} day streak</span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold text-foreground">{progress.totalGoalsCompleted}</p>
          <p className="text-xs text-muted-foreground">Goals completed</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold text-foreground">{progress.totalHabitsCompleted}</p>
          <p className="text-xs text-muted-foreground">Habits completed</p>
        </div>
      </div>
      
      {/* Linked items */}
      <div className="space-y-3">
        <h3 className="font-medium text-foreground">Linked Items</h3>
        
        {linkedGoals.length === 0 && linkedHabits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Link daily goals and habits to track your activity.
          </p>
        ) : (
          <div className="space-y-2">
            {linkedHabits.map(h => (
              <div key={h.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm">{h.title}</span>
                <span className="text-xs text-muted-foreground ml-auto">habit</span>
              </div>
            ))}
            {linkedGoals.slice(0, 3).map(g => (
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
        )}
      </div>
    </div>
  )
}

function HybridDetailView({ goal, progress }: { goal: GlobalGoal; progress: HybridProgress }) {
  const updateGlobalGoal = useGlobalGoalsStore((state) => state.updateGlobalGoal)
  const [editingValue, setEditingValue] = useState(false)
  const [newValue, setNewValue] = useState(String(progress.objectiveProgress.current))
  
  const handleUpdateValue = () => {
    const value = Number(newValue)
    if (!isNaN(value) && value >= 0) {
      updateGlobalGoal(goal.id, { currentValue: value })
    }
    setEditingValue(false)
  }
  
  const trendEmoji = progress.processProgress.trend === "up" ? "📈" : progress.processProgress.trend === "down" ? "📉" : "➡️"
  
  return (
    <div className="space-y-6">
      {/* Objective Progress */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-600">Objective Progress</span>
          </div>
          <span className="text-2xl font-bold text-blue-600">{progress.objectiveProgress.percentage}%</span>
        </div>
        
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.objectiveProgress.percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          {editingValue ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-20 h-8"
                autoFocus
              />
              <span className="text-sm text-muted-foreground">/ {progress.objectiveProgress.target} {progress.objectiveProgress.unit}</span>
              <Button size="sm" onClick={handleUpdateValue}>Save</Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingValue(true)}
              className="text-sm text-foreground hover:text-primary transition-colors"
            >
              {progress.objectiveProgress.current} / {progress.objectiveProgress.target} {progress.objectiveProgress.unit}
              <Pencil className="w-3 h-3 inline ml-1" />
            </button>
          )}
        </div>
      </div>
      
      {/* Process Activity */}
      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">Activity Level</span>
          </div>
          <span className="text-xl font-bold text-green-600">{progress.processProgress.activityIndex}%</span>
        </div>
        
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.processProgress.activityIndex}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{trendEmoji} {progress.processProgress.trend}</span>
          <span>🔥 {progress.processProgress.streakDays} day streak</span>
        </div>
      </div>
    </div>
  )
}

export function GlobalGoalDetailDialog({ 
  open, 
  onClose, 
  goal 
}: GlobalGoalDetailDialogProps) {
  const updateGlobalGoal = useGlobalGoalsStore((state) => state.updateGlobalGoal)
  const deleteGlobalGoal = useGlobalGoalsStore((state) => state.deleteGlobalGoal)
  const calculateProgress = useGlobalGoalsStore((state) => state.calculateProgress)
  
  const goals = useGoalsStore((state) => state.goals)
  const habits = useHabitsStore((state) => state.habits)
  
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const progress = useMemo(() => {
    if (!goal) return null
    const linkedGoals = goals.filter(g => g.globalGoalId === goal.id)
    const linkedHabits = habits.filter(h => h.globalGoalId === goal.id)
    return calculateProgress(goal, linkedGoals, linkedHabits)
  }, [goal, goals, habits, calculateProgress])

  const handleStatusChange = (status: GlobalGoalStatus) => {
    if (goal) {
      updateGlobalGoal(goal.id, { status })
    }
    setShowStatusMenu(false)
  }

  const handleDelete = async () => {
    if (goal) {
      await deleteGlobalGoal(goal.id)
      onClose()
    }
  }

  if (!goal || !progress) return null

  const currentStatus = STATUS_OPTIONS.find(s => s.value === goal.status)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{goal.icon || "🎯"}</span>
            <div className="flex-1">
              <DialogTitle className="text-lg">{goal.title}</DialogTitle>
              
              {/* Status selector */}
              <div className="relative mt-1">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors"
                  style={{ 
                    backgroundColor: `${currentStatus?.color}20`, 
                    color: currentStatus?.color 
                  }}
                >
                  {currentStatus?.label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showStatusMenu && (
                  <div className="absolute top-full mt-1 left-0 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleStatusChange(status.value)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {goal.description && (
            <p className="text-sm text-muted-foreground mb-4">{goal.description}</p>
          )}
          
          {progress.type === "outcome" && (
            <OutcomeDetailView goal={goal} progress={progress as OutcomeProgress} />
          )}
          {progress.type === "process" && (
            <ProcessDetailView goal={goal} progress={progress as ProcessProgress} />
          )}
          {progress.type === "hybrid" && (
            <HybridDetailView goal={goal} progress={progress as HybridProgress} />
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 pt-4 border-t border-border">
          {showDeleteConfirm ? (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDelete}
                className="flex-1 bg-destructive hover:bg-destructive/90"
              >
                Delete Goal
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

