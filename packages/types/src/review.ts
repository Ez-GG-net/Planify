import z from "zod"
import { ReviewQuestionSchema, ReviewAnswerSchema } from "@planify/schemas"

export type ReviewQuestion = z.infer<typeof ReviewQuestionSchema>
export type ReviewAnswer = z.infer<typeof ReviewAnswerSchema>
