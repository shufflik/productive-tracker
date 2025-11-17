"use client"

import { useState, useEffect } from "react"
import { GoalsView } from "@/components/goals-view"
import { StatisticsView } from "@/components/statistics-view"
import { HabitsView } from "@/components/habits-view"
import { CheckSquare, BarChart3, Target } from "lucide-react"
import { syncService } from "@/lib/services/sync"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"goals" | "statistics" | "habits">("goals")
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false)

  useEffect(() => {
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
    
    // // FULL SYNC при открытии WebApp
    // // Это покрывает все несинхронизированные изменения
    // syncService.sync()

    // Запускаем polling для автоматической синхронизации
    syncService.startPolling()
  }, [])

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
    </div>
  )
}
