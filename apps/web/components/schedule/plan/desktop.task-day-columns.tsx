"use client"

import { useEffect, useRef, useState } from "react"
import { format, parseISO } from "date-fns"
import { Check, ChevronDown } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TaskState } from "@/lib/task/task-state"
import { cn } from "@/lib/utils"
import { SchedulePlanTask } from "@planify/types"
import {
  getTaskDayData,
  getTaskMetaLabel,
  getVisibleUpcomingTasks,
  TaskItem,
  useFocusDate,
  useTaskGroups,
  useTaskStates,
} from "./get-task-day"
import { useSchedulePlanList } from "./schedule-plan-context"

export function TaskDayColumns() {
  const { tasks, completedIds, focusTaskId } = useSchedulePlanList()

  const scrollRef = useRef<HTMLDivElement>(null)

  const [expandedUpcoming, setExpandedUpcoming] = useState<Set<string>>(
    new Set()
  )
  const [expandedCompleted, setExpandedCompleted] = useState<Set<string>>(
    new Set()
  )

  const states = useTaskStates(tasks, completedIds)
  const groups = useTaskGroups(tasks)
  const focusDate = useFocusDate(groups, focusTaskId)

  /*
   * Center the focused day whenever the focus task changes.
   */
  useEffect(() => {
    if (!focusDate || !scrollRef.current) return

    const container = scrollRef.current

    const dayElement = container.querySelector<HTMLElement>(
      `[data-day="${focusDate}"]`
    )

    if (!dayElement) return

    const relativeLeft =
      dayElement.getBoundingClientRect().left -
      container.getBoundingClientRect().left +
      container.scrollLeft

    const target =
      relativeLeft -
      container.clientWidth / 2 +
      dayElement.clientWidth / 2

    container.scrollTo({
      left: Math.max(0, target),
      behavior: "smooth",
    })
  }, [focusDate])

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tasks scheduled.
      </p>
    )
  }

  const toggleUpcoming = (date: string) => {
    setExpandedUpcoming((current) => {
      const next = new Set(current)

      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }

      return next
    })
  }

  const toggleCompleted = (date: string) => {
    setExpandedCompleted((current) => {
      const next = new Set(current)

      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }

      return next
    })
  }

  return (
    <div
      ref={scrollRef}
      className="flex gap-4 overflow-x-auto pb-2"
    >
      {groups.map((group) => {
        const data = getTaskDayData(group, states)

        const isUpcomingExpanded = expandedUpcoming.has(group.date)
        const isCompletedExpanded = expandedCompleted.has(group.date)

        const {
          visible: visibleUpcomingTasks,
          remaining: remainingUpcomingCount,
        } = getVisibleUpcomingTasks(data.upcomingTasks, isUpcomingExpanded)

        const renderTask = (
          task: SchedulePlanTask,
          state: TaskState
        ) => {
          const isHighlighted = task.id === data.highlightedTask?.id

          return (
            <TaskItem
              key={task.id}
              task={task}
              state={state}
              highlighted={isHighlighted}
              metaLabel={getTaskMetaLabel(task) || undefined}
              className={cn("p-1", isHighlighted && "bg-border/50")}
            />
          )
        }

        return (
          <Card
            key={group.date}
            data-day={group.date}
            className="w-lg shrink-0 overflow-hidden"
          >
            {/* Day header */}
            <CardHeader className="shrink-0 pb-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {format(parseISO(group.date), "EEEE")}
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(group.date), "MMMM d")}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-medium tabular-nums">
                    {data.completedCount}/{data.totalCount}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    completed
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Active task */}
              {data.activeTask && (
                <section className="space-y-2">
                  <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Up next
                  </p>

                  {renderTask(data.activeTask, "active")}
                </section>
              )}

              {/* Overdue tasks */}
              {data.overdueTasks.length > 0 && (
                <section className="space-y-2">
                  <p className="px-1 text-xs font-medium uppercase tracking-wide text-destructive">
                    Overdue
                  </p>

                  <div className="space-y-1">
                    {data.overdueTasks.map((task) =>
                      renderTask(task, "overdue")
                    )}
                  </div>
                </section>
              )}

              {/* Upcoming tasks */}
              {data.upcomingTasks.length > 0 && (
                <section className="space-y-2">
                  <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Coming up
                  </p>

                  <div className="space-y-1">
                    {visibleUpcomingTasks.map((task) =>
                      renderTask(task, "upcoming")
                    )}
                  </div>

                  {remainingUpcomingCount > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleUpcoming(group.date)}
                      aria-expanded={isUpcomingExpanded}
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {isUpcomingExpanded ? (
                        "Show less"
                      ) : (
                        <>
                          + {remainingUpcomingCount} more{" "}
                          {remainingUpcomingCount === 1
                            ? "task"
                            : "tasks"}
                        </>
                      )}
                    </button>
                  )}
                </section>
              )}

              {/* Empty day */}
              {data.totalCount === 0 && (
                <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                  No tasks scheduled.
                </div>
              )}

              {/* Completed tasks */}
              {data.completedTasks.length > 0 && (
                <section className="border-t pt-2">
                  <button
                    type="button"
                    onClick={() => toggleCompleted(group.date)}
                    aria-expanded={isCompletedExpanded}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <Check className="size-3.5" />
                      {data.completedCount} completed
                    </span>

                    <ChevronDown
                      className={`size-3.5 transition-transform ${
                        isCompletedExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isCompletedExpanded && (
                    <div className="mt-1 space-y-1">
                      {data.completedTasks.map((task) =>
                        renderTask(task, "completed")
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Day complete */}
              {data.isComplete && (
                <div className="flex items-center justify-center gap-2 border-t pt-4 text-sm text-muted-foreground">
                  <Check className="size-4 text-primary" />
                  Day complete
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
