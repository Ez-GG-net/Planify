import { AIChatToolArguments, AIChatToolContext } from "./tool-type"
import { bindScope } from "./bind-scope"
import { findScopedGuideStep, findScopedTask } from "./lookup"
import { proposeAction } from "./pending-action"

export async function modifyTask(
  args: AIChatToolArguments["modify_task"],
  context: AIChatToolContext,
) {
  const task = findScopedTask(context, args.taskId)

  if (!task) {
    throw new Error(`Task not found: ${args.taskId}`)
  }

  return proposeAction("modify_task", args, context)
}

export async function modifyTaskGuideStep(
  args: AIChatToolArguments["modify_task_guide_step"],
  context: AIChatToolContext,
) {
  const found = findScopedGuideStep(context, args.stepId)

  if (!found) {
    throw new Error(`Guide step not found: #${args.stepId}`)
  }

  return proposeAction("modify_task_guide_step", args, context)
}

/**
 * Pre-task variant. Proposals reuse the "modify_task" action type — the
 * client-side applier targets whichever list the conversation is scoped to.
 */
export const modifyPreTask = bindScope("pre-task", modifyTask)