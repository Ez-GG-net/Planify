import type {
  AIChatPendingAction,
  SchedulePlan,
  SchedulePlanTask,
} from "@/types"
import type {
  AIChatScope,
  AIChatTool,
} from "./tool-type"

/*
 * ---------------------------------------------------------------------------
 * Status one-liners for tool calls and proposals.
 *
 * These formatters are intentionally pure and dependency-free so BOTH the
 * API route (streaming events) and the client components (resolved-action
 * states) can compose identical copy from the same vocabulary.
 *
 * Three tenses exist per write tool:
 *   proposed — the call completed and produced a proposal
 *   done     — the user accepted and it was applied
 *   failure  — execution threw
 * ---------------------------------------------------------------------------
 */

/** Minimal slice of the tool context needed for server-side title lookups. */
export interface SummaryContext {
  virtualSchedule: SchedulePlan
  scope: AIChatScope
}

function noun(scope: AIChatScope) {
  return scope === "pre-task" ? "pre-task" : "task"
}

function quoted(value: string | undefined) {
  return value == null ? "" : ` "${value}"`
}

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1)
}

/**
 * Strips trailing identifiers ("Task not found: abc-123" -> "task not
 * found") so failure reasons read like prose instead of log lines.
 */
function normalizeReason(message: string) {
  const withoutId = message.replace(/:\s*\S+\s*$/, "").trim()

  return lowerFirst(withoutId.length > 0 ? withoutId : message)
}

function isTask(value: unknown): value is SchedulePlanTask {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SchedulePlanTask).title === "string"
  )
}

function scopedList(context: SummaryContext): SchedulePlanTask[] {
  return context.scope === "pre-task"
    ? context.virtualSchedule.preTasks
    : context.virtualSchedule.tasks
}

function findScopedTitle(
  context: SummaryContext,
  taskId: string
): string | undefined {
  return scopedList(context).find((task) => task.id === taskId)?.title
}

/*
 * Per-tool failure vocabulary. The entity noun is resolved at call time so
 * scope-aware tools read "task" vs "pre-task".
 */
const FAILURE_ACTIONS: Record<
  AIChatTool,
  (scope: AIChatScope) => string
> = {
  get_task: (scope) => `retrieve ${noun(scope)}`,
  get_pre_task: () => "retrieve pre-task",
  get_filtered_tasks: (scope) => `search ${noun(scope)}s`,
  get_filtered_pre_tasks: () => "search pre-tasks",
  get_schedule: () => "retrieve schedule",
  get_task_guide: () => "retrieve guide",
  create_task: (scope) => `create ${noun(scope)}`,
  create_pre_task: () => "create pre-task",
  create_task_guide_step: () => "add guide step",
  modify_task: (scope) => `update ${noun(scope)}`,
  modify_pre_task: () => "update pre-task",
  modify_task_guide_step: () => "update guide step",
  delete_task: (scope) => `delete ${noun(scope)}`,
  delete_pre_task: () => "delete pre-task",
  delete_task_guide_step: () => "remove guide step",
}

function failurePhrase(tool: AIChatTool, scope: AIChatScope) {
  return FAILURE_ACTIONS[tool]?.(scope) ?? "run tool"
}

/** "Couldn't retrieve task — task not found". Entity omitted when unknown. */
export function formatToolFailure(
  tool: AIChatTool,
  error: unknown,
  context: Pick<SummaryContext, "scope">
) {
  const raw =
    error instanceof Error ? error.message : "unexpected server error"

  return `Couldn't ${failurePhrase(tool, context.scope)} — ${normalizeReason(raw)}`
}

/** Proposed-state copy shared by the streaming route and the client card. */
function proposedText(
  tool: AIChatTool,
  args: unknown,
  resolveTitle: (taskId: string) => string | undefined,
  scope: AIChatScope
): string | undefined {
  const a = args as Record<string, unknown>

  switch (tool) {
    case "create_task":
    case "create_pre_task":
      return `Proposed creating ${noun(scope)}${quoted(a.title as string)}`
    case "modify_task":
    case "modify_pre_task":
      return `Proposed updating ${noun(scope)}${quoted(resolveTitle(a.taskId as string))}`
    case "delete_task":
    case "delete_pre_task":
      return `Proposed deleting ${noun(scope)}${quoted(resolveTitle(a.taskId as string))}`
    case "create_task_guide_step":
      return `Proposed adding step${quoted(a.title as string)}`
    case "modify_task_guide_step":
      return `Proposed updating step #${a.stepId}`
    case "delete_task_guide_step":
      return `Proposed removing step #${a.stepId}`
    default:
      return undefined
  }
}

