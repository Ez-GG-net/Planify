"use client"

import { useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import type {
  AIChatPendingAction,
  SchedulePlanTask,
  TaskGuideStep,
} from "@planify/types"
import {
  minutesToDurationLabel,
  minutesToTimeLabel,
} from "@/lib/task/task-time"
import { AlertTriangle, Check, ChevronDown, Clock3, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAIChatRuntime } from "./chat-runtime"

/**
 * Resolves a guide step from the conversation's live guide. The step's
 * position travels with it because ids are array indexes that renumber
 * after every insert/move â€” a bare lookup cannot answer "where is it now".
 */
export type GuideStepResolver = (
  stepId: number
) => { step: TaskGuideStep; order: number } | undefined

interface PendingActionCardProps {
  action: AIChatPendingAction
  /**
   * Values captured when the proposal arrived, so diffs and headings stay
   * truthful after the change applies (or the entity disappears). Absent on
   * older transcripts; live lookups are the fallback.
   */
  before?: Record<string, unknown>
}

interface ActionChangeRow {
  label: string
  before: string
  after: string
}

function formatDetailValue(value: unknown): string {
  if (value == null) {
    return "â€”"
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatDetailValue(item)).join(", ")
  }

  if (typeof value === "object") {
    const entries = Object.entries(value)

    return entries
      .map(
        ([key, value]) =>
          `${key.charAt(0).toUpperCase() + key.slice(1)}: ${formatDetailValue(value)}`
      )
      .join(", ")
  }

  return String(value)
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getDetailChanges(before: unknown, after: unknown) {
  if (!isRecord(before) || !isRecord(after)) {
    return []
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)])

  return [...keys].flatMap((key) => {
    const beforeValue = before[key]
    const afterValue = after[key]

    const beforeExists = key in before
    const afterExists = key in after

    if (
      beforeExists &&
      afterExists &&
      JSON.stringify(beforeValue) === JSON.stringify(afterValue)
    ) {
      return []
    }

    return [
      {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        before: beforeExists ? formatDetailValue(beforeValue) : "\" \"",
        after: afterExists ? formatDetailValue(afterValue) : "\" \"",
      },
    ]
  })
}

function valueOrDash(value: string | number | undefined) {
  return value == null || value === "" ? "Not set" : String(value)
}

function taskTitle(task: SchedulePlanTask | undefined) {
  return task == null ? "Unknown task" : `${task.title}`
}

interface ActionHeadline {
  /** Fixed verb phrase, e.g. "Delete task". */
  prefix: string
  /** The referenced entity, rendered as its own clickable span when live. */
  label: string
  /** Present when the label points at something that exists right now. */
  target?: { taskId: string; stepId?: number }
}

function actionHeadline(
  action: AIChatPendingAction,
  getTaskById?: (taskId: string) => SchedulePlanTask | undefined,
  currentTaskId?: string,
  before?: Record<string, unknown>
): ActionHeadline {
  const a = action.arguments as Record<string, unknown>
  // The proposal-time title keeps headings readable once the entity has
  // been renamed or removed; live lookup is the fallback.
  const referencedTitle =
    before != null && typeof before.title === "string"
      ? before.title
      : taskTitle(getTaskById?.(a.taskId as string))

  switch (action.type) {
    case "modify_task":
      return {
        prefix: "Modify task:",
        label: referencedTitle,
        target: { taskId: a.taskId as string },
      }
    case "create_task":
      return { prefix: "Create task:", label: `${a.title as string}` }
    case "delete_task":
      return {
        prefix: "Delete task",
        label: referencedTitle,
        target: { taskId: a.taskId as string },
      }
    case "create_task_guide_step":
      return { prefix: "Add step:", label: `${a.title as string}` }
    case "modify_task_guide_step": {
      const stepId = a.stepId as number

      return {
        prefix: "Update step",
        label: `#${stepId}`,
        // Guide-step actions carry no parent id; the conversation's
        // current task supplies it.
        target:
          currentTaskId != null ? { taskId: currentTaskId, stepId } : undefined,
      }
    }
    case "delete_task_guide_step": {
      const stepId = a.stepId as number

      return {
        prefix: "Remove step",
        label: `#${stepId}`,
        target:
          currentTaskId != null ? { taskId: currentTaskId, stepId } : undefined,
      }
    }
  }
}

function actionDetails(action: AIChatPendingAction): string {
  return JSON.stringify(action, null, 2)
}

