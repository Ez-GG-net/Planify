import { z } from "zod"
import { AIChatMessageSchema } from "./chat-message"
import { AIChatPendingActionSchema } from "./chat-action"
import { ActionIDSchema, ToolCallIDSchema } from "./id"

/**
 * Wire protocol for the chat SSE stream. The framing (CRLF delimiters and
 * the `data:` prefix) lives with the servers/clients that serialize these
 * events; this schema only describes each event's payload.
 */
export const AIChatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message_delta"),
    content: z.string(),
  }),
  z.object({
    type: z.literal("thinking_delta"),
    content: z.string(),
  }),
  z.object({
    type: z.literal("thinking_finished"),
    durationSeconds: z.number(),
  }),
  z.object({
    type: z.literal("tool_started"),
    toolCallId: ToolCallIDSchema,
    tool: z.string(),
  }),
  z.object({
    type: z.literal("tool_completed"),
    toolCallId: ToolCallIDSchema,
    tool: z.string(),
    // Human-readable one-liner of what the tool produced, e.g.
    // 'Retrieved task "Eat Lunch"'. Absent for unknown/legacy streams.
    statusText: z.string().optional(),
  }),
  z.object({
    type: z.literal("tool_failed"),
    toolCallId: ToolCallIDSchema,
    tool: z.string(),
    // Human-readable failure sentence, e.g.
    // "Couldn't retrieve task — task not found".
    statusText: z.string().optional(),
  }),
  z.object({
    type: z.literal("action_proposed"),
    action: AIChatPendingActionSchema,
  }),
  z.object({
    type: z.literal("action_resolved"),
    actionId: ActionIDSchema,
    status: z.enum(["approved", "rejected"]),
  }),
  z.object({
    type: z.literal("done"),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
])

export const AIChatStreamEventsSchema = z.enum([
  "message_delta",
  "action_proposed",
  "action_resolved",
  "thinking_delta",
  "thinking_finished",
  "tool_started",
  "tool_completed",
  "tool_failed",
  "done",
  "error",
])