/**
 * Success copy for a finished tool call. Read tools describe what they
 * returned; write tools phrase themselves as proposals (their completion
 * only means a proposal was emitted).
 */
export function formatToolSuccess(
  tool: AIChatTool,
  args: unknown,
  result: unknown,
  context: SummaryContext
): string | undefined {
  const a = args as Record<string, unknown>
  const { scope } = context

  const proposed = proposedText(
    tool,
    args,
    (taskId) => findScopedTitle(context, taskId),
    scope
  )
  if (proposed != null) {
    return proposed
  }

  switch (tool) {
    case "get_task":
    case "get_pre_task": {
      if (isTask(result)) {
        return `Retrieved ${noun(scope)}${quoted(result.title)}`
      }
      return `Retrieved ${noun(scope)}`
    }

    case "get_schedule": {
      const plan = result as SchedulePlan | undefined

      return `Retrieved schedule${quoted(plan?.title)}`
    }

    case "get_task_guide": {
      const title = findScopedTitle(context, a.taskId as string)

      return title != null
        ? `Retrieved guide for "${title}"`
        : "Retrieved guide"
    }

    case "get_filtered_tasks":
    case "get_filtered_pre_tasks": {
      const count = Array.isArray(result) ? result.length : 0

      return count === 0
        ? `No matching ${noun(scope)}s found`
        : `Found ${count} matching ${noun(scope)}${count === 1 ? "" : "s"}`
    }

    default:
      return undefined
  }
}

/*
 * ---------------------------------------------------------------------------
 * Client-side copy for proposal resolution states. `getTitle` resolves IDs
 * against the conversation context (scoped tasks first).
 * ---------------------------------------------------------------------------
 */

export interface WriteStatusOptions {
  getTitle: (taskId: string) => string | undefined
  scope: AIChatScope
}

const DONE_VERBS: Partial<Record<AIChatPendingAction["type"], string>> = {
  create_task: "Created task",
  modify_task: "Updated task",
  delete_task: "Deleted task",
  create_task_guide_step: "Added step",
  modify_task_guide_step: "Updated step",
  delete_task_guide_step: "Removed step",
}

/**
 * Maps a proposal's lifecycle state to its status line. Pending states come
 * from the server stream, so this only needs the resolved outcomes.
 */
export function formatResolvedActionStatus(
  action: AIChatPendingAction,
  options: WriteStatusOptions
): string {
  const { getTitle, scope } = options
  const a = action.arguments as Record<string, unknown>

  if (action.status === "rejected") {
    return "Rejected"
  }

  if (action.status === "failed") {
    return `Couldn't ${failurePhrase(actionTypeToTool(action.type), scope)} — apply failed`
  }

  // approved / applied -> past tense
  const verb = DONE_VERBS[action.type]

  if (verb == null) {
    return "Applied"
  }

  if (action.type.endsWith("_guide_step")) {
    if (action.type === "create_task_guide_step") {
      return `${verb}${quoted(a.title as string)}`
    }
    return `${verb} #${a.stepId}`
  }

  return `${verb}${quoted(getTitle(a.taskId as string) ?? undefined)}`
}

function actionTypeToTool(type: AIChatPendingAction["type"]): AIChatTool {
  const map: Record<AIChatPendingAction["type"], AIChatTool> = {
    create_task: "create_task",
    modify_task: "modify_task",
    delete_task: "delete_task",
    create_task_guide_step: "create_task_guide_step",
    modify_task_guide_step: "modify_task_guide_step",
    delete_task_guide_step: "delete_task_guide_step",
  }

  return map[type]
}

/** Proposed-state line used by the bubble while an action awaits approval. */
export function formatProposedActionStatus(
  action: AIChatPendingAction,
  options: WriteStatusOptions
): string {
  const text = proposedText(
    actionTypeToTool(action.type),
    action.arguments,
    options.getTitle,
    options.scope
  )

  return text ?? "Awaiting approval"
}

/**
 * Builds an entity reference from a proposal so its header can navigate to
 * (or glow) the affected item. Create actions target entities that do not
 * exist yet, so they resolve to null and stay non-clickable.
 */
export function actionEntityTarget(
  action: AIChatPendingAction
): { kind: "task"; taskId: string } | { kind: "step"; taskId?: string; stepId: number } | null {
  const a = action.arguments as Record<string, unknown>

  switch (action.type) {
    case "modify_task":
    case "delete_task":
      return { kind: "task", taskId: a.taskId as string }
    case "modify_task_guide_step":
    case "delete_task_guide_step":
      return { kind: "step", stepId: a.stepId as number }
    default:
      // create_* : nothing to navigate to until applied
      return null
  }
}
