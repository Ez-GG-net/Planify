"use client"

import { useEffect, useRef, useState } from "react"
import { format, parseISO } from "date-fns"
import {
  Check,
  ChevronDown,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TaskState } from "@/lib/task/task-state"
import { SchedulePlanTask } from "@/types"
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

const SWIPE_THRESHOLD = 50

export function MobileTaskDayView() {
  const { tasks, completedIds, focusTaskId } = useSchedulePlanList()
  const [dayIndex, setDayIndex] = useState(0)
  const [expandedUpcoming, setExpandedUpcoming] = useState(false)
  const [expandedCompleted, setExpandedCompleted] = useState(false)

  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const states = useTaskStates(tasks, completedIds)
  const groups = useTaskGroups(tasks)
  const focusDate = useFocusDate(groups, focusTaskId)

  /*
   * Find the day containing the first uncompleted task.
   * This lets the schedule open on the most relevant day.
   */
  useEffect(() => {
    if (!focusDate) return

    const index = groups.findIndex((group) => group.date === focusDate)

    if (index >= 0) {
      setDayIndex(index)
    }
  }, [focusDate, groups])

  // Keep the selected day valid if the task list changes.
  useEffect(() => {
    setDayIndex((current) => Math.min(current, Math.max(0, groups.length - 1)))
  }, [groups.length])

  // Expansion state belongs to the currently displayed day.
  useEffect(() => {
    setExpandedUpcoming(false)
    setExpandedCompleted(false)
  }, [dayIndex])

  /*
   * Keyboard navigation.
   *
   * Don't hijack arrow keys while the user is interacting
   * with a form control or button.
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return
      }

      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, select, button")
      ) {
        return
      }

      event.preventDefault()

      setDayIndex((current) => {
        if (event.key === "ArrowLeft") {
          return Math.max(0, current - 1)
        }

        return Math.min(groups.length - 1, current + 1)
      })
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [groups.length])

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks scheduled.</p>
  }

  const group = groups[dayIndex]

  const data = getTaskDayData(group, states)

  const { visible: visibleUpcomingTasks, remaining: remainingUpcomingCount } =
    getVisibleUpcomingTasks(data.upcomingTasks, expandedUpcoming)

  const previousDay = () => {
    setDayIndex((current) => Math.max(0, current - 1))
  }

  const nextDay = () => {
    setDayIndex((current) => Math.min(groups.length - 1, current + 1))
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]

    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current) return

    const touch = event.changedTouches[0]

    const deltaX = touch.clientX - touchStart.current.x
    const deltaY = touch.clientY - touchStart.current.y

    touchStart.current = null

    // Ignore vertical gestures so normal scrolling still works.
    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      return
    }

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
      return
    }

    if (deltaX < 0) {
      nextDay()
    } else {
      previousDay()
    }
  }

  const renderTask = (task: SchedulePlanTask, state: TaskState) => {
    const isCurrentTaskHighlighted = task.id === data.highlightedTask?.id

    return (
      <TaskItem
        key={task.id}
        task={task}
        state={state}
        highlighted={isCurrentTaskHighlighted}
        metaLabel={getTaskMetaLabel(task) || undefined}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Day card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="min-h-0 flex-1 touch-pan-y"
      >
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
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

                <p className="text-xs text-muted-foreground">completed</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto">
            {/* Active task */}
            {data.activeTask && (
              <section className="space-y-2">
                <p className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Up next
                </p>

                <div className="rounded-lg border p-1">
                  {renderTask(data.activeTask, "active")}
                </div>
              </section>
            )}

            {/* Overdue tasks */}
            {data.overdueTasks.length > 0 && (
              <section className="space-y-2">
                <p className="px-1 text-xs font-medium tracking-wide text-destructive uppercase">
                  Overdue
                </p>

                <div className="space-y-1">
                  {data.overdueTasks.map((task) => renderTask(task, "overdue"))}
                </div>
              </section>
            )}

            {/* Upcoming tasks */}
            {data.upcomingTasks.length > 0 && (
              <section className="space-y-2">
                <p className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
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
                    onClick={() => setExpandedUpcoming((expanded) => !expanded)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {expandedUpcoming ? (
                      "Show less"
                    ) : (
                      <>
                        + {remainingUpcomingCount} more{" "}
                        {remainingUpcomingCount === 1 ? "task" : "tasks"}
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
                  onClick={() => setExpandedCompleted((expanded) => !expanded)}
                  aria-expanded={expandedCompleted}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <Check className="size-3.5" />
                    {data.completedCount} completed
                  </span>

                  <ChevronDown
                    className={`size-3.5 transition-transform ${
                      expandedCompleted ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedCompleted && (
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
      </div>

      {/* Day navigation */}
      <nav
        aria-label="Day navigation"
        className="flex shrink-0 items-center justify-center gap-4"
      >
        <Button
          variant="outline"
          size="icon"
          onClick={previousDay}
          disabled={dayIndex === 0}
          aria-label="Previous day"
        >
          <ChevronLeftIcon />
        </Button>

        <span className="min-w-16 text-center text-sm text-muted-foreground tabular-nums">
          {dayIndex + 1} / {groups.length}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={nextDay}
          disabled={dayIndex === groups.length - 1}
          aria-label="Next day"
        >
          <ChevronRightIcon />
        </Button>
      </nav>
    </div>
  )
}
