"use client"

import { useState, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Target, TrendingUp, TrendingDown, Layers, Flag, ChevronRight, MapPin, Pause, Circle, ArrowRight, Flame, BarChart3, Calendar } from "lucide-react"
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

// Calculate days remaining until deadline
function calculateDaysRemaining(periodEnd?: string): { days: number; isOverdue: boolean } | null {
  if (!periodEnd) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const deadline = new Date(periodEnd)
  deadline.setHours(0, 0, 0, 0)

  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return {
    days: Math.abs(diffDays),
    isOverdue: diffDays < 0
  }
}

function DeadlineDisplay({ periodEnd }: { periodEnd?: string }) {
  const result = calculateDaysRemaining(periodEnd)
  if (!result) return null

  const { days, isOverdue } = result

  if (isOverdue) {
    return (
      <div className="flex items-center gap-1 text-xs text-red-500">
        <Calendar className="w-3 h-3" />
        <span>Просрочено на {days} {days === 1 ? "день" : days < 5 ? "дня" : "дней"}</span>
      </div>
    )
  }

  if (days === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-orange-500">
        <Calendar className="w-3 h-3" />
        <span>Сегодня дедлайн</span>
      </div>
    )
  }

  if (days <= 7) {
    return (
      <div className="flex items-center gap-1 text-xs text-orange-500">
        <Calendar className="w-3 h-3" />
        <span>Осталось {days} {days === 1 ? "день" : days < 5 ? "дня" : "дней"}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Calendar className="w-3 h-3" />
      <span>Осталось {days} {days === 1 ? "день" : days < 5 ? "дня" : "дней"}</span>
    </div>
  )
}

function OutcomeProgressDisplay({ progress }: { progress: GlobalGoalProgress & { type: "outcome" } }) {
  const { currentMilestone, timeInCurrentMilestone, milestoneHistory } = progress

  // ЗАПРЕЩЕНО показывать progress bar или проценты milestones
  // Показываем только текущий этап и время в нём

  const completedCount = milestoneHistory.filter(m => m.isCompleted).length
  const hasNoActiveMilestone = !currentMilestone && completedCount > 0

  return (
    <div className="flex items-start gap-2 min-h-5">
      {currentMilestone ? (
        <>
          <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <p className="text-xs font-medium text-foreground break-words line-clamp-2 flex-1 min-w-0 leading-4">{currentMilestone.title}</p>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {timeInCurrentMilestone}d
          </span>
        </>
      ) : hasNoActiveMilestone ? (
        <>
          <Pause className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground">Между этапами • Выберите следующий</span>
        </>
      ) : milestoneHistory.length === 0 ? (
        <span className="text-xs text-muted-foreground">
          Добавьте этапы для отслеживания
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">
          Активируйте первый этап
        </span>
      )}
    </div>
  )
}

// Локализация статусов активности
const ACTIVITY_STATUS_CONFIG: Record<string, { label: string; color: string; iconColor: string }> = {
  active: { label: "Активно", color: "text-green-600", iconColor: "text-green-500" },
  unstable: { label: "Нестабильно", color: "text-yellow-600", iconColor: "text-yellow-500" },
  weak: { label: "Низкая активность", color: "text-red-500", iconColor: "text-red-500" },
  collecting: { label: "Сбор данных", color: "text-muted-foreground", iconColor: "text-muted-foreground" },
}

function ActivityStatusIcon({ status }: { status: string }) {
  const config = ACTIVITY_STATUS_CONFIG[status]
  return <Circle className={`w-3 h-3 fill-current ${config.iconColor}`} />
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-500" />
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />
  return <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
}

function ProcessProgressDisplay({ progress }: { progress: GlobalGoalProgress & { type: "process" } }) {
  const { activityStatus, activitySignal, trend, streakDays } = progress

  const statusConfig = ACTIVITY_STATUS_CONFIG[activityStatus]

  // ЗАПРЕЩЕНО показывать проценты Activity Index
  // Показываем текстовый статус и сигнал в одну строку

  return (
    <div className="flex items-center gap-2">
      <ActivityStatusIcon status={activityStatus} />
      <span className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
      {activitySignal && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendIcon trend={trend} />
          <span className="truncate max-w-[100px]">{activitySignal}</span>
        </span>
      )}
      {streakDays > 0 && (
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1 flex-shrink-0">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          {streakDays}d
        </span>
      )}
    </div>
  )
}

function HybridProgressDisplay({ progress }: { progress: GlobalGoalProgress & { type: "hybrid" } }) {
  const { objectiveResult, processRhythm } = progress
  
  const statusConfig = ACTIVITY_STATUS_CONFIG[processRhythm.activityStatus]
  
  // Результат и активность в одну строку (как outcome: слева инфо, справа значение)
  return (
    <div className="flex items-center gap-2">
      {/* Процессный ритм - слева */}
      <ActivityStatusIcon status={processRhythm.activityStatus} />
      <span className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
      {processRhythm.streakDays > 0 && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-500" />
          {processRhythm.streakDays}d
        </span>
      )}

      {/* Объективный результат - справа */}
      <span className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground whitespace-nowrap">
        <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
        {objectiveResult.current}/{objectiveResult.target} {objectiveResult.unit}
      </span>
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
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${typeInfo.color}20` }}
        >
          <TypeIcon className="w-5 h-5" style={{ color: typeInfo.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{goal.title}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {/* <span 
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}
            >
              {typeInfo.label}
            </span> */}
            <span 
              className="text-xs py-0.5 rounded-full"
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

      {/* Deadline - only for active goals with deadline */}
      {goal.periodEnd && (goal.status === "in_progress" || goal.status === "not_started") && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <DeadlineDisplay periodEnd={goal.periodEnd} />
        </div>
      )}
    </motion.button>
  )
}

export function GlobalGoalsView() {
  const globalGoals = useGlobalGoalsStore((state) => state.globalGoals)
  const milestones = useGlobalGoalsStore((state) => state.milestones)
  const fetchGlobalGoals = useGlobalGoalsStore((state) => state.fetchGlobalGoals)
  const calculateProgress = useGlobalGoalsStore((state) => state.calculateProgress)
  const isLoading = useGlobalGoalsStore((state) => state.isLoading)

  const goals = useGoalsStore((state) => state.goals)
  const habits = useHabitsStore((state) => state.habits)

  const [selectedType, setSelectedType] = useState<GlobalGoalType | "all">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)

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
  }, [globalGoals, goals, habits, milestones, calculateProgress])

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

  // Get selected goal from store to ensure it's always up-to-date
  const selectedGoal = useMemo(() => {
    if (!selectedGoalId) return null
    return globalGoals.find(g => g.id === selectedGoalId) || null
  }, [selectedGoalId, globalGoals])

  const handleOpenDetail = (goal: GlobalGoal) => {
    setSelectedGoalId(goal.id)
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
          <div className="flex flex-col items-center justify-center h-full text-center pb-24">
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
              <Plus className="w-4 h-4" />
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
          setSelectedGoalId(null)
        }}
        goal={selectedGoal}
      />
    </div>
  )
}

