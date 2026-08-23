import type {
  AIChatPendingAction,
  AIChatUserMessageContext,
  SchedulePlanTask,
} from "@/types"

/*
 * ---------------------------------------------------------------------------
 * Pre-change snapshots for action proposals.
 *
 * A proposal's diff must keep showing what changed even after the change is
 * applied (or the entity deleted), so the affected values are captured from
 * the plan at the moment the proposal streams in and stored on the message
 * part (`before`). Rendering prefers the snapshot and only falls back to
 * live lookups for transcripts captured before this existed.
 * ---------------------------------------------------------------------------
 */

/** Same precedence as the chat's own task lookups: scoped list first. */
function findContextTask(
  context: AIChatUserMessageContext,
  taskId: string
): SchedulePlanTask | undefined {
  return (
    context.tasks?.find((task) => task.id === taskId) ??
    context.schedule?.tasks.find((task) => task.id === taskId) ??
    (context.currentTask?.id === taskId ? context.currentTask : undefined)
  )
}

export function captureActionBefore(
  action: AIChatPendingAction,
  context: AIChatUserMessageContext
): Record<string, unknown> | undefined {
  switch (action.type) {
    case "modify_task": {
      const task = findContextTask(context, action.arguments.taskId)

      if (task == null) {
        return undefined
      }

      const record = task as unknown as Record<string, unknown>
      const before: Record<string, unknown> = { title: task.title }

      // `?? null`, not raw values: unset fields must survive the JSON
      // round-trip through sessionStorage, which drops `undefined` keys.
      // Consumers treat null and undefined identically.
      for (const key of Object.keys(action.arguments.changes)) {
        before[key] = record[key] ?? null
      }

      return before
    }

    case "delete_task": {
      // Only the title is needed: it keeps the card heading readable after
      // the task is removed from the plan.
      const task = findContextTask(context, action.arguments.taskId)

      return task == null ? undefined : { title: task.title }
    }

    case "modify_task_guide_step": {
      const steps = context.currentGuide?.steps
      const stepIndex =
        steps?.findIndex((candidate) => candidate.id === action.arguments.stepId) ??
        -1

      if (steps == null || stepIndex === -1) {
        return undefined
      }

      const step = steps[stepIndex]
      const { changes } = action.arguments
      const before: Record<string, unknown> = {}

      /*
       * The action vocabulary differs from the step record: `description`
       * addresses the step's `content`, and `order` is the step's array
       * position (ids are indexes that renumber after every insert/move).
       * Null sentinels keep unset fields intact across the JSON round-trip.
       */
      if (changes.title != null) {
        before.title = step.title
      }
      if (changes.description != null) {
        before.description = step.content ?? null
      }
      if (changes.order != null) {
        before.order = stepIndex
      }

      return before
    }

    // create_* have no prior state; delete_task_guide_step needs no values.
    default:
      return undefined
  }
}