function ChangeRows({ rows }: { rows: ActionChangeRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">
            {row.label}
          </div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="max-w-full wrap-break-word text-muted-foreground">
              {row.before}
            </span>
            <span aria-hidden="true" className="text-muted-foreground/70">
              â†’
            </span>
            <span className="max-w-full font-medium wrap-break-word text-foreground">
              {row.after}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ModifyTaskAction({
  action,
  before,
}: Pick<PendingActionCardProps, "action" | "before">) {
  const { getTaskById } = useAIChatRuntime()

  if (action.type !== "modify_task") {
    return null
  }

  const task = getTaskById?.(action.arguments.taskId)

  // Without the entity and without a snapshot there is nothing truthful to
  // preview. A snapshot alone is enough: it holds the proposal-time state.
  if (!task && before == null) {
    return (
      <StaleAction message="This task is no longer available. The proposed change cannot be safely previewed." />
    )
  }

  const { changes } = action.arguments
  const rows: ActionChangeRow[] = []

  /*
   * The snapshot captured when the proposal arrived is authoritative for
   * the "before" side; live lookups only cover legacy transcripts that
   * predate snapshots (and would show no diff after applying).
   */
  const beforeValue = (key: string): unknown => {
    if (before != null && key in before) {
      return before[key]
    }

    if (task == null) {
      return undefined
    }

    return (task as unknown as Record<string, unknown>)[key]
  }

  if (changes.startTime != null) {
    const rawStart = beforeValue("startTime") as number | undefined

    rows.push({
      label: "Start time",
      before: rawStart == null ? "Not set" : minutesToTimeLabel(rawStart),
      after: minutesToTimeLabel(changes.startTime),
    })
  }
  if (changes.estimatedDuration != null) {
    const rawDuration = beforeValue("estimatedDuration") as number | undefined

    rows.push({
      label: "Duration",
      before:
        rawDuration == null
          ? "Not set"
          : minutesToDurationLabel(rawDuration),
      after: minutesToDurationLabel(changes.estimatedDuration),
    })
  }
  if (changes.date != null) {
    rows.push({
      label: "Date",
      before: valueOrDash(beforeValue("date") as string | undefined),
      after: changes.date,
    })
  }
  if (changes.title != null) {
    const rawTitle = beforeValue("title")

    rows.push({
      label: "Title",
      before: typeof rawTitle === "string" ? rawTitle : "Not set",
      after: changes.title,
    })
  }
  if (changes.details != null) {
    rows.push(...getDetailChanges(beforeValue("details"), changes.details))
  }

  return (
    <>
      {rows.length > 0 ? (
        <ChangeRows rows={rows} />
      ) : (
        <p className="text-sm text-muted-foreground">
          No visible changes were provided.
        </p>
      )}
    </>
  )
}

function CreateTaskAction({ action }: Pick<PendingActionCardProps, "action">) {
  if (action.type !== "create_task") {
    return null
  }

  const { arguments: task } = action

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <div>Date: {task.date}</div>

      <div>
        Time: {minutesToTimeLabel(task.startTime)}
        {task.estimatedDuration != null &&
          ` - ${minutesToTimeLabel(task.startTime + task.estimatedDuration)}`}
      </div>

      {task.details != null &&
        Object.entries(task.details).map(([key, value]) => (
          <div key={key}>
            {key.charAt(0).toUpperCase() + key.slice(1)}:{" "}
            {formatDetailValue(value)}
          </div>
        ))}
    </div>
  )
}

function DeleteTaskAction({
  action,
  before,
}: Pick<PendingActionCardProps, "action" | "before">) {
  const { getTaskById } = useAIChatRuntime()

  if (action.type !== "delete_task") {
    return null
  }

  const task = getTaskById?.(action.arguments.taskId)

  // A snapshot means the proposal is still meaningful even though the task
  // has since been removed (e.g. an applied delete being re-read).
  if (!task && before == null) {
    return (
      <StaleAction message="This task is no longer available. It cannot be safely removed." />
    )
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        This task will be removed from your schedule.
      </p>
    </>
  )
}

function GuideAction({
  action,
  before,
}: Pick<PendingActionCardProps, "action" | "before">) {
  const { getGuideStep } = useAIChatRuntime()

  if (action.type === "create_task_guide_step") {
    return (
      <>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
          {action.arguments.description}
        </p>
      </>
    )
  }

  if (action.type !== "modify_task_guide_step") {
    return null
  }

  const resolved = getGuideStep?.(action.arguments.stepId)

  // A snapshot alone is enough to preview truthfully; with neither, there
  // is no pre-change state to describe.
  if (resolved == null && before == null) {
    return (
      <StaleAction message="This guide step is no longer available. The proposed change cannot be safely previewed." />
    )
  }

  const { changes } = action.arguments
  const rows: ActionChangeRow[] = []

  // Snapshot first (authoritative proposal-time state); live lookups only
  // serve legacy transcripts that predate snapshots.
  const beforeValue = (key: string): unknown => {
    if (before != null && key in before) {
      return before[key]
    }

    if (key === "order") {
      return resolved?.order
    }

    if (key === "description") {
      return resolved?.step.content
    }

    if (key === "title") {
      return resolved?.step.title
    }

    return undefined
  }

  if (changes.title != null) {
    const rawTitle = beforeValue("title")

    rows.push({
      label: "Title",
      before: typeof rawTitle === "string" ? rawTitle : "Not set",
      after: changes.title,
    })
  }
  if (changes.description != null) {
    rows.push({
      label: "Description",
      before: valueOrDash(beforeValue("description") as string | undefined),
      after: changes.description,
    })
  }
  if (changes.order != null) {
    rows.push({
      label: "Position",
      before: valueOrDash(beforeValue("order") as number | undefined),
      after: String(changes.order),
    })
  }

  return rows.length > 0 ? (
    <ChangeRows rows={rows} />
  ) : (
    <p className="text-sm text-muted-foreground">
      No visible changes were provided.
    </p>
  )
}

function StaleAction({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function ActionBody({
  action,
  before,
}: Pick<PendingActionCardProps, "action" | "before">) {
  switch (action.type) {
    case "modify_task":
      return <ModifyTaskAction action={action} before={before} />
    case "create_task":
      return <CreateTaskAction action={action} />
    case "delete_task":
      return <DeleteTaskAction action={action} before={before} />
    case "create_task_guide_step":
      return <GuideAction action={action} />
    case "modify_task_guide_step":
      return <GuideAction action={action} before={before} />
    case "delete_task_guide_step":
      return (
        <p className="text-sm text-muted-foreground">
          This guide step will be removed.
        </p>
      )
  }
}

function StatusMessage({ action }: { action: AIChatPendingAction }) {
  if (action.status === "pending") {
    return null
  }

  if (action.status === "applied") {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <Check className="size-4" />
        <span>Applied to your schedule</span>
      </div>
    )
  }

  if (action.status === "approved") {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <Check className="size-4" />
        <span>Approved, waiting to be applied</span>
      </div>
    )
  }

  if (action.status === "failed") {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <X className="size-4" />
        <span>This action could not be applied.</span>
      </div>
    )
  }

  // Rejected
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock3 className="size-4" />
      <span>Rejected</span>
    </div>
  )
}

