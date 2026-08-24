import z from "zod"
import { DayGroupSchema, TaskDayDataSchema } from "@/schemas"

export type DayGroup = z.infer<typeof DayGroupSchema>
export type TaskDayData = z.infer<typeof TaskDayDataSchema>
