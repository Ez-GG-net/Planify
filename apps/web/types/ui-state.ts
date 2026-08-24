import z from "zod"
import { ReviewGenerationStateSchema, ScheduleGenerationStateSchema } from "@/schemas"

export type ReviewGenerationState = z.infer<typeof ReviewGenerationStateSchema>
export type ScheduleGenerationState = z.infer<typeof ScheduleGenerationStateSchema>
