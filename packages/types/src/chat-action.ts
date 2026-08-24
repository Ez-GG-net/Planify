import z from "zod"
import {
  AIChatActionTypeSchema,
  AIChatActionStatusSchema,
  AIChatPendingActionSchema,
} from "@planify/schemas"

export type AIChatActionType = z.infer<typeof AIChatActionTypeSchema>
export type AIChatActionStatus = z.infer<typeof AIChatActionStatusSchema>
export type AIChatPendingAction = z.infer<typeof AIChatPendingActionSchema>
