import { SchedulePlanTask } from "@/types"

export type TaskState = "completed" | "active" | "upcoming" | "overdue"

/** The task's date + startTime as a local Date (null when it has no date). */
function taskDateTime(task: SchedulePlanTask): Date | null {
  if (!task.date) return null
  const [year, month, day] = task.date.split("-").map(Number)
  if (!year || !month || !day) return null
  const minutes = task.startTime ?? 0
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60)
}

/** True when the task's date/time has passed and it has a date. */
export function isTaskOverdue(
  task: SchedulePlanTask,
  now: Date = new Date()
): boolean {
  const when = taskDateTime(task)
  return when !== null && when.getTime() < now.getTime()
}

/** Chronological order: by date, then start time. */
export function compareTasks(a: SchedulePlanTask, b: SchedulePlanTask): number {
  const dateCompare = (a.date ?? "").localeCompare(b.date ?? "")
  if (dateCompare !== 0) return dateCompare
  return (a.startTime ?? 0) - (b.startTime ?? 0)
}

/**
 * Computes each task's state, in priority order:
 * completed (checked off) -> overdue (its time passed, unchecked) -> active
 * (first unchecked task whose time hasn't passed) -> upcoming.
 */
export function computeTaskStates(
  tasks: SchedulePlanTask[],
  completedIds: Set<string>,
  now: Date = new Date()
): Map<string, TaskState> {
  const sorted = [...tasks].sort(compareTasks)
  const firstUncompletedId =
    sorted.find((task) => !completedIds.has(task.id))?.id ?? null

  const states = new Map<string, TaskState>()

  for (const task of sorted) {
    if (completedIds.has(task.id)) {
      states.set(task.id, "completed")
    } else if (isTaskOverdue(task, now)) {
      states.set(task.id, "overdue")
    } else if (task.id === firstUncompletedId) {
      states.set(task.id, "active")
    } else {
      states.set(task.id, "upcoming")
    }
  }

  return states
}
