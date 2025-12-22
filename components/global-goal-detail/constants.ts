import { Flag, TrendingUp, Layers } from "lucide-react"
import type { GlobalGoalStatus } from "@/lib/types"

export const STATUS_OPTIONS: { value: GlobalGoalStatus; label: string; color: string }[] = [
  { value: "not_started", label: "Not Started", color: "rgb(156, 163, 175)" },
  { value: "in_progress", label: "In Progress", color: "rgb(59, 130, 246)" },
  { value: "blocked", label: "Blocked", color: "rgb(249, 115, 22)" },
  { value: "achieved", label: "Achieved", color: "rgb(34, 197, 94)" },
  { value: "abandoned", label: "Abandoned", color: "rgb(107, 114, 128)" },
]

export const TYPE_ICONS = {
  outcome: { icon: Flag, color: "rgb(139, 92, 246)" },
  process: { icon: TrendingUp, color: "rgb(34, 197, 94)" },
  hybrid: { icon: Layers, color: "rgb(59, 130, 246)" },
}

export const ACTIVITY_STATUS_DETAIL: Record<string, {
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
