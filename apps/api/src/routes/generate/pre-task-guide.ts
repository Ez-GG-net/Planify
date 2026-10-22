import type { Context } from "hono";
import { SchedulePlanTaskSchema } from "@planify/schemas";
import { ApiError, handleApiError } from "@planify/api/errors/handle-api-error";
import { generatePreTaskGuide } from "@planify/api/services/generate-pre-task-guide";
import { quota } from "@planify/api/services/quota-service";
import {
  listenForCancellation,
  type CancellationWatch,
} from "@planify/api/services/cancellation-service";

/**
 * POST /generate/pre-task-guide
 *
 * Thin HTTP layer: validates quota, reserves it UPFRONT (atomically) so the
 * charge lands before the generation starts, validates the body, delegates
 * to the service, and maps failures through the shared error envelope.
 * Invalid bodies, provider errors, and free cancels refund the upfront unit.
 */
export default async function postPreTaskGuide(c: Context): Promise<Response> {
  let tracker: CancellationWatch | undefined;

  try {
    const userId = c.get("user").id;

    const remaining = await quota.remaining(userId, "pre_task_guide");
    if (remaining <= 0) {
      throw new ApiError(429, "quota_exceeded", "Monthly limit for generating pre-task guides reached.");
    }

    // Charge before the generation starts. The atomic conditional UPDATE
    // makes this race-safe even across concurrent requests.
    const reserved = await quota.reserve(userId, "pre_task_guide", 1);
    if (!reserved) {
      throw new ApiError(429, "quota_exceeded", "Monthly limit for generating pre-task guides reached.");
    }

    tracker = listenForCancellation(
      userId,
      "pre_task_guide",
      c.req.raw.signal,
    );

    const task = SchedulePlanTaskSchema.parse(await c.req.json());

    const guide = await generatePreTaskGuide(task, c.req.raw.signal);

    // The generation succeeded (a late disconnect must not count as a cancel)
    tracker.markCompleted();

    return c.json(guide);
  } catch (error) {
    // Free cancel or failed request → give back the unit we reserved upfront.
    tracker?.refundUpfrontIfUnsettled();
    return handleApiError(error, c);
  }
}