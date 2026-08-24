import type { Context } from "hono";
import { WizardScheduleSchema } from "@planify/schemas";
import type { WizardSchedule } from "@planify/types";
import { handleApiError } from "@planify/api/errors/handle-api-error";
import { generateReviewQuestions } from "@planify/api/services/generate-review-questions";

/**
 * POST /api/generate/review-questions
 *
 * Thin HTTP layer: validates the body, delegates to the service, and maps
 * failures through the shared error envelope. All business logic lives in
 * services/.
 */
export default async function postReviewQuestions(
  c: Context,
): Promise<Response> {
  try {
    // Runtime validation; the parsed result IS the WizardSchedule type.
    const schedule: WizardSchedule = WizardScheduleSchema.parse(
      await c.req.json(),
    );

    const questions = await generateReviewQuestions(schedule);

    return c.json(questions);
  } catch (error) {
    return handleApiError(error, c);
  }
}