export function PendingActionCard({ action, before }: PendingActionCardProps) {
  const { getTaskById, getGuideStep, resolveAction, navigateToEntity, currentTaskId } =
    useAIChatRuntime()
  const isPending = action.status === "pending"
  const [isExpanded, setIsExpanded] = useState(isPending)
  // Only a pending action without any snapshot is stale: it can neither be
  // previewed from the snapshot nor applied against the live plan.
  const isStale =
    ((action.type === "modify_task" || action.type === "delete_task") &&
      !getTaskById?.(action.arguments.taskId) &&
      before == null) ||
    (action.type === "modify_task_guide_step" &&
      !getGuideStep?.(action.arguments.stepId) &&
      before == null)

  // Resolved proposals read as done: strikethrough, muted.
  const headingTextClass = isPending
    ? "text-foreground"
    : "text-muted-foreground line-through"

  const headline = actionHeadline(action, getTaskById, currentTaskId, before)
  // Only live entities are navigable; create_* targets don't exist yet.
  const navTarget = headline.target

  function handleEntityClick(event: ReactMouseEvent) {
    event.stopPropagation()

    if (navTarget != null) {
      navigateToEntity(navTarget)
    }
  }

  return (
    <section className="border-t border-border/60 bg-background/70 px-3 py-3 first:border-t-0">
      {/*
        One header row: the status icon + verb prefix toggle the collapse;
        the entity label inside is a nested stop-clickable that follows the
        reference instead.
      */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            setIsExpanded((expanded) => !expanded)
          }
        }}
        className="flex w-full cursor-pointer items-center gap-1.5 text-xs font-medium select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {isPending ? (
          <Clock3 className="size-3.5 shrink-0 text-primary" />
        ) : (
          <Check className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className={headingTextClass}>{headline.prefix}</span>{" "}
        {navTarget != null ? (
          <button
            type="button"
            onClick={handleEntityClick}
            className={`cursor-pointer rounded-sm text-left underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${headingTextClass}`}
          >
            {headline.label}
          </button>
        ) : (
          <span className={headingTextClass}>{headline.label}</span>
        )}
        <ChevronDown
          className={`ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? "" : "-rotate-90"
          }`}
        />
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 pt-3">
            <ActionBody action={action} before={before} />
            <StatusMessage action={action} />

            {isPending && !isStale && (
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => resolveAction(action.id, "rejected")}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => resolveAction(action.id, "approved")}
                >
                  Accept
                </Button>
              </div>
            )}

            <details className="group pt-1">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground [&::-webkit-details-marker]:hidden">
                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                Technical details
              </summary>
              <pre className="mt-2 no-scrollbar max-h-40 overflow-auto rounded-md bg-muted p-2 text-[10px] leading-relaxed break-all text-muted-foreground">
                {actionDetails(action)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </section>
  )
}
