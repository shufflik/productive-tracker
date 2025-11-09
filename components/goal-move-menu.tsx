"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, CalendarCheck, Package } from "lucide-react"

interface GoalMoveMenuProps {
  onMoveToToday: () => void
  onMoveToTomorrow: () => void
  onMoveToBacklog: () => void
  availableOptions: ("today" | "tomorrow" | "backlog")[]
}

export function GoalMoveMenu({ onMoveToToday, onMoveToTomorrow, onMoveToBacklog, availableOptions }: GoalMoveMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(true)
  }

  const handleSelect = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={handleButtonClick}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        className="h-full w-full bg-purple-500 flex items-center justify-center px-6 text-white hover:bg-purple-600 transition-colors"
      >
        <Calendar className="w-5 h-5" />
      </button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90%] sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Move Goal To</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {availableOptions.includes("today") && (
              <button
                onClick={() => handleSelect(onMoveToToday)}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm rounded-lg border border-border hover:bg-accent transition-colors text-left"
              >
                <CalendarCheck className="w-5 h-5" />
                <span>Today</span>
              </button>
            )}
            {availableOptions.includes("tomorrow") && (
              <button
                onClick={() => handleSelect(onMoveToTomorrow)}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm rounded-lg border border-border hover:bg-accent transition-colors text-left"
              >
                <Calendar className="w-5 h-5" />
                <span>Tomorrow</span>
              </button>
            )}
            {availableOptions.includes("backlog") && (
              <button
                onClick={() => handleSelect(onMoveToBacklog)}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm rounded-lg border border-border hover:bg-accent transition-colors text-left"
              >
                <Package className="w-5 h-5" />
                <span>Backlog</span>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

