"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useCallback } from "react"
import { getLinkedGoalsApi, type LinkedGoalsResponse } from "@/lib/services/api-client"
import type { Goal } from "@/lib/types"
import { format, subDays } from "date-fns"

type UseLinkedGoalsParams = {
  globalGoalId: string
  milestoneId?: string
  enabled?: boolean
}

type UseLinkedGoalsResult = {
  goals: Goal[]
  goalsFor14Days: Goal[]
  isLoading: boolean
  isLoadingChart: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  error: Error | null
}

const CHART_DAYS = 14
const PAGE_LIMIT = 20

export function useLinkedGoals({
  globalGoalId,
  milestoneId,
  enabled = true,
}: UseLinkedGoalsParams): UseLinkedGoalsResult {
  const queryKey = milestoneId
    ? ["linked-goals", globalGoalId, milestoneId]
    : ["linked-goals", globalGoalId]

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery<LinkedGoalsResponse, Error>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      return getLinkedGoalsApi({
        globalGoalId,
        milestoneId,
        page: pageParam as number,
        limit: PAGE_LIMIT,
      })
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasNext) {
        return lastPage.pagination.page + 1
      }
      return undefined
    },
    enabled: enabled && !!globalGoalId,
  })

  // Flatten all goals from all pages
  const goals = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.items)
  }, [data?.pages])

  // Calculate date threshold for chart (14 days ago)
  const chartDateThreshold = useMemo(() => {
    const date = subDays(new Date(), CHART_DAYS)
    date.setHours(0, 0, 0, 0)
    return format(date, "yyyy-MM-dd")
  }, [])

  // Filter goals for the last 14 days
  const goalsFor14Days = useMemo(() => {
    return goals.filter((goal) => {
      if (!goal.targetDate) return false
      return goal.targetDate >= chartDateThreshold
    })
  }, [goals, chartDateThreshold])

  // Check if we need to load more pages for the chart data
  const needsMoreForChart = useMemo(() => {
    if (!data?.pages || data.pages.length === 0) return false

    const lastPage = data.pages[data.pages.length - 1]
    if (!lastPage.pagination.hasNext) return false

    // Get the last goal from all loaded data
    const lastGoal = goals[goals.length - 1]
    if (!lastGoal?.targetDate) return false

    // If the last goal's targetDate is still within 14 days, we need more data
    return lastGoal.targetDate >= chartDateThreshold
  }, [data?.pages, goals, chartDateThreshold])

  // Auto-fetch more pages to get all chart data
  useEffect(() => {
    if (needsMoreForChart && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [needsMoreForChart, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Chart is loading if initial load or still fetching data for 14 days
  const isLoadingChart = isLoading || (needsMoreForChart && isFetchingNextPage)

  const handleFetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return {
    goals,
    goalsFor14Days,
    isLoading,
    isLoadingChart,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage: handleFetchNextPage,
    error: error ?? null,
  }
}
