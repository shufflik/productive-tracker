"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type DayState = {
  date: string // ISO date format "2025-11-10"
  isEndDay: boolean
}

type DayStateStore = {
  dayStates: Record<string, DayState> // key is ISO date string
  
  // Actions
  markDayAsEnded: (date: string) => void
  isDayEnded: (date: string) => boolean
  getTodayState: () => DayState
  isTodayEnded: () => boolean
}

export const useDayStateStore = create<DayStateStore>()(
  persist(
    (set, get) => ({
      dayStates: {},

      markDayAsEnded: (date) => {
        set((state) => ({
          dayStates: {
            ...state.dayStates,
            [date]: {
              date,
              isEndDay: true,
            },
          },
        }))
      },

      isDayEnded: (date) => {
        const dayState = get().dayStates[date]
        return dayState?.isEndDay ?? false
      },

      getTodayState: () => {
        const today = new Date().toISOString().split("T")[0]
        const state = get().dayStates[today]
        return state ?? { date: today, isEndDay: false }
      },

      isTodayEnded: () => {
        const today = new Date().toISOString().split("T")[0]
        return get().isDayEnded(today)
      },
    }),
    {
      name: "day-state-storage",
      storage: createJSONStorage(() => {
        return {
          getItem: (name) => {
            if (typeof window === 'undefined') return null
            try {
              const str = localStorage.getItem(name)
              if (!str) return null
              return str
            } catch (error) {
              console.error("Error loading day states from localStorage:", error)
              return JSON.stringify({ state: { dayStates: {} } })
            }
          },
          setItem: (name, value) => {
            if (typeof window === 'undefined') return
            try {
              localStorage.setItem(name, value)
            } catch (error) {
              console.error("Error saving day states to localStorage:", error)
            }
          },
          removeItem: (name) => {
            if (typeof window === 'undefined') return
            try {
              localStorage.removeItem(name)
            } catch (error) {
              console.error("Error removing day states from localStorage:", error)
            }
          },
        }
      }),
    }
  )
)

