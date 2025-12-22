"use client"

import { Calendar } from "lucide-react"

type DeadlineInfoProps = {
  periodEnd?: string
}

export function DeadlineInfo({ periodEnd }: DeadlineInfoProps) {
  if (!periodEnd) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const deadline = new Date(periodEnd)
  deadline.setHours(0, 0, 0, 0)

  const diffTime = deadline.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const isOverdue = diffDays < 0
  const days = Math.abs(diffDays)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  const getDaysText = (d: number) => {
    if (d === 1) return "день"
    if (d >= 2 && d <= 4) return "дня"
    return "дней"
  }

  if (isOverdue) {
    return (
      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-red-500" />
          <span className="text-sm font-medium text-red-500">
            Просрочено на {days} {getDaysText(days)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Дедлайн был {formatDate(deadline)}
        </p>
      </div>
    )
  }

  if (days === 0) {
    return (
      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-500">Сегодня дедлайн</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDate(deadline)}
        </p>
      </div>
    )
  }

  if (days <= 7) {
    return (
      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-500">
            Осталось {days} {getDaysText(days)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Дедлайн: {formatDate(deadline)}
        </p>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Осталось {days} {getDaysText(days)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Дедлайн: {formatDate(deadline)}
      </p>
    </div>
  )
}
