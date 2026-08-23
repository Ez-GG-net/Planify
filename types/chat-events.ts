import z from "zod"
import {
  AIChatStreamEventSchema,
  AIChatStreamEventsSchema,
  AIChatStreamCallbacksSchema,
} from "@/schemas"

export type AIChatStreamEvent = z.infer<typeof AIChatStreamEventSchema>
export type AIChatStreamEvents = z.infer<typeof AIChatStreamEventsSchema>
export type AIChatStreamCallbacks = z.infer<typeof AIChatStreamCallbacksSchema>

export const AIChatStreamEventSSEEPrefix = "data:"
