import z from "zod"
import { WizardScheduleStateSchema } from "@/schemas"

export type WizardScheduleState = z.infer<typeof WizardScheduleStateSchema>
