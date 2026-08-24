import type { AIChatToolArguments, AIChatToolContext } from "@planify/types"
import { bindScope } from "./bind-scope"
import { findScopedGuideStep, findScopedTask } from "./lookup"
import { proposeAction } from "./pending-action"

export async function deleteTask(
  args: AIChatToolArguments["delete_task"],
  context: AIChatToolContext,
) {
  const task = findScopedTask(context, args.taskId)

  if (!task) {
    throw new Error(`Task not found: ${args.taskId}`)
  }

  return proposeAction("delete_task", args, context)
}

export async function deleteTaskGuideStep(
  args: AIChatToolArguments["delete_task_guide_step"],
  context: AIChatToolContext,
) {
  const found = findScopedGuideStep(context, args.stepId)

  if (!found) {
    throw new Error(`Guide step not found: #${args.stepId}`)
  }

  return proposeAction("delete_task_guide_step", args, context)
}

/**
 * Pre-task variant. Proposals reuse the "delete_task" action type — the
 * client-side applier targets whichever list the conversation is scoped to.
 */
export const deletePreTask = bindScope("pre-task", deleteTask)
