import z from "zod"
import {
  AIChatEntityTypeSchema,
  AIChatUserMessageSchema,
  AIChatUserMessageContextSchema,
  AIChatAssistantMessageSchema,
  AIChatMessageSchema,
  AIChatUpdateSchema,
} from "@planify/schemas"

export type AIChatUserMessage = z.infer<typeof AIChatUserMessageSchema>
export type AIChatUserMessageContext = z.infer<typeof AIChatUserMessageContextSchema>
export type AIChatAssistantMessage = z.infer<typeof AIChatAssistantMessageSchema>
export type AIChatMessagePart = NonNullable<AIChatAssistantMessage["parts"]>[number]
export type AIChatMessage = z.infer<typeof AIChatMessageSchema>
export type AIChatEntityType = z.infer<typeof AIChatEntityTypeSchema>
export type AIChatUpdate = z.infer<typeof AIChatUpdateSchema>
