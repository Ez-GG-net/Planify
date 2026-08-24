"use client"

import { differenceInCalendarDays, endOfMonth, startOfMonth } from "date-fns"
import { uuidToColor } from "@/lib/uuid-to-color"
import { SchedulePlan } from "@planify/types"
import { Ellipsis } from "lucide-react"

interface ScheduleRowProps {
  schedule?: SchedulePlan
  month: Date
  daysInMonth: number
  empty?: boolean
  /** Explicit pixel height for a variable-height row (overrides the h-14 default). */
  height?: number
}

export default function ScheduleRow({
  schedule,
  month,
  daysInMonth,
  empty = false,
  height,
}: ScheduleRowProps) {
  const dayGridCells = Array.from({ length: daysInMonth }).map((_, index) => (
    <div
      key={index}
      className={`h-full ${
        index === daysInMonth - 1 ? "" : "border-r"
      }`}
      style={{ gridRow: 1, gridColumn: index + 1 }}
    />
  ))

  if (empty) {
    return (
      <div
        className="h-14 border-b hover:bg-muted/30"
        style={height !== undefined ? { height } : undefined}
      >
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: `repeat(${daysInMonth}, minmax(40px, 1fr))`,
          }}
        >
          {dayGridCells}
        </div>
      </div>
    )
  }

  if (!schedule) return null

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)

  const startDate = new Date(schedule.startDate)
  const endDate = new Date(schedule.endDate)

  // Whether the schedule continues beyond the visible month on either side.
  const startsBeforeMonth = differenceInCalendarDays(startDate, monthStart) < 0
  const endsAfterMonth = differenceInCalendarDays(endDate, monthEnd) > 0

  // Clamp the bar to the days currently visible so it never overflows the grid.
  const visibleStart = startsBeforeMonth ? monthStart : startDate
  const visibleEnd = endsAfterMonth ? monthEnd : endDate

  const startOffset = differenceInCalendarDays(visibleStart, monthStart)

  const duration = differenceInCalendarDays(visibleEnd, visibleStart) + 1

  const color = uuidToColor(schedule.id)

  return (
    <div className="h-14 border-b hover:bg-muted/30">
      <div
        className="grid h-full items-center"
        style={{
          gridTemplateColumns: `repeat(${daysInMonth}, minmax(40px, 1fr))`,
        }}
      >
        {dayGridCells}

        <div
          className="mx-1 flex h-12 items-center rounded-md px-3 text-sm font-medium text-white shadow-sm"
          style={{
            gridColumn: `${startOffset + 1} / span ${duration}`,
            gridRow: 1,
            backgroundColor: color,
          }}
        >
          {startsBeforeMonth && (
            <span aria-hidden className="shrink-0 pr-1">
              <Ellipsis width={16} height={16} />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{schedule.title}</span>
          {endsAfterMonth && (
            <span aria-hidden className="shrink-0 pl-1">
              <Ellipsis width={16} height={16}/>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
