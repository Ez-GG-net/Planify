"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { differenceInCalendarDays, format } from "date-fns"

import { getVisibleSchedules } from "@/lib/schedule/visible-schedules"
import { uuidToColor } from "@/lib/uuid-to-color"
import { Button } from "@/components/ui/button"
import { SchedulePlan } from "@planify/types"

interface ScheduleListProps {
  schedules: SchedulePlan[]
}

/**
 * Mobile-friendly month view: a month navigator plus a vertical list of the
 * schedules that intersect the viewed month. Replaces the wide day-grid
 * timeline on screens narrower than the desktop breakpoint.
 */
export default function ScheduleList({ schedules }: ScheduleListProps) {
  const [month, setMonth] = useState(new Date())

  const visibleSchedules = useMemo(
    () => getVisibleSchedules(schedules, month),
    [schedules, month]
  )

  function previousMonth() {
    setMonth((current) => {
      const next = new Date(current)
      next.setMonth(current.getMonth() - 1)
      return next
    })
  }

  function nextMonth() {
    setMonth((current) => {
      const next = new Date(current)
      next.setMonth(current.getMonth() + 1)
      return next
    })
  }

  return (
    <div className="m-4 rounded-lg border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <Button variant="ghost" size="icon" onClick={previousMonth}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-sm font-semibold">{format(month, "MMMM yyyy")}</h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {visibleSchedules.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No schedules in {format(month, "MMMM yyyy")}
        </p>
      ) : (
        <ul className="divide-y">
          {visibleSchedules.map((schedule) => (
            <ScheduleListItem key={schedule.id} schedule={schedule} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ScheduleListItem({ schedule }: { schedule: SchedulePlan }) {
  const startDate = new Date(schedule.startDate)
  const endDate = new Date(schedule.endDate)
  const days = differenceInCalendarDays(endDate, startDate) + 1

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: uuidToColor(schedule.id) }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{schedule.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {days} day{days === 1 ? "" : "s"}
      </span>
    </li>
  )
}
