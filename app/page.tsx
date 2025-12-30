"use client"

import { useState, useEffect } from "react"
import { GoalsView } from "@/components/goals-view"
import { StatisticsView } from "@/components/statistics-view"
import { HabitsView } from "@/components/habits-view"
import { GlobalGoalsView } from "@/components/global-goals-view"
import { CheckSquare, BarChart3, Target, Crosshair } from "lucide-react"
import { syncService } from "@/lib/services/sync"
// import { useDayStateStore } from "@/lib/stores/day-state-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
// import { DayReviewDialog } from "@/components/day-review-dialog"
// import type { Goal } from "@/lib/types"

// Global flag to track app initialization
// Resets only on full page reload, persists during component remounts
let appInitialized = false

export default function Home() {
  const [activeTab, setActiveTab] = useState<"goals" | "objectives" | "statistics" | "habits">("goals")
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)

  // Auto End Day state
  // const [pendingReviewDate, setPendingReviewDate] = useState<string | null>(null)
  // const [pendingReviewGoals, setPendingReviewGoals] = useState<Goal[]>([])
  // const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

  // Store selectors
  // const pendingReviewDates = useDayStateStore((state) => state.pendingReviewDates)
  // const completePendingReview = useDayStateStore((state) => state.completePendingReview)
  // const goals = useGoalsStore((state) => state.goals)
  // const updateGoalInStore = useGoalsStore((state) => state.updateGoal)
  // const deleteGoalFromStore = useGoalsStore((state) => state.deleteGoal)
  // const toggleCompleteInStore = useGoalsStore((state) => state.toggleComplete)
  // const rescheduleInStore = useGoalsStore((state) => state.rescheduleForTomorrow)
  // const moveToBacklogInStore = useGoalsStore((state) => state.moveToBacklog)

  useEffect(() => {
    // Only initialize once per app lifecycle (not on every component mount)
    if (appInitialized) {
      return
    }

    appInitialized = true

    // Check if running in Telegram WebApp
    // We need to check both that the API exists AND that we're actually in Telegram
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp

      // Check if we're really inside Telegram by checking initDataUnsafe or platform
      const isRealTelegram = tg.initDataUnsafe !== undefined && Object.keys(tg.initDataUnsafe).length > 0

      if (isRealTelegram) {
        setIsTelegramWebApp(true)

        // Initialize Telegram WebApp
        tg.ready()

        // Expand to full screen (important for menu button launches)
        // Call multiple times to ensure it works
        tg.expand()

        // Try again after a short delay to ensure Telegram is ready
        setTimeout(() => {
          tg.expand()
        }, 100)

        // Disable vertical swipes to prevent closing
        if (tg.disableVerticalSwipes) {
          tg.disableVerticalSwipes()
        }
      }
    }

    // Initialize app
    initializeApp()
  }, [])

  // // Watch for pending reviews changes
  // useEffect(() => {
  //   if (pendingReviewDates.length > 0 && !reviewDialogOpen) {
  //     // Process next pending review
  //     processNextPendingReview()
  //   }
  // }, [pendingReviewDates, reviewDialogOpen])

  async function initializeApp() {
    // FULL SYNC при открытии/перезагрузке приложения
    // Это покрывает все несинхронизированные изменения
    // syncOnAppStart() выполняет принудительную синхронизацию один раз за lifecycle приложения
    await syncService.syncOnAppStart()

    // Запускаем polling для автоматической синхронизации
    syncService.startPolling()

    // После sync проверяем pending reviews
    // Логика обработки pending reviews теперь в PendingDayReviewsManager (layout.tsx)
  }

  // function processNextPendingReview() {
  //   if (pendingReviewDates.length === 0) return

  //   const nextDate = pendingReviewDates[0]
  //   console.log(`[AutoEndDay] Processing pending review for ${nextDate}`)

  //   // Get goals for this date
  //   const dateAsDateString = new Date(nextDate + "T00:00:00").toDateString()
  //   const goalsForDate = goals.filter(
  //     (g) => g.targetDate === dateAsDateString
  //   )

  //   if (goalsForDate.length === 0) {
  //     console.log(`[AutoEndDay] No goals for ${nextDate}, skipping`)
  //     completePendingReview(nextDate)
  //     return
  //   }

  //   // Open review dialog
  //   setPendingReviewDate(nextDate)
  //   setPendingReviewGoals(goalsForDate)
  //   setReviewDialogOpen(true)
  // }

  // function handleReviewClose() {
  //   setReviewDialogOpen(false)
  //   setPendingReviewDate(null)
  //   setPendingReviewGoals([])
  // }

  // function handleReviewComplete(updatedGoals: Goal[]) {
  //   // Apply goal updates
  //   updateGoalsFromReview(updatedGoals)

  //   // Mark this review as completed
  //   if (pendingReviewDate) {
  //     completePendingReview(pendingReviewDate)
  //   }

  //   // Close dialog
  //   handleReviewClose()

  //   // Next review will be processed automatically by useEffect
  // }

  // function updateGoalsFromReview(updatedGoals: Goal[]) {
  //   // Same logic as in GoalsView
  //   type GoalWithAction = Goal & { action?: "backlog" | "tomorrow" | "not-relevant" }
  //   const goalsWithActions = updatedGoals as GoalWithAction[]

  //   goalsWithActions.forEach((goal) => {
  //     const originalGoal = goals.find((g) => g.id === goal.id)
  //     if (originalGoal) {
  //       // Обрабатываем действия для незавершенных задач
  //       if (!goal.completed && goal.action) {
  //         switch (goal.action) {
  //           case "tomorrow":
  //             rescheduleInStore(goal.id)
  //             break
  //           case "backlog":
  //             moveToBacklogInStore(goal.id)
  //             break
  //           case "not-relevant":
  //             deleteGoalFromStore(goal.id)
  //             break
  //         }
  //         // После применения действия не нужно обновлять другие поля
  //         return
  //       }

  //       // Обновляем статус завершения если изменился
  //       if (goal.completed !== originalGoal.completed) {
  //         toggleCompleteInStore(goal.id)
  //       }

  //       // Обновляем основные поля если изменились
  //       if (
  //         goal.title !== originalGoal.title ||
  //         goal.description !== originalGoal.description ||
  //         goal.label !== originalGoal.label
  //       ) {
  //         updateGoalInStore(goal.id, goal.title, goal.label || "", goal.description || "")
  //       }
  //     }
  //   })
  // }

  return (
    <div 
      className="h-screen bg-background flex flex-col overflow-hidden" 
      style={isTelegramWebApp ? { 
        paddingTop: 'var(--tg-content-safe-area-inset-top, 0px)',
        paddingBottom: 'var(--tg-content-safe-area-inset-bottom, 0px)'
      } : undefined}
    >
      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-6 pb-1 w-full flex-1 flex flex-col min-h-0 relative">
        <h1 className="text-2xl font-bold text-foreground text-center mb-6 flex-shrink-0">Daily Tracker</h1>
        <div className="flex-1 min-h-0">
          {activeTab === "goals" && <GoalsView />}
          {activeTab === "objectives" && <GlobalGoalsView />}
          {activeTab === "statistics" && <StatisticsView />}
          {activeTab === "habits" && <HabitsView />}
        </div>
        
        {/* Bottom fade gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-card border-t border-border flex-shrink-0">
        <div className="max-w-md mx-auto flex">
          <button
            onClick={() => setActiveTab("goals")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "goals" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <CheckSquare className="w-6 h-6" />
            <span className="text-xs font-medium">Goals</span>
          </button>
          <button
            onClick={() => setActiveTab("objectives")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "objectives" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Crosshair className="w-6 h-6" />
            <span className="text-xs font-medium">Objectives</span>
          </button>
          <button
            onClick={() => setActiveTab("habits")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "habits" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Target className="w-6 h-6" />
            <span className="text-xs font-medium">Habits</span>
          </button>
          <button
            onClick={() => setActiveTab("statistics")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              activeTab === "statistics" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs font-medium">Stats</span>
          </button>
        </div>
      </nav>

      {/* Auto End Day Dialog */}
      {/* Логика обработки pending reviews теперь в PendingDayReviewsManager (layout.tsx) */}
      {/* {pendingReviewDate && (
        <DayReviewDialog
          open={reviewDialogOpen}
          onClose={handleReviewClose}
          goals={pendingReviewGoals}
          onUpdateGoals={handleReviewComplete}
          date={pendingReviewDate}
          allowCancel={false}
        />
      )} */}
    </div>
  )
}
