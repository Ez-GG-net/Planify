import type { Context } from "hono";
import { WizardScheduleSchema } from "@planify/schemas";
import type { WizardSchedule } from "@planify/types";
import { ApiError, handleApiError } from "@planify/api/errors/handle-api-error";
import { generateReviewQuestions } from "@planify/api/services/generate-review-questions";
import { quota } from "@planify/api/services/quota-service";

/**
 * POST /api/generate/review-questions
 *
 * Thin HTTP layer: validates quota, validates the body, delegates to the
 * service, and maps failures through the shared error envelope.
 * Quota is reserved AFTER the generation succeeds — if the client aborts,
 * no quota is consumed.
 */
export default async function postReviewQuestions(
  c: Context,
): Promise<Response> {
  try {
    const userId = c.get("user").id;

    // Check remaining quota before doing expensive work.
    const remaining = await quota.remaining(userId, "review_questions");
    if (remaining <= 0) {
      throw new ApiError(429, "quota_exceeded", "Monthly limit for generating review questions reached.");
    }

    // Runtime validation; the parsed result IS the WizardSchedule type.
    const schedule: WizardSchedule = WizardScheduleSchema.parse(
      await c.req.json(),
    );

    const questions = await generateReviewQuestions(schedule, c.req.raw.signal);

    // Reserve quota only after successful generation.
    await quota.reserve(userId, "review_questions", 1);

    return c.json(questions);
  } catch (error) {
    return handleApiError(error, c);
  }
}
