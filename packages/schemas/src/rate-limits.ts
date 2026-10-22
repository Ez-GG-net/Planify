import { z } from "zod";

/** Generation flows a user can cancel; keys the daily cancel allowance. */
export const GenerationCancelTypeSchema = z.enum([
  "schedule_plan",
  "review_questions",
  "task_guide",
  "pre_task_guide",
  "chat_response",
]);

export const CancellationUsageSummarySchema = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});

/** GET /rate-limits/cancellations response: today's usage per generation type. */
export const CancellationUsageResponseSchema = z.record(
  GenerationCancelTypeSchema,
  CancellationUsageSummarySchema,
);