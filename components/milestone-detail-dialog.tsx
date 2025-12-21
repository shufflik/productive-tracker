"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Pencil, 
  Trash2,
  Check,
  Circle,
  Flag,
  Clock
} from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import type { Milestone } from "@/lib/types"

type MilestoneDetailDialogProps = {
  open: boolean
  onClose: () => void
  milestone: Milestone | null
  goalId: string
  historyData?: { daysSpent: number; isCompleted: boolean }
  activityData?: { goalsCompleted: number; goalsTotal: number }
  linkedGoals: Array<{ id: string; title: string; completed: boolean; milestoneId?: string }>
}

export function MilestoneDetailDialog({ 
  open, 
  onClose, 
  milestone, 
  goalId,
  historyData,
  activityData,
  linkedGoals
}: MilestoneDetailDialogProps) {
  const updateMilestone = useGlobalGoalsStore((state) => state.updateMilestone)
  const deleteMilestone = useGlobalGoalsStore((state) => state.deleteMilestone)
  const activateMilestone = useGlobalGoalsStore((state) => state.activateMilestone)
  const completeMilestone = useGlobalGoalsStore((state) => state.completeMilestone)
  const milestones = useGlobalGoalsStore((state) => state.milestones)
  
  // Получаем актуальный milestone из store, чтобы он обновлялся после изменений
  const currentMilestone = useMemo(() => {
    if (!milestone) return null
    return milestones.find(m => m.id === milestone.id) || milestone
  }, [milestones, milestone])
  
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Обновляем editTitle при изменении currentMilestone.title, но только если не в режиме редактирования
  useEffect(() => {
    if (!isEditing && currentMilestone) {
      setEditTitle(currentMilestone.title)
    }
  }, [currentMilestone?.title, isEditing])
  
  // Сбрасываем состояние редактирования при закрытии диалога или смене этапа
  useEffect(() => {
    if (!open) {
      setIsEditing(false)
      setShowDeleteConfirm(false)
    }
  }, [open])
  
  // Сбрасываем состояние редактирования при смене milestone
  useEffect(() => {
    setIsEditing(false)
    setShowDeleteConfirm(false)
    if (currentMilestone) {
      setEditTitle(currentMilestone.title)
    }
  }, [currentMilestone?.id])
  
  if (!currentMilestone) return null
  
  const isActive = currentMilestone.isActive
  const isCompleted = currentMilestone.isCompleted
  const canEdit = !isCompleted && !isActive
  
  // Задачи привязанные к этому этапу
  const milestoneTasks = linkedGoals.filter(g => g.milestoneId === currentMilestone.id)
  
  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle !== currentMilestone.title) {
      await updateMilestone(goalId, currentMilestone.id, { title: editTitle.trim() })
    }
    setIsEditing(false)
  }
  
  const handleDelete = async () => {
    await deleteMilestone(goalId, currentMilestone.id)
    onClose()
  }
  
  const statusLabel = isCompleted ? "Завершён" : isActive ? "В процессе" : "Не начат"
  const statusColor = isCompleted ? "text-green-600" : isActive ? "text-purple-600" : "text-muted-foreground"
  const statusBg = isCompleted ? "bg-green-500/10" : isActive ? "bg-purple-500/10" : "bg-muted/50"
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-sm flex flex-col">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2">
            <Flag className="w-4 h-4 text-purple-500" />
            Этап
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Название */}
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                autoFocus
                className="bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
              />
              <Button size="sm" className="h-9" onClick={handleSaveTitle}>OK</Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => setIsEditing(false)}>✕</Button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <h3 className="text-lg font-semibold text-center">{currentMilestone.title}</h3>
            </div>
          )}
          
          {/* Статус */}
          <div className={`px-3 py-2 rounded-lg ${statusBg} flex items-center justify-center gap-2`}>
            {isCompleted ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : isActive ? (
              <Clock className="w-4 h-4 text-purple-600" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground" />
            )}
            <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
          
          {/* Статистика */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xl font-bold text-foreground">
                {historyData?.daysSpent || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {isCompleted ? "Дней потрачено" : "Дней в этапе"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xl font-bold text-foreground">
                {activityData?.goalsCompleted || 0}/{activityData?.goalsTotal || 0}
              </p>
              <p className="text-xs text-muted-foreground">Задач</p>
            </div>
          </div>
          
          {/* Задачи этапа */}
          {milestoneTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Задачи этапа</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {milestoneTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 text-sm py-1">
                    {task.completed ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={`truncate ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Подтверждение удаления */}
          {showDeleteConfirm && (
            <div className="space-y-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="text-sm text-destructive block text-center">Удалить этап?</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Отмена</Button>
                <Button size="sm" className="flex-1 bg-destructive hover:bg-destructive/90" onClick={handleDelete}>Удалить</Button>
              </div>
            </div>
          )}
          
          {/* Действия */}
          {!showDeleteConfirm && !isEditing && (
            <div className="flex gap-2 mt-auto pt-4">
              {canEdit && (
                <>
                  <Button 
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditTitle(currentMilestone.title)
                      setIsEditing(true)
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => {
                      activateMilestone(goalId, currentMilestone.id)
                      onClose()
                    }}
                  >
                    Начать этап
                  </Button>
                </>
              )}
              
              {isActive && (
                <Button 
                  size="sm"
                  className="flex-1 h-9"
                    onClick={() => {
                      completeMilestone(goalId, currentMilestone.id)
                      onClose()
                    }}
                >
                  Завершить этап
                </Button>
              )}
              
              {isCompleted && (
                <Button variant="outline" size="sm" className="flex-1 h-9" onClick={onClose}>
                  Закрыть
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

