"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  TrendingDown,
  ArrowRight,
  Layers,
  Clock,
  Target,
  Flame
} from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import { useHabitsStore } from "@/lib/stores/habits-store"
import type { GlobalGoal, GlobalGoalStatus, Milestone, OutcomeProgress, ProcessProgress, HybridProgress } from "@/lib/types"
import { MilestoneDetailDialog } from "./milestone-detail-dialog"

const STATUS_OPTIONS: { value: GlobalGoalStatus; label: string; color: string }[] = [
  { value: "not_started", label: "Not Started", color: "rgb(156, 163, 175)" },
  { value: "in_progress", label: "In Progress", color: "rgb(59, 130, 246)" },
  { value: "blocked", label: "Blocked", color: "rgb(249, 115, 22)" },
  { value: "achieved", label: "Achieved", color: "rgb(34, 197, 94)" },
  { value: "abandoned", label: "Abandoned", color: "rgb(107, 114, 128)" },
]

const TYPE_ICONS = {
  outcome: { icon: Flag, color: "rgb(139, 92, 246)" },
  process: { icon: TrendingUp, color: "rgb(34, 197, 94)" },
  hybrid: { icon: Layers, color: "rgb(59, 130, 246)" },
}

type GlobalGoalDetailDialogProps = {
  open: boolean
  onClose: () => void
  goal: GlobalGoal | null
}

