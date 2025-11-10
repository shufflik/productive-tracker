"use client"

import { useState, useEffect } from "react"
import { GoalsView } from "@/components/goals-view"
import { StatisticsView } from "@/components/statistics-view"
import { HabitsView } from "@/components/habits-view"
import { CheckSquare, BarChart3, Target } from "lucide-react"

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        disableVerticalSwipes: () => void
        isExpanded: boolean
        initDataUnsafe: any
      }
    }
  }
}

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
  }, [])

  return (
    <div 
      className="min-h-screen bg-background pb-20" 
      style={isTelegramWebApp ? { 
        paddingTop: 'var(--tg-content-safe-area-inset-top, 0px)',
        paddingBottom: 'calc(5rem + var(--tg-content-safe-area-inset-bottom, 0px))'
      } : undefined}
    >
      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground text-center mb-6">Daily Tracker</h1>
        {activeTab === "goals" && <GoalsView />}
        {activeTab === "statistics" && <StatisticsView />}
        {activeTab === "habits" && <HabitsView />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
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
