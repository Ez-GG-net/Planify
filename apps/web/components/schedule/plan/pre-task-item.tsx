import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { TaskState } from "@/lib/task/task-state"
import { PreTaskGuide, SchedulePlanTask } from "@planify/types"
import { TaskStateIndicator } from "./task-state-indicator"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { minutesToDurationLabel } from "@/lib/task/task-time"

interface PreTaskItemProps {
  task: SchedulePlanTask
  state: TaskState
  isCompleted: boolean
  guide?: PreTaskGuide
  isLoading: boolean
  hasError: boolean
  onToggle: (id: string) => void
  onRetry: (id: string) => void
}

export default function PreTaskItem({
  task,
state,
  isCompleted,
  guide,
  isLoading,
  hasError,
  onToggle,
  onRetry,
}: PreTaskItemProps) {
  return (
    <AccordionItem value={task.id} data-highlight-id={task.id}>
      <ContextMenu>
        <ContextMenuTrigger className="block">
          <AccordionTrigger className="items-center gap-2 px-3 py-3">
            <TaskRow
              task={task}
              state={state}
              isCompleted={isCompleted}
            />
          </AccordionTrigger>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={() => onToggle(task.id)}>
            {isCompleted ? "Mark as incomplete" : "Complete"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AccordionContent className="px-3">
        <div className="space-y-3 pt-2">
          <GuideState
            guide={guide}
            isLoading={isLoading}
            hasError={hasError}
            onRetry={() => onRetry(task.id)}
          />

          <div className="border-t pt-3">
            <Button
              variant={isCompleted ? "ghost" : "outline"}
              size="sm"
              onClick={() => onToggle(task.id)}
            >
              {isCompleted
                ? "Mark as incomplete"
                : "Mark as complete"}
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

function TaskRow({
  task,
  state,
  isCompleted,
}: {
  task: SchedulePlanTask
  state: TaskState
  isCompleted: boolean
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span
        aria-hidden
        className="inline-flex w-4 shrink-0 items-center justify-center"
      >
        <TaskStateIndicator state={state} />
      </span>

      <span
        className={[
          "min-w-0 flex-1 truncate text-sm font-medium",
          isCompleted
            ? "text-muted-foreground line-through"
            : "text-foreground",
        ].join(" ")}
      >
        {task.title}
      </span>
    </span>
  )
}

function GuideState({
  guide,
  isLoading,
  hasError,
  onRetry,
}: {
  guide?: PreTaskGuide
  isLoading: boolean
  hasError: boolean
  onRetry: () => void
}) {
  if (isLoading) {
    return (
      <div
        className="space-y-2 pl-4"
        role="status"
        aria-label="Loading task guide"
      >
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex items-center gap-2 pl-4 text-sm text-destructive">
        <span>Failed to load the task guide.</span>

        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (!guide) return null

  return <TaskGuideContent guide={guide} />
}

function TaskGuideContent({
  guide,
}: {
  guide: PreTaskGuide
}) {
  return (
    <div className="space-y-4 pl-4">
      {guide.description && (
        <p className="text-sm text-muted-foreground">
          {guide.description}
        </p>
      )}

      {guide.steps.length > 0 && (
        <ol className="space-y-3">
          {guide.steps.map((step, index) => (
            <li key={index} className="flex gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">
                {index + 1}.
              </span>

              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {step.title}
                </p>

                {step.description && (
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-muted-foreground">
        Estimated time: {minutesToDurationLabel(404)}
      </p>

      <GuideList
        title="Requirements"
        items={["404", "Not found"]}
      />

      <GuideList
        title="Notes"
        items={["Four O' Four", "Not Found"]}
      />
    </div>
  )
}

function GuideList({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  if (items.length === 0) return null

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>

      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}