import { z } from "zod";
import {
  AIChatMessageSchema,
  AIChatPendingActionSchema,
  ActionIDSchema,
  ToolCallIDSchema,
} from "@planify/schemas"

/**
 * Client-side callback surface for consuming the chat SSE stream. Callbacks
 * never cross the wire; only AIChatStreamEvent payloads do (shared package).
 */
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

  onUsage: z
    .function()
    .input(z.tuple([z.number()]))
    .output(z.void())
    .optional(),

  onUsageLimitReached: z
    .function()
    .input(z.tuple([z.string()]))
    .output(z.void())
    .optional(),

  onComplete: z
    .function()
    .input(z.tuple([AIChatMessageSchema]))
    .output(z.void())
    .optional(),
})
