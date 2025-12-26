"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Flag, TrendingUp, Layers, Plus, X, Info, ChevronDown, ChevronUp, Calendar } from "lucide-react"
import { useGlobalGoalsStore } from "@/lib/stores/global-goals-store"
import type { GlobalGoal, GlobalGoalType } from "@/lib/types"

const EMOJI_OPTIONS = [
  "🎯", "💪", "📚", "💰", "🏃", "🧘", "💼", "🎨", 
  "🌱", "⭐", "🚀", "❤️", "🏠", "✈️", "🎓", "💡",
  "🏆", "🎵", "🍎", "💻", "📱", "🎮", "🏋️", "🧠",
  "🌍", "🔥", "💎", "🎁", "📈", "🛠️", "🎤", "📷"
]

type PeriodPreset = "1m" | "3m" | "6m" | "1y" | "custom" | "none"

const PERIOD_PRESETS: { value: PeriodPreset; label: string; months?: number }[] = [
  { value: "1m", label: "1 month", months: 1 },
  { value: "3m", label: "3 months", months: 3 },
  { value: "6m", label: "6 months", months: 6 },
  { value: "1y", label: "1 year", months: 12 },
  { value: "custom", label: "Custom" },
  { value: "none", label: "No deadline" },
]

const TYPE_OPTIONS: { 
  value: GlobalGoalType
  label: string
  description: string
  icon: typeof Flag
  examples: string[]
  color: string
}[] = [
  { 
    value: "outcome", 
    label: "Outcome", 
    description: "Discrete result - achieved or not",
    icon: Flag,
    examples: ["Get a new job", "Launch product", "Get visa"],
    color: "rgb(139, 92, 246)"
  },
  { 
    value: "process", 
    label: "Process", 
    description: "Ongoing improvement, no end point",
    icon: TrendingUp,
    examples: ["Be more productive", "Improve fitness"],
    color: "rgb(34, 197, 94)"
  },
  { 
    value: "hybrid", 
    label: "Hybrid", 
    description: "Measurable result + ongoing process",
    icon: Layers,
    examples: ["Lose 10kg", "Learn language to B2"],
    color: "rgb(59, 130, 246)"
  },
]

type GlobalGoalDialogProps = {
  open: boolean
  onClose: () => void
  goal?: GlobalGoal | null
}

