"use client"

import { useState, useCallback, useMemo } from "react"
import { SwipeableList, Type } from "react-swipeable-list"
import "react-swipeable-list/dist/styles.css"
import { Target, Plus } from "lucide-react"
import { HabitDetailDialog } from "@/components/habit-detail-dialog"
import { HabitDialog } from "@/components/habit-dialog"
import { Button } from "@/components/ui/button"
import { SwipeableHabitItem } from "@/components/swipeable-habit-item"
import { WeekNavigator } from "@/components/week-navigator"
import { useHabitsStore } from "@/lib/stores/habits-store"
import { useGoalsStore } from "@/lib/stores/goals-store"
import type { Goal } from "@/lib/types"

export function HabitsView() {
  // Zustand stores
  const habits = useHabitsStore((state) => state.goals)
  const addHabitToStore = useHabitsStore((state) => state.addHabit)
  const updateHabitInStore = useHabitsStore((state) => state.updateHabit)
  const deleteHabitFromStore = useHabitsStore((state) => state.deleteHabit)
  const toggleHabitCompletionInStore = useHabitsStore((state) => state.toggleHabitCompletion)
  const isHabitCompletedInStore = useHabitsStore((state) => state.isHabitCompletedForDate)
  const isHabitScheduledInStore = useHabitsStore((state) => state.isHabitScheduledForDate)
  const calculateStreakInStore = useHabitsStore((state) => state.calculateStreak)

  // Local UI state
  const [selectedHabit, setSelectedHabit] = useState<Goal | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [habitDialogOpen, setHabitDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Goal | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const addHabit = useCallback(
    (title: string, repeatType: "daily" | "weekly", repeatDays?: number[]) => {
      addHabitToStore(title, repeatType, repeatDays)
    },
    [addHabitToStore]
  )

  const updateHabit = useCallback(
    (id: string, title: string, repeatType: "daily" | "weekly", repeatDays?: number[]) => {
      updateHabitInStore(id, title, repeatType, repeatDays)
    },
    [updateHabitInStore]
  )

  const deleteHabit = useCallback(
    (id: string) => {
      deleteHabitFromStore(id)
    },
    [deleteHabitFromStore]
  )

  const isHabitScheduledForDate = useCallback(
    (habit: Goal, date: Date): boolean => {
      return isHabitScheduledInStore(habit, date)
    },
    [isHabitScheduledInStore]
  )

  const toggleHabitCompletion = useCallback(
    (habitId: string) => {
      toggleHabitCompletionInStore(habitId, selectedDate)
    },
    [toggleHabitCompletionInStore, selectedDate]
  )

  const isHabitCompletedForDate = useCallback(
    (habitId: string, date: Date): boolean => {
      return isHabitCompletedInStore(habitId, date)
    },
    [isHabitCompletedInStore]
  )

  const calculateStreak = useCallback(
    (habitId: string): number => {
      return calculateStreakInStore(habitId)
    },
    [calculateStreakInStore]
  )

  const handleHabitClick = useCallback((habit: Goal) => {
    setSelectedHabit(habit)
    setDetailOpen(true)
  }, [])

  const openEditDialog = useCallback((habit: Goal) => {
    setEditingHabit(habit)
    setHabitDialogOpen(true)
  }, [])

  const closeHabitDialog = useCallback(() => {
    setHabitDialogOpen(false)
    setEditingHabit(null)
  }, [])

  const selectedDateHabits = useMemo(
    () => habits.filter((h) => isHabitScheduledForDate(h, selectedDate)),
    [habits, selectedDate, isHabitScheduledForDate]
  )

  const isSelectedDateToday = useCallback(() => {
    const today = new Date()
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    )
  }, [selectedDate])

  return (
    <div className="space-y-6">
      <WeekNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isSelectedDateToday()
                ? "Today Habits"
                : selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSelectedDateToday() ? "Complete your daily habits" : "View habits for this day"}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setHabitDialogOpen(true)}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-2">
          {selectedDateHabits.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                {isSelectedDateToday() ? "No habits scheduled for today" : "No habits scheduled for this day"}
              </p>
              <Button onClick={() => setHabitDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Habit
              </Button>
            </div>
          ) : (
            <SwipeableList type={Type.IOS} threshold={0.25}>
              {selectedDateHabits.map((habit) => (
                <SwipeableHabitItem
                  key={habit.id}
                  habit={habit}
                  isCompleted={isHabitCompletedForDate(habit.id, selectedDate)}
                  streak={calculateStreak(habit.id)}
                  onToggle={() => toggleHabitCompletion(habit.id)}
                  onEdit={() => openEditDialog(habit)}
                  onDelete={() => deleteHabit(habit.id)}
                  onOpenDetail={() => handleHabitClick(habit)}
                />
              ))}
            </SwipeableList>
          )}
        </div>
      </div>

      <HabitDialog
        open={habitDialogOpen}
        onClose={closeHabitDialog}
        onSave={editingHabit ? updateHabit : addHabit}
        habit={editingHabit}
      />

      <HabitDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        habit={selectedHabit}
        streak={selectedHabit ? calculateStreak(selectedHabit.id) : 0}
      />
    </div>
  )
}
