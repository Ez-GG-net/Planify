"use client"

import { createContext, useContext } from "react"
import type { ReactNode } from "react"

import type { AIChatScope, SchedulePlanTask } from "@planify/types"

import type { GuideStepResolver } from "./pending-action-card"

/*
 * ---------------------------------------------------------------------------
 * Chat runtime context.
 *
 * Values every proposal card needs (task/guide lookups, decision handling,
 * entity navigation, scoping) are identical across a conversation, so they
 * are provided once by the chat container instead of drilled through
 * bubble -> tool block -> card. Per-item data (the action itself, its
 * snapshot) intentionally stays on props.
 * ---------------------------------------------------------------------------
 */

export interface AIChatRuntimeValue {
  /** Resolves a task against the conversation's scoped task lists. */
  getTaskById: (taskId: string) => SchedulePlanTask | undefined
  /** Resolves a guide step (with its live position) for guide chats. */
  getGuideStep: GuideStepResolver
  /** Applies an Accept/Reject decision made on a proposal card. */
  resolveAction: (actionId: string, decision: "approved" | "rejected") => void
  /** Follows an entity reference: glows it or navigates to its page. */
  navigateToEntity: (target: { taskId: string; stepId?: number }) => void
  /** Parent task for guide-step references, which carry only a step id. */
  currentTaskId?: string
  /** Which task list this conversation can mutate. */
  scope: AIChatScope
}

const AIChatRuntimeContext = createContext<AIChatRuntimeValue | null>(null)

export function AIChatRuntimeProvider({
  value,
  children,
}: {
  value: AIChatRuntimeValue
  children: ReactNode
}) {
  return (
    <AIChatRuntimeContext.Provider value={value}>
      {children}
    </AIChatRuntimeContext.Provider>
  )
}

export function useAIChatRuntime(): AIChatRuntimeValue {
  const runtime = useContext(AIChatRuntimeContext)

  if (runtime == null) {
    throw new Error(
      "useAIChatRuntime must be used inside an AIChatRuntimeProvider"
    )
  }

  return runtime
}
