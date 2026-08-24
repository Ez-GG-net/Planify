"use client"

import { useEffect, useMemo, useState } from "react"

import { computeTaskStates, TaskState } from "@/lib/task/task-state"
import {
  minutesToDurationLabel,
  minutesToTimeLabel,
} from "@/lib/task/task-time"
import { cn } from "@/lib/utils"
import { SchedulePlanTask } from "@planify/types"
import type { DayGroup, TaskDayData } from "@/types"
import { TaskListItem } from "./task-item"

/** How many upcoming tasks are shown before the "show more" toggle. */
export const MAX_UPCOMING_TASKS = 3

/**
 * Re-evaluate task states as time passes so upcoming tasks can become
 * active or overdue without requiring a page refresh.
 */
export function useTaskStates(
  tasks: SchedulePlanTask[],
  completedIds: Set<string>
): Map<string, TaskState> {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((tick) => tick + 1)
    }, 60_000)

    return () => clearInterval(interval)
  }, [])

  return computeTaskStates(tasks, completedIds, new Date())
}

/** Group tasks by date and keep each day's tasks chronological. */
export function useTaskGroups(tasks: SchedulePlanTask[]): DayGroup[] {
  return useMemo(() => {
    const byDate = new Map<string, SchedulePlanTask[]>()

    for (const task of tasks) {
      if (!task.date) continue

      const dayTasks = byDate.get(task.date) ?? []
      dayTasks.push(task)
      byDate.set(task.date, dayTasks)
    }

    return [...byDate.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, dayTasks]) => ({
        date,
        tasks: [...dayTasks].sort(
          (a, b) => (a.startTime ?? 0) - (b.startTime ?? 0)
        ),
      }))
  }, [tasks])
}

/**
 * The date of the day containing the task that should currently receive
 * focus (the first uncompleted task in chronological order).
 */
export function useFocusDate(
  groups: DayGroup[],
  focusTaskId?: string | null
): string | undefined {
  return useMemo(
    () =>
      groups.find((group) =>
        group.tasks.some((task) => task.id === focusTaskId)
      )?.date,
    [groups, focusTaskId]
  )
}

/**
 * Slice upcoming tasks down to MAX_UPCOMING_TASKS unless expanded.
 * Returns the tasks to render and how many are hidden behind the toggle.
 */
export function getVisibleUpcomingTasks(
  upcomingTasks: SchedulePlanTask[],
  expanded: boolean
): { visible: SchedulePlanTask[]; remaining: number } {
  return {
    visible: expanded
      ? upcomingTasks
      : upcomingTasks.slice(0, MAX_UPCOMING_TASKS),
    remaining: Math.max(0, upcomingTasks.length - MAX_UPCOMING_TASKS),
  }
}

/** Categorize one day's tasks into the sections the views render. */
export function getTaskDayData(
  group: DayGroup,
  states: Map<string, TaskState>
): TaskDayData {
  const completedTasks = group.tasks.filter(
    (task) => states.get(task.id) === "completed"
  )

  const overdueTasks = group.tasks.filter(
    (task) => states.get(task.id) === "overdue"
  )

  const activeTask =
    group.tasks.find((task) => states.get(task.id) === "active") ?? null

  const upcomingTasks = group.tasks.filter(
    (task) => states.get(task.id) === "upcoming"
  )

  const completedCount = completedTasks.length
  const totalCount = group.tasks.length

  return {
    completedTasks,
    overdueTasks,
    activeTask,
    upcomingTasks,
    completedCount,
    totalCount,
    isComplete: totalCount > 0 && completedCount === totalCount,

    // Most overdue task gets priority over active.
    highlightedTask: overdueTasks[0] ?? activeTask,
  }
}

/** "start time • duration" label, e.g. "7:00 AM • 30m". */
export function getTaskMetaLabel(task: SchedulePlanTask) {
  return [
    task.startTime != null ? minutesToTimeLabel(task.startTime) : null,
    task.estimatedDuration != null
      ? minutesToDurationLabel(task.estimatedDuration)
      : null,
  ]
    .filter(Boolean)
    .join(" • ")
}

interface TaskItemProps {
  task: SchedulePlanTask
  state: TaskState
  /** Whether this is the highlighted (overdue/active) task of its day. */
  highlighted?: boolean
  metaLabel?: string
  /** Layout-specific classes for the border wrapper. */
  className?: string
}

/** Bordered task row shared by the desktop and mobile day views. */
export function TaskItem({
  task,
  state,
  highlighted = false,
  metaLabel,
  className,
}: TaskItemProps) {
  return (
    <div
      className={cn(
        "rounded-lg border",
        highlighted ? "border-muted-foreground/50" : "border-border",
        className
      )}
    >
      <TaskListItem
        task={task}
        state={state}
        metaLabel={metaLabel || undefined}
      />
    </div>
  )
}