export function GlobalGoalDialog({ open, onClose, goal }: GlobalGoalDialogProps) {
  const addGlobalGoal = useGlobalGoalsStore((state) => state.addGlobalGoal)
  const updateGlobalGoal = useGlobalGoalsStore((state) => state.updateGlobalGoal)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [type, setType] = useState<GlobalGoalType>("outcome")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState("🎯")
  
  // For OUTCOME - milestones
  const [milestones, setMilestones] = useState<{ title: string; description?: string }[]>([])
  const [newMilestone, setNewMilestone] = useState("")
  
  // For HYBRID - measurable target
  const [targetValue, setTargetValue] = useState("")
  const [unit, setUnit] = useState("")
  
  // Period selection
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("3m")
  const [customEndDate, setCustomEndDate] = useState("")
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  useEffect(() => {
    if (goal) {
      setType(goal.type)
      setTitle(goal.title)
      setDescription(goal.description || "")
      if (goal.targetValue) setTargetValue(String(goal.targetValue))
      if (goal.unit) setUnit(goal.unit)
      if (goal.periodEnd) {
        setCustomEndDate(goal.periodEnd)
        setPeriodPreset("custom")
      }
      setStep(2) // Skip type selection for editing
    } else {
      setStep(1)
      setType("outcome")
      setTitle("")
      setDescription("")
      setMilestones([])
      setNewMilestone("")
      setTargetValue("")
      setUnit("")
      setPeriodPreset("3m")
      setCustomEndDate("")
    }
  }, [goal, open])

  const handleAddMilestone = () => {
    if (!newMilestone.trim()) return
    setMilestones([...milestones, { title: newMilestone.trim() }])
    setNewMilestone("")
  }

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index))
  }

  const handleMoveMilestone = (index: number, direction: "up" | "down") => {
    const newMilestones = [...milestones]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newMilestones.length) return
    ;[newMilestones[index], newMilestones[targetIndex]] = [newMilestones[targetIndex], newMilestones[index]]
    setMilestones(newMilestones)
  }

  // Calculate end date based on preset
  const getEndDate = (): string | undefined => {
    if (periodPreset === "none") return undefined
    if (periodPreset === "custom") return customEndDate || undefined
    
    const preset = PERIOD_PRESETS.find(p => p.value === periodPreset)
    if (!preset?.months) return undefined
    
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + preset.months)
    return endDate.toISOString().split("T")[0]
  }

  const handleSave = async () => {
    if (!title.trim()) return
    
    setIsSubmitting(true)

    try {
      const now = new Date()
      const periodStart = now.toISOString().split("T")[0]
      const periodEnd = getEndDate()

      if (goal) {
        await updateGlobalGoal(goal.id, {
          title,
          description: description || undefined,
        })
      } else {
        await addGlobalGoal({
          type,
          title,
          description: description || undefined,
          periodStart,
          periodEnd,
          targetValue: type === "hybrid" && targetValue ? Number(targetValue) : undefined,
          unit: type === "hybrid" && unit ? unit : undefined,
          initialMilestones: type === "outcome" && milestones.length > 0 ? milestones : undefined,
        })
      }
      onClose()
    } catch (error) {
      console.error("Failed to save goal:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedToStep2 = type !== null
  const canProceedToStep3 = title.trim().length > 0
  const canSave = title.trim().length > 0 && (
    type === "process" ||
    (type === "outcome" && milestones.length > 0) ||
    (type === "hybrid" && targetValue && unit)
  )

  const selectedTypeInfo = TYPE_OPTIONS.find(t => t.value === type)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90%] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="flex justify-center">
            {goal ? "Edit Goal" : step === 1 ? "Choose Goal Type" : step === 3 ? "Additional Info" : (
              selectedTypeInfo ? (
                <span className="flex items-center gap-1">
                  <span 
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${selectedTypeInfo.color}20` }}
                  >
                    <selectedTypeInfo.icon className="w-3.5 h-3.5" style={{ color: selectedTypeInfo.color }} />
                  </span>
                  <span style={{ color: selectedTypeInfo.color }}>{selectedTypeInfo.label} Goal</span>
                </span>
              ) : "Goal Details"
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Type Selection */}
          {step === 1 && (
            <div className="space-y-2">
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = type === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? ""
                        : "border-border hover:border-primary/50"
                    }`}
                    style={isSelected ? { borderColor: option.color } : {}}
                  >
                    <div className="flex items-start gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${option.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: option.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                        <div className="text-xs text-muted-foreground/70 mt-1 truncate">
                          {option.examples.join(", ")}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  What do you want to achieve? <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder={
                    type === "outcome" ? "e.g., Get a new job at FAANG" :
                    type === "process" ? "e.g., Be more productive every day" :
                    "e.g., Lose 10 kilograms"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={35}
                  className="bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
                />
                <p className="text-xs text-muted-foreground">{title.length}/35</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Why is this important to you?</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your motivation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="!field-sizing-fixed resize-none bg-muted/30 border-border/50 rounded-lg focus-visible:ring-0"
                />
              </div>

              {/* Period Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Deadline
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {PERIOD_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setPeriodPreset(preset.value)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        periodPreset === preset.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                
                {/* Custom date input */}
                {periodPreset === "custom" && (
                  <div className="pt-2">
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full"
                    />
                  </div>
                )}
                
                {/* Show calculated end date */}
                {periodPreset !== "none" && periodPreset !== "custom" && (
                  <p className="text-xs text-muted-foreground">
                    Target: {new Date(new Date().setMonth(new Date().getMonth() + (PERIOD_PRESETS.find(p => p.value === periodPreset)?.months || 0))).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Type-specific info */}
          {step === 3 && (
            <div className="space-y-4">
              {/* OUTCOME: Milestones */}
              {type === "outcome" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-purple-500/10 rounded-lg">
                    <Info className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Add phases of your journey. You can always edit them later.
                    </p>
                  </div>

                  <Label>Milestones <span className="text-destructive">*</span></Label>

                  {/* Existing milestones */}
                  {milestones.length > 0 && (
                    <div className="space-y-2">
                      {milestones.map((m, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                        >
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveMilestone(index, "up")}
                              disabled={index === 0}
                              className={`p-0.5 rounded transition-colors ${
                                index === 0
                                  ? "text-muted-foreground/30 cursor-not-allowed"
                                  : "text-muted-foreground hover:text-foreground hover:bg-background"
                              }`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveMilestone(index, "down")}
                              disabled={index === milestones.length - 1}
                              className={`p-0.5 rounded transition-colors ${
                                index === milestones.length - 1
                                  ? "text-muted-foreground/30 cursor-not-allowed"
                                  : "text-muted-foreground hover:text-foreground hover:bg-background"
                              }`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                          <span className="flex-1 text-sm">{m.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(index)}
                            className="p-1 hover:bg-background rounded"
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add milestone input */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-muted-foreground">{newMilestone.length}/35</p>
                      <Input
                        placeholder="Название этапа"
                        value={newMilestone}
                        onChange={(e) => setNewMilestone(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
                        maxLength={35}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddMilestone}
                      disabled={!newMilestone.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* HYBRID: Measurable target */}
              {type === "hybrid" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Set your measurable target. You'll track both the objective result and your daily activity.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="target">Target value <span className="text-destructive">*</span></Label>
                      <Input
                        id="target"
                        type="number"
                        placeholder="e.g., 10"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit <span className="text-destructive">*</span></Label>
                      <Input
                        id="unit"
                        placeholder="e.g., kg, hours, books"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PROCESS: Info only */}
              {type === "process" && (
                <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg">
                  <Info className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Process goals track activity, not completion.</p>
                    <p>Link your daily goals and habits to this goal. Your progress will be measured by consistency and activity level.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {step > 1 && !goal && (
            <Button
              variant="outline"
              onClick={() => setStep((step - 1) as 1 | 2)}
              className="bg-transparent"
            >
              Back
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-transparent"
          >
            Cancel
          </Button>
          
          {step === 1 && (
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className="flex-1"
            >
              Continue
            </Button>
          )}
          
          {step === 2 && (
            <Button
              onClick={() => setStep(3)}
              disabled={!canProceedToStep3}
              className="flex-1"
            >
              {type === "process" ? "Create" : "Continue"}
            </Button>
          )}
          
          {step === 3 && (
            <Button
              onClick={handleSave}
              disabled={!canSave || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Creating..." : "Create Goal"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

