import z from "zod"
import {
  AIChatStreamEventSchema,
  AIChatStreamEventsSchema,
} from "@planify/schemas"

export type AIChatStreamEvent = z.infer<typeof AIChatStreamEventSchema>
export type AIChatStreamEvents = z.infer<typeof AIChatStreamEventsSchema>

export const AIChatStreamEventSSEEPrefix = "data:"
