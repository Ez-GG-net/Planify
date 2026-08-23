import z from "zod"
import { DayGroupSchema, TaskDayDataSchema, TaskDetailsSchema } from "@/schemas"

export type DayGroup = z.infer<typeof DayGroupSchema>
export type TaskDayData = z.infer<typeof TaskDayDataSchema>
export type TaskDetails = z.infer<typeof TaskDetailsSchema>