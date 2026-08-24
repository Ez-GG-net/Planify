"use client"

import { ReactNode, useState } from "react"
import {
  formatProposedActionStatus,
  formatResolvedActionStatus,
} from "@planify/types"
import type { AIChatMessage, AIChatMessagePart } from "@planify/types"
import { Bot, Check, ChevronDown, Clock3, User, X } from "lucide-react"

import { PendingActionCard } from "./pending-action-card"
import { useAIChatRuntime } from "./chat-runtime"

type ToolPart = Extract<AIChatMessagePart, { type: "tool" }>
type ActionPart = Extract<AIChatMessagePart, { type: "action" }>

/** "0.4" -> "Thought for 400ms", "3.62" -> "Thought for 3.6s", "83.1" -> "Thought for 1m 23s". */
function formatThoughtDuration(seconds: number) {
  if (seconds < 1) {
    return `Thought for ${Math.round(seconds * 1000)}ms`
  }

  if (seconds < 60) {
    return `Thought for ${seconds.toFixed(1)}s`
  }

  const minutes = Math.floor(seconds / 60)

  return `Thought for ${minutes}m ${Math.round(seconds % 60)}s`
}

/**
 * Collapsible reasoning block.
 *
 * The block never opens or closes on its own — it starts collapsed and only
 * a click toggles it. While deltas are streaming the header shimmers as
 * "Thinking"; once the stream stamps a measured duration onto the segment it
 * permanently reads "Thought for 3.6s".
 */
function ThinkingBlock({
  content,
  isActive,
  durationSeconds,
}: {
  content: string
  isActive: boolean
  durationSeconds?: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-l-2 border-muted-foreground/30 pl-3">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className="flex items-center gap-1 text-xs font-medium text-foreground"
      >
        <span className={isActive ? "text-shine" : undefined}>
          {durationSeconds != null
            ? formatThoughtDuration(durationSeconds)
            : "Thinking"}
        </span>
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? "" : "-rotate-90"
          }`}
        />
      </button>

      {/* grid-rows 1fr <-> 0fr animates height without measuring content */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-1 text-foreground/80">{content}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * A tool call rendered together with any action proposals it produced, so
 * they read as one unit instead of separate parts:
 *
 *   [icon] modify_task · Proposed updating "Eat Lunch"
 *   ---------------------------------------------------------------------------------------
 *   [icon] Update task "Eat Lunch"            ▾
 *   Start time: 11:00 AM → 12:00 PM
 *   [Accept] [Reject]
 *
 * Status line precedence:
 *   1. resolved proposal state (past-tense / Rejected / apply failure)
 *   2. pending proposal state ("Proposed ...")
 *   3. server-composed outcome sentence (reads + failures)
 *   4. bare stream state as a fallback
 */
function ToolBlock({
  toolPart,
  actions,
}: {
  toolPart: ToolPart
  actions: ActionPart[]
}) {
  const { getTaskById, scope } = useAIChatRuntime()

  const linkedAction = actions.at(-1)?.action
  const writeOptions = {
    scope,
    getTitle: (taskId: string) => getTaskById?.(taskId)?.title,
  }

  // Capitalized so it can be used directly as a JSX element.
  let Icon = Clock3
  let iconClassName = ""
  let statusLabel: string = toolPart.status
  let isFailed = false

  if (toolPart.status === "started") {
    statusLabel = "Running..."
  } else if (toolPart.status === "failed") {
    Icon = X
    iconClassName = "text-destructive"
    statusLabel = toolPart.statusText ?? "failed"
    isFailed = true
  } else if (linkedAction != null) {
    switch (linkedAction.status) {
      case "pending":
        statusLabel = formatProposedActionStatus(linkedAction, writeOptions)
        break
      case "approved":
      case "applied":
        Icon = Check
        iconClassName = "text-primary"
        statusLabel = formatResolvedActionStatus(linkedAction, writeOptions)
        break
      case "rejected":
        Icon = X
        iconClassName = "text-destructive"
        statusLabel = formatResolvedActionStatus(linkedAction, writeOptions)
        isFailed = true
        break
      case "failed":
        Icon = X
        iconClassName = "text-destructive"
        statusLabel = formatResolvedActionStatus(linkedAction, writeOptions)
        isFailed = true
        break
    }
  } else if (toolPart.status === "completed") {
    Icon = Check
    iconClassName = "text-primary"
    statusLabel = toolPart.statusText ?? "completed"
  }

  return (
    <div className="bg-background/70 w-full overflow-hidden rounded-lg border border-border/60 text-xs">
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-muted-foreground">
        <Icon className={`size-3.5 shrink-0 ${iconClassName}`} />
        <span>{toolPart.tool}</span>
        <span aria-hidden="true">·</span>
        <span className={isFailed ? "text-destructive" : undefined}>
          {statusLabel}
        </span>
      </div>
      {actions.map((actionPart) => (
        <PendingActionCard
          key={`${actionPart.action.id}-${actionPart.action.status}`}
          action={actionPart.action}
          before={actionPart.before}
        />
      ))}
    </div>
  )
}

export default function AIChatMessageBubble({
  message,
  isStreaming = false,
}: {
  message: AIChatMessage
  isStreaming?: boolean
}) {
  const isUser = message.role === "user"
  // Narrowed to assistant messages; a local const keeps the optional-array
  // type stable inside the render callback below.
  const parts = message.role === "assistant" ? message.parts : undefined

  /*
   * Parts arrive as a flat stream (tool calls and proposals are stored
   * separately), but proposals belong visually to the tool call that
   * produced them. Group each tool part with every action part sharing its
   * toolCallId before rendering; consumed actions are skipped when their
   * own turn comes.
   */
  const renderedParts: ReactNode[] = []
  const consumedIndexes = new Set<number>()

  if (parts) {
    parts.forEach((part, index) => {
      if (consumedIndexes.has(index)) {
        return
      }

      if (part.type === "thinking") {
        renderedParts.push(
          <ThinkingBlock
            key={index}
            content={part.content}
            isActive={
              isStreaming &&
              index === parts.length - 1 &&
              // A stamped duration means the segment already finished; the
              // header must not shimmer again (e.g. on re-render).
              part.durationSeconds == null
            }
            durationSeconds={part.durationSeconds}
          />
        )
        return
      }

      if (part.type === "message") {
        renderedParts.push(<div key={index}>{part.content}</div>)
        return
      }

      if (part.type === "tool") {
        const linkedActions: { part: ActionPart; index: number }[] = []

        parts.forEach((candidate, candidateIndex) => {
          if (
            candidate.type === "action" &&
            candidate.action.toolCallId === part.toolCallId
          ) {
            linkedActions.push({
              part: candidate,
              index: candidateIndex,
            })
            consumedIndexes.add(candidateIndex)
          }
        })

        renderedParts.push(
          <ToolBlock key={index} toolPart={part} actions={linkedActions.map(({ part }) => part)} />
        )
        return
      }

      // Action proposal without a matching tool part in this message —
      // render it standalone so it is never dropped silently.
      renderedParts.push(
        <div
          key={index}
          className="w-fit overflow-hidden rounded-lg border border-border/60 text-xs"
        >
          <PendingActionCard
            key={`${part.action.id}-${part.action.status}`}
            action={part.action}
            before={part.before}
          />
        </div>
      )
    })
  }

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser || !parts ? (
          message.content
        ) : (
          <div className="space-y-3">{renderedParts}</div>
        )}
      </div>
    </div>
  )
}
