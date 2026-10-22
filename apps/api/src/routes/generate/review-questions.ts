import type { Context } from "hono";
import { WizardScheduleSchema } from "@planify/schemas";
import type { WizardSchedule } from "@planify/types";
import { ApiError, handleApiError } from "@planify/api/errors/handle-api-error";
import { generateReviewQuestions } from "@planify/api/services/generate-review-questions";
import { quota } from "@planify/api/services/quota-service";
import {
  listenForCancellation,
  type CancellationWatch,
} from "@planify/api/services/cancellation-service";

/**
 * POST /api/generate/review-questions
 *
 * Thin HTTP layer: validates quota, reserves it UPFRONT (atomically) so the
 * charge lands before the generation starts, validates the body, delegates
 * to the service, and maps failures through the shared error envelope.
 * Invalid bodies, provider errors, and free cancels refund the upfront unit.
 */
export default async function postReviewQuestions(
  c: Context,
): Promise<Response> {
  let tracker: CancellationWatch | undefined;

  try {
    const userId = c.get("user").id;

    // Check remaining quota before doing expensive work.
    const remaining = await quota.remaining(userId, "review_questions");
    if (remaining <= 0) {
      throw new ApiError(429, "quota_exceeded", "Monthly limit for generating review questions reached.");
    }

    // Charge before the generation starts. The atomic conditional UPDATE
    // makes this race-safe even across concurrent requests.
    const reserved = await quota.reserve(userId, "review_questions", 1);
    if (!reserved) {
      throw new ApiError(429, "quota_exceeded", "Monthly limit for generating review questions reached.");
    }

    tracker = listenForCancellation(
      userId,
      "review_questions",
      c.req.raw.signal,
    );

    // Runtime validation; the parsed result IS the WizardSchedule type.
    const schedule: WizardSchedule = WizardScheduleSchema.parse(
      await c.req.json(),
    );

    const questions = await generateReviewQuestions(schedule, c.req.raw.signal);

    // The generation succeeded (a late disconnect must not count as a cancel)
    tracker.markCompleted();

    return c.json(questions);
  } catch (error) {
    // Free cancel or failed request → give back the unit we reserved upfront.
    tracker?.refundUpfrontIfUnsettled();
    return handleApiError(error, c);
  }
}