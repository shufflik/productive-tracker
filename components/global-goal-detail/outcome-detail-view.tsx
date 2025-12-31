"use client"

import { useMemo, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Check,
  Flag,
  Clock,
  ChevronUp,
  ChevronDown,
  Play,
  CheckCircle2
} from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import type { GlobalGoal, Milestone, OutcomeProgress } from "@/lib/types"
import { MilestoneDetailDialog } from "../milestone-detail-dialog"

type OutcomeDetailViewProps = {
  goal: GlobalGoal
  progress: OutcomeProgress
  isEditing?: boolean
}

export function OutcomeDetailView({ goal, progress, isEditing }: OutcomeDetailViewProps) {
  const allMilestones = useGlobalGoalsStore((state) => state.milestones)
  const addMilestone = useGlobalGoalsStore((state) => state.addMilestone)
  const swapMilestoneOrders = useGlobalGoalsStore((state) => state.swapMilestoneOrders)
  const activateMilestone = useGlobalGoalsStore((state) => state.activateMilestone)

  const milestones = useMemo(() =>
    allMilestones
      .filter((m) => m.globalGoalId === goal.id)
      .sort((a, b) => a.order - b.order),
    [allMilestones, goal.id]
  )

  const handleMoveMilestone = useCallback((milestoneId: string, direction: "up" | "down") => {
    const currentIndex = milestones.findIndex(m => m.id === milestoneId)
    if (currentIndex === -1) return

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= milestones.length) return

    const currentMilestone = milestones[currentIndex]
    const targetMilestone = milestones[targetIndex]

    swapMilestoneOrders(goal.id, currentMilestone.id, targetMilestone.id)
  }, [milestones, goal.id, swapMilestoneOrders])

  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("")
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return
    await addMilestone(goal.id, newMilestoneTitle.trim())
    setNewMilestoneTitle("")
    setShowAddMilestone(false)
  }

  const hasCompletedWithoutActive = !progress.currentMilestone &&
    progress.milestoneHistory.some(m => m.isCompleted)

  // Все этапы завершены
  const allCompleted = milestones.length > 0 &&
    milestones.every(m => m.isCompleted)

  // Этапы ещё не начаты (есть milestones, но ни один не активен и не завершён)
  const hasNotStarted = milestones.length > 0 &&
    !progress.currentMilestone &&
    !progress.milestoneHistory.some(m => m.isCompleted)

  const firstMilestone = milestones[0]

  const handleStartFirstMilestone = async () => {
    if (firstMilestone) {
      await activateMilestone(goal.id, firstMilestone.id)
    }
  }

  return (
    <div className="space-y-5">
      {/* Current Phase - компактный вид - hidden in editing mode */}
      {!isEditing && (
        progress.currentMilestone ? (
          <div className="px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-start gap-2">
              <Flag className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-purple-600">Текущий:</span>
                  <span className="text-sm text-muted-foreground">
                    {progress.timeInCurrentMilestone} дн.
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground break-words mt-1">{progress.currentMilestone.title}</p>
              </div>
            </div>
          </div>
        ) : allCompleted ? (
          <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Все этапы пройдены</span>
            </div>
          </div>
        ) : hasCompletedWithoutActive ? (
          <div className="px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-600">Между этапами — активируйте следующий</span>
            </div>
          </div>
        ) : hasNotStarted ? (
          <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Play className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm text-blue-600 truncate">Начать с: {firstMilestone?.title}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartFirstMilestone}
                className="flex-shrink-0 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
              >
                Старт
              </Button>
            </div>
          </div>
        ) : null
      )}

      {/* Milestones */}
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
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground">{newMilestoneTitle.length}/35</p>
              <Input
                placeholder="Название этапа"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
                maxLength={35}
                autoFocus
                className="bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
              />
            </div>
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
              const isActive = milestone.isActive
              const isCompleted = milestone.isCompleted
              const isLast = index === milestones.length - 1
              const isFirst = index === 0

              return (
                <li key={milestone.id}>
                  {!isFirst && <hr className={isCompleted || isActive ? "bg-primary" : "bg-border"} />}

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

                  <div
                    className={`timeline-end timeline-box p-3 w-[calc(100%-0.3rem)] text-left transition-all ${
                      isEditing ? "" : "hover:brightness-95 active:scale-[0.99]"
                    } ${
                      isActive
                        ? "bg-purple-500/5 border-purple-500/30"
                        : isCompleted
                          ? "bg-green-500/5 border-green-500/20"
                          : "bg-muted/30 border-border/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isEditing && !isActive && !isCompleted && (() => {
                        const prevMilestone = index > 0 ? milestones[index - 1] : null
                        const canMoveUp = prevMilestone && !prevMilestone.isActive && !prevMilestone.isCompleted

                        const nextMilestone = !isLast ? milestones[index + 1] : null
                        const canMoveDown = nextMilestone && !nextMilestone.isActive && !nextMilestone.isCompleted

                        return (
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMoveMilestone(milestone.id, "up")
                              }}
                              disabled={!canMoveUp}
                              className={`p-0.5 rounded transition-colors ${
                                !canMoveUp
                                  ? "text-muted-foreground/30 cursor-not-allowed"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMoveMilestone(milestone.id, "down")
                              }}
                              disabled={!canMoveDown}
                              className={`p-0.5 rounded transition-colors ${
                                !canMoveDown
                                  ? "text-muted-foreground/30 cursor-not-allowed"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })()}

                      <button
                        onClick={() => !isEditing && setSelectedMilestone(milestone)}
                        disabled={isEditing}
                        className={`flex-1 min-w-0 text-left ${isEditing ? "cursor-default" : ""}`}
                      >
                        <p className={`text-sm font-medium break-words ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {milestone.title}
                        </p>
                        {historyData && historyData.daysSpent > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span>{historyData.daysSpent} дн.</span>
                          </div>
                        )}
                      </button>

                      {isActive && (
                        <span className="text-xs text-purple-600 bg-purple-500/20 px-2 py-0.5 rounded flex-shrink-0">
                          Активен
                        </span>
                      )}
                    </div>
                  </div>

                  {!isLast && <hr className={isCompleted ? "bg-primary" : "bg-border"} />}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <MilestoneDetailDialog
        open={!!selectedMilestone}
        onClose={() => setSelectedMilestone(null)}
        milestone={selectedMilestone}
        goalId={goal.id}
        historyData={selectedMilestone ? progress.milestoneHistory.find(h => h.id === selectedMilestone.id) : undefined}
      />
    </div>
  )
}
