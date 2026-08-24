"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns"

import { getVisibleSchedules } from "@/lib/schedule/visible-schedules"
import { SchedulePlan } from "@planify/types"
import DateHeader from "./date-header"
import ScheduleRow from "./schedule-row"

interface ScheduleTimelineProps {
  schedules: SchedulePlan[]
}

export default function ScheduleTimeline({ schedules }: ScheduleTimelineProps) {
  const [month, setMonth] = useState(new Date())
  const [availableHeight, setAvailableHeight] = useState(0)

  const timelineRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const ROW_HEIGHT = 56

  useEffect(() => {
    const updateRows = () => {
      const timeline = timelineRef.current
      const header = headerRef.current
      if (!timeline || !header) return

      // Document-absolute position so the count stays stable regardless of scroll.
      const timelineTop = timeline.getBoundingClientRect().top + window.scrollY
      const headerHeight = header.offsetHeight
      // Account for the timeline's own bottom margin (m-4) so the grid never
      // runs past the fold.
      const bottomMargin = parseFloat(getComputedStyle(timeline).marginBottom)

      setAvailableHeight(
        Math.max(0, window.innerHeight - timelineTop - headerHeight - bottomMargin)
      )
    }

    updateRows()

    window.addEventListener("resize", updateRows)

    return () => {
      window.removeEventListener("resize", updateRows)
    }
  }, [])

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    })
  }, [month])

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

  const minimumRows = Math.max(0, Math.floor(availableHeight / ROW_HEIGHT))

  const emptyRowCount = Math.max(0, minimumRows - visibleSchedules.length)

  // The fixed-height rows actually rendered (filled or empty).
  const totalFixedRows = Math.max(minimumRows, visibleSchedules.length)

  // Remaining partial row that stretches to the bottom margin. Only rendered
  // when there is space for it (filler rows fit, and the leftover is > 0).
  const extraRowHeight = Math.max(
    0,
    availableHeight - totalFixedRows * ROW_HEIGHT
  )
  return (
    <div className="m-4 overflow-x-auto rounded-lg border" ref={timelineRef}>
      <div className="min-w-300">
        <div ref={headerRef}>
          <DateHeader
            month={month}
            onPreviousMonth={previousMonth}
            onNextMonth={nextMonth}
          />
        </div>

        <div>
          {visibleSchedules.map((schedule) => (
            <ScheduleRow
              key={schedule.id}
              schedule={schedule}
              month={month}
              daysInMonth={days.length}
            />
          ))}
          {Array.from({ length: emptyRowCount }).map((_, index) => (
            <ScheduleRow
              key={`empty-${index}`}
              month={month}
              daysInMonth={days.length}
              empty
            />
          ))}

          {extraRowHeight > 0 && (
            <ScheduleRow
              month={month}
              daysInMonth={days.length}
              empty
              height={extraRowHeight}
            />
          )}
        </div>
      </div>
    </div>
  )
}
