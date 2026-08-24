import Link from "next/link"
import { ArrowRight } from "lucide-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { TaskState } from "@/lib/task/task-state"
import { SchedulePlanTask } from "@planify/types"
import { TaskStateIndicator } from "./task-state-indicator"
import { useSchedulePlanList } from "./schedule-plan-context"

interface TaskListItemProps {
  task: SchedulePlanTask
  state: TaskState
  /** Compact label shown at the end of the row (or below the title when featured). */
  metaLabel?: string
  /** Featured style used for the "up next" box: meta on its own line + arrow. */
  featured?: boolean
}

export function TaskListItem({
  task,
  state,
  metaLabel,
  featured = false,
}: TaskListItemProps) {
  const { planId, toggleTask } = useSchedulePlanList()
  const completed = state === "completed"
  const overdue = state === "overdue"
  const upcoming = state === "upcoming"

  const labelClass = completed
    ? "line-through text-muted-foreground"
    : overdue
      ? "text-destructive"
      : upcoming
        ? "text-muted-foreground"
        : "text-foreground"

  return (
    <div className="flex w-full items-center rounded-md hover:bg-muted/40" data-highlight-id={task.id}>
      <ContextMenu>
        {/* Clicking a task opens its detail page; right-click toggles completion. */}
        <ContextMenuTrigger
          render={
            <Link
              href={`/view/schedule/${planId}/task/${task.id}`}
              className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
            >
              <span
                aria-hidden
                className="inline-flex w-4 shrink-0 items-center justify-center"
              >
                <TaskStateIndicator state={state} />
              </span>

              {featured ? (
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`truncate ${labelClass}`}>{task.title}</span>
                  {metaLabel && (
                    <span className={`text-xs tabular-nums ${labelClass}`}>
                      {metaLabel}
                    </span>
                  )}
                </span>
              ) : (
                <span className={`min-w-0 flex-1 truncate ${labelClass}`}>
                  {task.title}
                </span>
              )}

              {featured ? (
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                metaLabel && (
                  <span
                    className={`shrink-0 text-xs tabular-nums ${labelClass}`}
                  >
                    {metaLabel}
                  </span>
                )
              )}
            </Link>
          }
        />
        <ContextMenuContent>
          <ContextMenuItem onClick={() => toggleTask(task.id)}>
            {completed ? "Mark as incomplete" : "Complete"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}
