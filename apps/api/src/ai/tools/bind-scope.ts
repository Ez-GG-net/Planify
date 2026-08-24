import type { AIChatScope, AIChatToolContext } from "@planify/types"

/**
 * Produces the pre-task variant of a task tool by pinning its scope.
 *
 * Every lookup reads `context.scope`, so re-binding is all that separates
 * e.g. `delete_task` from `delete_pre_task` — no logic is duplicated, and
 * a pre-task tool simply cannot resolve an ID from the main list.
 */
export function bindScope<Args, Result>(
  scope: AIChatScope,
  tool: (args: Args, context: AIChatToolContext) => Promise<Result>,
): (args: Args, context: AIChatToolContext) => Promise<Result> {
  return async (args, context) => {
    const scopedContext: AIChatToolContext = { ...context, scope }

    return tool(args, scopedContext)
  }
}
