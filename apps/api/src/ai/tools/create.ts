import type { AIChatToolArguments, AIChatToolContext } from "@planify/types"
import { bindScope } from "./bind-scope"
import { findScopedTask } from "./lookup"
import { proposeAction } from "./pending-action"

export async function createTask(
  args: AIChatToolArguments["create_task"],
  context: AIChatToolContext,
) {
  /*
   * Nothing to validate here — the task doesn't exist yet. Concerns like
   * duplicate titles or scheduling conflicts belong to the apply step, which
   * runs against live schedule state after the user approves.
   */
  return proposeAction("create_task", args, context)
}

export async function createTaskGuideStep(
  args: AIChatToolArguments["create_task_guide_step"],
  context: AIChatToolContext,
) {
  const task = findScopedTask(context, args.taskId)

  if (!task) {
    throw new Error(`Task not found: ${args.taskId}`)
  }

  // The task not having a guide yet is fine — the apply step creates the
  // guide implicitly when its first step is accepted.
  return proposeAction("create_task_guide_step", args, context)
}

/**
 * Pre-task variant. Proposals reuse the "create_task" action type — the
 * client-side applier targets whichever list the conversation is scoped to,
 * so no separate action type is needed.
 */
export const createPreTask = bindScope("pre-task", createTask)
