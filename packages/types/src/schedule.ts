import z from "zod"
import { ScheduleSchema, WizardScheduleSchema } from "@planify/schemas"

export type Schedule = z.infer<typeof ScheduleSchema>
export type WizardSchedule = z.infer<typeof WizardScheduleSchema>
