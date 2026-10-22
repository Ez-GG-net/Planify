import z from "zod"
import {
  CancellationUsageResponseSchema,
  CancellationUsageSummarySchema,
  GenerationCancelTypeSchema,
} from "@planify/schemas"

export type GenerationCancelType = z.infer<typeof GenerationCancelTypeSchema>
export type CancellationUsageSummary = z.infer<typeof CancellationUsageSummarySchema>
export type CancellationUsageResponse = z.infer<typeof CancellationUsageResponseSchema>