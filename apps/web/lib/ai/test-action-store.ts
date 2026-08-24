// @/lib/ai/test-action-store.ts

import {
  AIChatPendingAction,
  AIChatUserMessageContext,
} from "@planify/types"

interface PendingActionSession {
  context: AIChatUserMessageContext
  action: AIChatPendingAction
}

const pendingActionStore = new Map<string, PendingActionSession>()

export function savePendingAction(
  action: AIChatPendingAction,
  context: AIChatUserMessageContext,
) {
  pendingActionStore.set(action.id, {
    context,
    action,
  })
}

export function getPendingAction(actionId: string) {
  return pendingActionStore.get(actionId)
}

export function deletePendingAction(actionId: string) {
  pendingActionStore.delete(actionId)
}