import z from "zod"
import { SchedulePlanSchema, SchedulePlanTaskSchema } from "@planify/schemas"

export type SchedulePlan = z.infer<typeof SchedulePlanSchema>
export type SchedulePlanTask = z.infer<typeof SchedulePlanTaskSchema>
