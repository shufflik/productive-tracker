"use client"

import { useRef, useEffect } from "react"
import { Check, Circle, Target, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Goal, Habit } from "@/lib/types"

type LinkedItemsListProps = {
  linkedGoals: Goal[]
  linkedHabits: Habit[]
  isLoading?: boolean
  isFetchingNextPage?: boolean
  hasNextPage?: boolean
  onLoadMore?: () => void
}

export function LinkedItemsList({
  linkedGoals,
  linkedHabits,
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  onLoadMore,
}: LinkedItemsListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasNextPage) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [onLoadMore, hasNextPage, isFetchingNextPage])

  // Initial loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Empty state
  if (linkedGoals.length === 0 && linkedHabits.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 py-6 px-4">
        <p className="text-sm text-muted-foreground text-center">
          Привяжите задачи и привычки для отслеживания активности.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
      <ScrollArea className="h-48">
        <div className="space-y-2 p-3 pr-4">
          {linkedHabits.map((h) => (
            <div
              key={h.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-background/60"
            >
              <Target className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm flex-1 min-w-0 break-words">{h.title}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                привычка
              </span>
            </div>
          ))}
          {linkedGoals.map((g) => (
            <div
              key={g.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-background/60"
            >
              {g.completed ? (
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              <span className="text-sm flex-1 min-w-0 break-words">{g.title}</span>
            </div>
          ))}

          {/* Sentinel element for infinite scroll */}
          {hasNextPage && (
            <div ref={sentinelRef} className="flex items-center justify-center py-2">
              {isFetchingNextPage && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
