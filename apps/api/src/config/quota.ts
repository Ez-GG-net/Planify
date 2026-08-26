/**
 * Centralized quota configuration. Every consumer imports from this file
 * — no quota limits are hardcoded elsewhere.
 */

export type QuotaType =
  | "review_questions"
  | "schedule_plan"
  | "task_guide"
  | "pre_task_guide"
  | "chat_tokens";

export interface QuotaLimit {
  /** Max units per calendar month (UTC). */
  monthly: number;
  /**
   * For token-based quotas: max units reserved per single request.
   * `null` = no per-request cap (the full monthly allowance can be used
   * in one request for count-based quotas).
   */
  perRequest: number | null;
}

export const QUOTA_LIMITS: Record<QuotaType, QuotaLimit> = {
  review_questions: { monthly: 8, perRequest: null },
  schedule_plan: { monthly: 5, perRequest: null },
  task_guide: { monthly: 100, perRequest: null },
  pre_task_guide: { monthly: 30, perRequest: null },
  chat_tokens: { monthly: 50_000, perRequest: 4_096 },
};

/** All quota types for iteration (e.g. usage summary endpoint). */
export const QUOTA_TYPES = Object.keys(QUOTA_LIMITS) as QuotaType[];
