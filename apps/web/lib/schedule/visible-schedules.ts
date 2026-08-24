import {
  compareAsc,
  compareDesc,
  differenceInCalendarDays,
  endOfMonth,
  startOfMonth,
} from "date-fns"
import { SchedulePlan } from "@planify/types"

/**
 * Schedules that intersect the given month (start at or before its end and
 * end at or after its start), sorted by start date, then end date, then
 * original order for stable ties.
 */
export function getVisibleSchedules(
  schedules: SchedulePlan[],
  month: Date
): SchedulePlan[] {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)

  return schedules
    .filter((schedule) => {
      const start = new Date(schedule.startDate)
      const end = new Date(schedule.endDate)

      return (
        differenceInCalendarDays(start, monthEnd) <= 0 &&
        differenceInCalendarDays(end, monthStart) >= 0
      )
    })
    .map((schedule, index) => ({ schedule, index }))
    .sort((a, b) => {
      const startCompare = compareAsc(
        new Date(a.schedule.startDate),
        new Date(b.schedule.startDate)
      )

      if (startCompare !== 0) {
        return startCompare
      }

      const endCompare = compareDesc(
        new Date(a.schedule.endDate),
        new Date(b.schedule.endDate)
      )

      if (endCompare !== 0) {
        return endCompare
      }

      return a.index - b.index
    })
    .map(({ schedule }) => schedule)
}
