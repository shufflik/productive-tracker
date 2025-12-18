"use client"

import { useState, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Target, TrendingUp, Layers, Flag, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlobalGoalDialog } from "@/components/global-goal-dialog"
import { GlobalGoalDetailDialog } from "@/components/global-goal-detail-dialog"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import type { GlobalGoal, GlobalGoalType, GlobalGoalProgress } from "@/lib/types"

const TYPE_INFO: Record<GlobalGoalType, { label: string; icon: typeof Target; color: string }> = {
  outcome: { label: "Outcome", icon: Flag, color: "rgb(139, 92, 246)" },
  process: { label: "Process", icon: TrendingUp, color: "rgb(34, 197, 94)" },
  hybrid: { label: "Hybrid", icon: Layers, color: "rgb(59, 130, 246)" },
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "rgb(156, 163, 175)",
  in_progress: "rgb(59, 130, 246)",
  blocked: "rgb(249, 115, 22)",
  achieved: "rgb(34, 197, 94)",
  abandoned: "rgb(107, 114, 128)",
}

function OutcomeProgressDisplay({ progress }: { progress: GlobalGoalProgress & { type: "outcome" } }) {
  const { currentMilestone, timeInCurrentMilestone, milestonesCompleted, totalMilestones } = progress
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500 transition-all"
            style={{ width: totalMilestones > 0 ? `${(milestonesCompleted / totalMilestones) * 100}%` : '0%' }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {milestonesCompleted}/{totalMilestones}
        </span>
      </div>
      {currentMilestone && (
        <p className="text-xs text-muted-foreground">
          📍 {currentMilestone.title} • {timeInCurrentMilestone}d
        </p>
      )}
    </div>
  )
}

function ProcessProgressDisplay({ progress }: { progress: GlobalGoalProgress & { type: "process" } }) {
  const { activityIndex, trend, streakDays } = progress
  
  const trendIcon = trend === "up" ? "📈" : trend === "down" ? "📉" : "➡️"
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${activityIndex}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-xs font-medium text-green-600">{activityIndex}%</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {trendIcon} {trend} • 🔥 {streakDays}d streak
      </p>
    </div>
  )
}

function HybridProgressDisplay({ progress }: { progress: GlobalGoalProgress & { type: "hybrid" } }) {
  const { objectiveProgress, processProgress } = progress
  
  return (
    <div className="space-y-2">
      {/* Objective progress */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${objectiveProgress.percentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-xs font-medium text-blue-600">{objectiveProgress.percentage}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {objectiveProgress.current}/{objectiveProgress.target} {objectiveProgress.unit}
        </p>
      </div>
      {/* Process indicator */}
      <p className="text-xs text-muted-foreground">
        Activity: {processProgress.activityIndex}% {processProgress.trend === "up" ? "📈" : processProgress.trend === "down" ? "📉" : "➡️"}
      </p>
    </div>
  )
}

function GlobalGoalCard({
  goal,
  progress,
  onClick,
}: {
  goal: GlobalGoal
  progress: GlobalGoalProgress
  onClick: () => void
}) {
  const typeInfo = TYPE_INFO[goal.type]
  const TypeIcon = typeInfo.icon
  const statusColor = STATUS_COLORS[goal.status]
  
  const activeMilestone = useGlobalGoalsStore((state) => state.getActiveMilestone(goal.id))
  
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${typeInfo.color}20` }}
        >
          {goal.icon || "🎯"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{goal.title}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span 
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}
            >
              {typeInfo.label}
            </span>
            <span 
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
            >
              {goal.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </div>
      
      {/* Progress */}
      {progress.type === "outcome" && <OutcomeProgressDisplay progress={progress} />}
      {progress.type === "process" && <ProcessProgressDisplay progress={progress} />}
      {progress.type === "hybrid" && <HybridProgressDisplay progress={progress} />}
    </motion.button>
  )
}

export function GlobalGoalsView() {
  const globalGoals = useGlobalGoalsStore((state) => state.globalGoals)
  const fetchGlobalGoals = useGlobalGoalsStore((state) => state.fetchGlobalGoals)
  const calculateProgress = useGlobalGoalsStore((state) => state.calculateProgress)
  const isLoading = useGlobalGoalsStore((state) => state.isLoading)
  
  const goals = useGoalsStore((state) => state.goals)
  const habits = useHabitsStore((state) => state.habits)

  const [selectedType, setSelectedType] = useState<GlobalGoalType | "all">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<GlobalGoal | null>(null)

  useEffect(() => {
    fetchGlobalGoals()
  }, [fetchGlobalGoals])

  // Calculate progress for each goal
  const goalsWithProgress = useMemo(() => {
    return globalGoals.map((goal) => {
      const linkedGoals = goals.filter((g) => g.globalGoalId === goal.id)
      const linkedHabits = habits.filter((h) => h.globalGoalId === goal.id)
      const progress = calculateProgress(goal, linkedGoals, linkedHabits)
      
      return { goal, progress, linkedGoals, linkedHabits }
    })
  }, [globalGoals, goals, habits, calculateProgress])

  // Filter by type
  const filteredGoals = useMemo(() => {
    let filtered = goalsWithProgress
    
    if (selectedType !== "all") {
      filtered = filtered.filter((g) => g.goal.type === selectedType)
    }

    // Sort: active first, then by status
    return filtered.sort((a, b) => {
      const statusOrder = { in_progress: 0, not_started: 1, blocked: 2, achieved: 3, abandoned: 4 }
      return (statusOrder[a.goal.status] || 5) - (statusOrder[b.goal.status] || 5)
    })
  }, [goalsWithProgress, selectedType])

  const handleOpenDetail = (goal: GlobalGoal) => {
    setSelectedGoal(goal)
    setDetailOpen(true)
  }

  // Stats
  const stats = useMemo(() => {
    const active = goalsWithProgress.filter((g) => 
      g.goal.status === "in_progress" || g.goal.status === "not_started"
    )
    const achieved = goalsWithProgress.filter((g) => g.goal.status === "achieved")
    
    return {
      activeCount: active.length,
      achievedCount: achieved.length,
      byType: {
        outcome: goalsWithProgress.filter(g => g.goal.type === "outcome").length,
        process: goalsWithProgress.filter(g => g.goal.type === "process").length,
        hybrid: goalsWithProgress.filter(g => g.goal.type === "hybrid").length,
      }
    }
  }, [goalsWithProgress])

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Type Filter */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg flex-shrink-0 overflow-x-auto">
        <button
          onClick={() => setSelectedType("all")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            selectedType === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {(["outcome", "process", "hybrid"] as const).map((type) => {
          const info = TYPE_INFO[type]
          const Icon = info.icon
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
                selectedType === type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {info.label}
            </button>
          )
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Global Goals</h2>
          <p className="text-sm text-muted-foreground">
            {stats.activeCount} active • {stats.achievedCount} achieved
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} variant="ghost" size="icon">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Goals List */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide space-y-3">
        {isLoading && globalGoals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-4">Loading goals...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              {selectedType === "all" 
                ? "No global goals yet" 
                : `No ${TYPE_INFO[selectedType].label.toLowerCase()} goals`
              }
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Goal
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGoals.map(({ goal, progress }) => (
              <GlobalGoalCard
                key={goal.id}
                goal={goal}
                progress={progress}
                onClick={() => handleOpenDetail(goal)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <GlobalGoalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />

      <GlobalGoalDetailDialog
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedGoal(null)
        }}
        goal={selectedGoal}
      />
    </div>
  )
}

