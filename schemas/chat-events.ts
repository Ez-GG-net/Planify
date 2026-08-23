import { z } from "zod"
import { AIChatMessageSchema } from "./chat-message"
import { AIChatPendingActionSchema } from "./chat-action"
import { ActionIDSchema, ToolCallIDSchema } from "./id"

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

export const AIChatStreamCallbacksSchema = z.object({
  onText: z
    .function()
    .input(z.tuple([z.string()]))
    .output(z.void()),

  onThinking: z
    .function()
    .input(z.tuple([z.string()]))
    .output(z.void())
    .optional(),

  onThinkingFinished: z
    .function()
    .input(z.tuple([z.number()]))
    .output(z.void())
    .optional(),

  onToolStarted: z
    .function()
    .input(z.tuple([ToolCallIDSchema, z.string()]))
    .output(z.void())
    .optional(),

  onToolCompleted: z
    .function()
    .input(z.tuple([ToolCallIDSchema, z.string(), z.string().optional()]))
    .output(z.void())
    .optional(),
  onToolFailed: z
    .function()
    .input(z.tuple([ToolCallIDSchema, z.string(), z.string().optional()]))
    .output(z.void())
    .optional(),

  onAction: z
    .function()
    .input(z.tuple([AIChatPendingActionSchema]))
    .output(z.void()),

  onActionResolved: z
    .function()
    .input(z.tuple([ActionIDSchema, z.enum(["approved", "rejected"])]))
    .output(z.void())
    .optional(),

  onComplete: z
    .function()
    .input(z.tuple([AIChatMessageSchema]))
    .output(z.void())
    .optional(),
})