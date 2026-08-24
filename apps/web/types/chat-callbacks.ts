import z from "zod"
import { AIChatStreamCallbacksSchema } from "@/schemas"

export type AIChatStreamCallbacks = z.infer<typeof AIChatStreamCallbacksSchema>
