import { AIChatPendingAction } from "@/types"
import {
  generateRandomActionID,
  generateRandomToolCallID,
} from "@/lib/create-id"

import { AIChatToolContext } from "./tool-type"

/**
 * Builds an approval-gated action proposal, registers it on the tool
 * context, and returns the tool result the model receives.
 *
 * Write tools never mutate `virtualSchedule` themselves — they only propose.
 * The change is applied client-side if the user accepts the action.
 *
 * The generic ties each call site's arguments to its action type while the
 * discriminated-union plumbing lives here in one place.
 */
export function proposeAction<K extends AIChatPendingAction["type"]>(
  type: K,
  args: Extract<AIChatPendingAction, { type: K }>["arguments"],
  context: AIChatToolContext,
): { status: "pending_approval"; actionId: string } {
  const action = {
    id: generateRandomActionID(),
    toolCallId: context.currentToolCallId ?? generateRandomToolCallID(),
    type,
    status: "pending",
    arguments: args,
    // `type` and `arguments` are correlated at every call site by the
    // generic parameter, but TypeScript cannot verify that through the
    // indexed union access, so the assertion is sound.
  } as Extract<AIChatPendingAction, { type: K }>

  context.addPendingAction(action)

  return {
    status: "pending_approval",
    actionId: action.id,
  }
}
