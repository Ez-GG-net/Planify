import z from "zod"
import { TaskDetailsSchema } from "@planify/schemas"

export type TaskDetails = z.infer<typeof TaskDetailsSchema>
