"use client"

import { useState } from "react"
import { GoalsView } from "@/components/goals-view"
import { StatisticsView } from "@/components/statistics-view"
import { HabitsView } from "@/components/habits-view"
import { CheckSquare, BarChart3, Target } from "lucide-react"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"goals" | "statistics" | "habits">("goals")

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Daily Tracker</h1>
          <p className="text-sm text-muted-foreground">Stay productive, every day</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
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
