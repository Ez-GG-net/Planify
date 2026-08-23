import z from "zod"
import { ScheduleGenerationStateSchema, ScheduleSchema, WizardScheduleSchema } from "@/schemas"

export type ScheduleGenerationState = z.infer<typeof ScheduleGenerationStateSchema>
export type Schedule = z.infer<typeof ScheduleSchema>
export type WizardSchedule = z.infer<typeof WizardScheduleSchema>