function OutcomeDetailView({ goal, progress }: { goal: GlobalGoal; progress: OutcomeProgress }) {
  const allMilestones = useGlobalGoalsStore((state) => state.milestones)
  const addMilestone = useGlobalGoalsStore((state) => state.addMilestone)
  const goals = useGoalsStore((state) => state.goals)
  
  const milestones = useMemo(() => 
    allMilestones
      .filter((m) => m.globalGoalId === goal.id)
      .sort((a, b) => a.order - b.order),
    [allMilestones, goal.id]
  )
  
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("")
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  
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

  // Проверяем, есть ли завершённые milestones без активного
  const hasCompletedWithoutActive = !progress.currentMilestone && 
    progress.milestoneHistory.some(m => m.isCompleted)
  
  return (
    <div className="space-y-5">
      {/* Current Phase - компактный вид */}
      {progress.currentMilestone ? (
        <div className="px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="text-sm text-purple-600">Текущий:</span>
            <span className="text-base font-medium text-foreground truncate">{progress.currentMilestone.title}</span>
            <span className="text-sm text-muted-foreground ml-auto flex-shrink-0">
              {progress.timeInCurrentMilestone} дн.
            </span>
          </div>
        </div>
      ) : hasCompletedWithoutActive ? (
        <div className="px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-600">Между этапами — активируйте следующий</span>
          </div>
        </div>
      ) : null}
      
      {/* Milestones - этапы как вертикальная ветка */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">Этапы</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowAddMilestone(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Добавить
          </Button>
        </div>
        
        {showAddMilestone && (
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Название этапа"
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
              autoFocus
              className="bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
            />
            <Button size="sm" className="h-9" onClick={handleAddMilestone}>OK</Button>
            <Button size="sm" variant="ghost" className="h-9" onClick={() => setShowAddMilestone(false)}>✕</Button>
          </div>
        )}
        
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет этапов. Добавьте первую фазу.
          </p>
        ) : (
          <ul className="timeline timeline-vertical timeline-compact">
            {milestones.map((milestone, index) => {
              const historyData = progress.milestoneHistory.find(h => h.id === milestone.id)
              const activityData = progress.activityByMilestone[milestone.id]
              const isActive = milestone.isActive
              const isCompleted = milestone.isCompleted
              const isLast = index === milestones.length - 1
              const isFirst = index === 0
              
              return (
                <li key={milestone.id}>
                  {/* Линия сверху (кроме первого) */}
                  {!isFirst && <hr className={isCompleted || isActive ? "bg-primary" : "bg-border"} />}
                  
                  {/* Иконка по центру */}
                  <div className="timeline-middle">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      isCompleted 
                        ? "bg-green-500 text-white" 
                        : isActive 
                          ? "bg-purple-500 text-white ring-2 ring-purple-500/30"
                          : "bg-muted border-2 border-border"
                    }`}>
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Контент справа - кликабельный */}
                  <button
                    onClick={() => setSelectedMilestone(milestone)}
                    className={`timeline-end timeline-box p-3 w-[calc(100%-0.3rem)] text-left transition-all hover:brightness-95 active:scale-[0.99] ${
                      isActive 
                        ? "bg-purple-500/5 border-purple-500/30" 
                        : isCompleted 
                          ? "bg-green-500/5 border-green-500/20"
                          : "bg-muted/30 border-border/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {milestone.title}
                        </p>
                        {((historyData && historyData.daysSpent > 0) || (activityData && activityData.goalsTotal > 0)) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {historyData && historyData.daysSpent > 0 && (
                              <span>{historyData.daysSpent} дн.</span>
                            )}
                            {activityData && activityData.goalsTotal > 0 && (
                              <span>{activityData.goalsCompleted}/{activityData.goalsTotal} задач</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Статус-индикатор */}
                      {isActive && (
                        <span className="text-xs text-purple-600 bg-purple-500/20 px-2 py-0.5 rounded flex-shrink-0">
                          Активен
                        </span>
                      )}
                    </div>
                  </button>
                  
                  {/* Линия снизу (кроме последнего) */}
                  {!isLast && <hr className={isCompleted ? "bg-primary" : "bg-border"} />}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      
      {/* Диалог деталей этапа */}
      <MilestoneDetailDialog
        open={!!selectedMilestone}
        onClose={() => setSelectedMilestone(null)}
        milestone={selectedMilestone}
        goalId={goal.id}
        historyData={selectedMilestone ? progress.milestoneHistory.find(h => h.id === selectedMilestone.id) : undefined}
        activityData={selectedMilestone ? progress.activityByMilestone[selectedMilestone.id] : undefined}
        linkedGoals={linkedGoals}
      />
    </div>
  )
}

// Локализация статусов активности для detail view
const ACTIVITY_STATUS_DETAIL: Record<string, { 
  label: string
  color: string
  bgColor: string
  borderColor: string
  description: string 
}> = {
  active: { 
    label: "Активно", 
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    description: "Вы стабильно работаете над целью"
  },
  unstable: { 
    label: "Нестабильно", 
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    description: "Активность колеблется, постарайтесь выстроить ритм"
  },
  weak: { 
    label: "Низкая активность", 
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    description: "Активность низкая, требуется внимание"
  },
}

function TrendIconDetail({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />
  return <ArrowRight className="w-4 h-4 text-muted-foreground" />
}

function ProcessDetailView({ goal, progress }: { goal: GlobalGoal; progress: ProcessProgress }) {
  const goals = useGoalsStore((state) => state.goals)
  const habits = useHabitsStore((state) => state.habits)
  
  const linkedGoals = useMemo(() => goals.filter(g => g.globalGoalId === goal.id), [goals, goal.id])
  const linkedHabits = useMemo(() => habits.filter(h => h.globalGoalId === goal.id), [habits, goal.id])
  
  const statusInfo = ACTIVITY_STATUS_DETAIL[progress.activityStatus]
  
  // ЗАПРЕЩЕНО показывать точный процент Activity Index
  // Показываем только текстовый статус и сигнал
  
  return (
    <div className="space-y-6">
      {/* Activity Status - текстовый, без процентов */}
      <div className={`p-4 rounded-xl ${statusInfo.bgColor} border ${statusInfo.borderColor}`}>
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className={`w-5 h-5 ${statusInfo.color}`} />
          <span className={`text-lg font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
        
        <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
        
        {/* Сигнал активности - если есть */}
        {progress.activitySignal && (
          <div className="flex items-center gap-1.5 text-sm text-foreground mt-2">
            <TrendIconDetail trend={progress.trend} />
            <span>{progress.activitySignal}</span>
          </div>
        )}
        
        {/* Streak - полезный показатель */}
        {progress.streakDays > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Серия: {progress.streakDays} {progress.streakDays === 1 ? "день" : progress.streakDays < 5 ? "дня" : "дней"}</span>
          </div>
        )}
      </div>
      
      {/* Weekly Stats - без процентов */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold text-foreground">{progress.weeklyActivity.goalsCompleted}</p>
          <p className="text-xs text-muted-foreground">Задач за неделю</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold text-foreground">{progress.weeklyActivity.habitsCompleted}</p>
          <p className="text-xs text-muted-foreground">Привычек за неделю</p>
        </div>
      </div>
      
      {/* Linked items */}
      <div className="space-y-3">
        <h3 className="font-medium text-foreground">Привязанные элементы</h3>
        
        {linkedGoals.length === 0 && linkedHabits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Привяжите задачи и привычки для отслеживания активности.
          </p>
        ) : (
          <div className="space-y-2">
            {linkedHabits.map(h => (
              <div key={h.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm">{h.title}</span>
                <span className="text-xs text-muted-foreground ml-auto">привычка</span>
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
  const [newValue, setNewValue] = useState(String(progress.objectiveResult.current))
  
  const handleUpdateValue = () => {
    const value = Number(newValue)
    if (!isNaN(value) && value >= 0) {
      updateGlobalGoal(goal.id, { currentValue: value })
    }
    setEditingValue(false)
  }
  
  const statusInfo = ACTIVITY_STATUS_DETAIL[progress.processRhythm.activityStatus]
  
  // ЗАПРЕЩЕНО:
  // - объединять показатели
  // - показывать два процента
  // - вычислять "общий прогресс hybrid-цели"
  
  return (
    <div className="space-y-6">
      {/* 1. Объективный результат - ТОЛЬКО факт, без процента */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-600">Измеримый результат</span>
        </div>
        
        {/* Показываем только current / target, БЕЗ процента */}
        <div className="flex items-center justify-between">
          {editingValue ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-24 h-10"
                autoFocus
              />
              <span className="text-lg text-muted-foreground">/ {progress.objectiveResult.target} {progress.objectiveResult.unit}</span>
              <Button size="sm" onClick={handleUpdateValue}>Сохранить</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingValue(false)}>Отмена</Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNewValue(String(progress.objectiveResult.current))
                setEditingValue(true)
              }}
              className="text-2xl font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <span>{progress.objectiveResult.current}</span>
              <span className="text-muted-foreground font-normal">/ {progress.objectiveResult.target}</span>
              <span className="text-sm text-muted-foreground font-normal">{progress.objectiveResult.unit}</span>
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      
      {/* 2. Процессный ритм - ОТДЕЛЬНО, текстовый статус без процентов */}
      <div className={`p-4 rounded-xl ${statusInfo.bgColor} border ${statusInfo.borderColor}`}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className={`w-4 h-4 ${statusInfo.color}`} />
          <span className={`text-sm font-medium ${statusInfo.color}`}>Ритм работы</span>
        </div>
        
        <p className={`text-lg font-semibold ${statusInfo.color}`}>{statusInfo.label}</p>
        <p className="text-sm text-muted-foreground mt-1">{statusInfo.description}</p>
        
        {/* Сигнал и streak */}
        <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
          {progress.processRhythm.activitySignal && (
            <span className="flex items-center gap-1">
              <TrendIconDetail trend={progress.processRhythm.trend} />
              {progress.processRhythm.activitySignal}
            </span>
          )}
          {progress.processRhythm.streakDays > 0 && (
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              {progress.processRhythm.streakDays}d
            </span>
          )}
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
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState("")

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

  const handleStartEditDescription = () => {
    setEditedDescription(goal?.description || "")
    setIsEditingDescription(true)
  }

  const handleSaveDescription = async () => {
    if (goal) {
      await updateGlobalGoal(goal.id, { description: editedDescription || undefined })
      setIsEditingDescription(false)
    }
  }

  const handleCancelEditDescription = () => {
    setIsEditingDescription(false)
    setEditedDescription("")
  }

  if (!goal || !progress) return null

  const currentStatus = STATUS_OPTIONS.find(s => s.value === goal.status)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col gap-2 px-6 py-4">
        <DialogHeader className="flex-shrink-0 flex items-center justify-center">
          <DialogTitle className="text-lg mb-1 text-center">{goal.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Status selector */}
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">Статус</span>
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors w-fit"
                style={{ 
                  backgroundColor: `${currentStatus?.color}15`, 
                  color: currentStatus?.color,
                  border: `1px solid ${currentStatus?.color}30`
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentStatus?.color }}
                />
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
          
          {/* Description */}
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">Описание</span>
            {isEditingDescription ? (
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Опишите вашу мотивацию..."
                rows={3}
                className="bg-muted/30 border-border/50"
                autoFocus
              />
            ) : goal.description ? (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="max-h-20 overflow-y-auto">
                  <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{goal.description}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm text-muted-foreground italic">Нет описания</p>
              </div>
            )}
          </div>
          
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
        <div className="flex-shrink-0 pt-2 border-t border-border">
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
          ) : isEditingDescription ? (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleCancelEditDescription}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleSaveDescription}
                className="flex-1"
              >
                Сохранить
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline"
                size="icon"
                onClick={handleStartEditDescription}
              >
                <Pencil className="w-4 h-4" />
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

