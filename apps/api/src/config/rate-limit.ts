import type { GenerationCancelType } from "@planify/types";

/**
 * Centralized cancellation rate-limit configuration. Every consumer imports
 * from this file — limits are never hardcoded elsewhere.
 *
 * The first `DAILY_CANCEL_LIMIT` cancels per day (UTC) per generation type
 * are free. Any cancel beyond that is still allowed but counts against the
 * user's regular monthly quota.
 */
export const GENERATION_CANCEL_TYPES: GenerationCancelType[] = [
  "schedule_plan",
  "review_questions",
  "task_guide",
  "pre_task_guide",
  "chat_response",
];

export const DAILY_CANCEL_LIMIT: Record<GenerationCancelType, number> = {
  schedule_plan: 2,
  review_questions: 2,
  task_guide: 2,
  pre_task_guide: 2,
  chat_response: 3,
};