import { z } from "zod"
import { IDv1Schema, ToolCallIdSchema, ActionIdSchema } from "@/schemas"

export type IDv1 = z.infer<typeof IDv1Schema>
export type toolCallID = z.infer<typeof ToolCallIdSchema>
export type ActionID = z.infer<typeof ActionIdSchema>
