import z from "zod"
import { ReviewGenerationStateSchema, ReviewQuestionSchema, ReviewAnswerSchema } from "@/schemas"

export type ReviewGenerationState = z.infer<typeof ReviewGenerationStateSchema>
export type ReviewQuestion = z.infer<typeof ReviewQuestionSchema>
export type ReviewAnswer = z.infer<typeof ReviewAnswerSchema>
