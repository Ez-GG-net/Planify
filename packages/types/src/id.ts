import { z } from "zod"
import { IDv1Schema, ToolCallIDSchema, ActionIDSchema, GenerationCancelIDSchema } from "@planify/schemas"

export type IDv1 = z.infer<typeof IDv1Schema>
export type toolCallID = z.infer<typeof ToolCallIDSchema>
export type ActionID = z.infer<typeof ActionIDSchema>
export type GenerationCancelID = z.infer<typeof GenerationCancelIDSchema>