import type { Context } from "hono";
import { ScheduleSchema } from "@planify/schemas";
import { ApiError, handleApiError } from "@planify/api/errors/handle-api-error";
import { generateSchedulePlan } from "@planify/api/services/generate-schedule-plan";
import { quota } from "@planify/api/services/quota-service";
import {
  listenForCancellation,
  type CancellationWatch,
} from "@planify/api/services/cancellation-service";

/**
 * POST /generate/schedule
 *
 * Thin HTTP layer: validates quota, reserves it UPFRONT (atomically) so the
 * charge lands before the generation starts, validates the body, delegates
 * to the service, and maps failures through the shared error envelope.
 * Invalid bodies, provider errors, and free cancels refund the upfront unit.
 */
export default async function postSchedule(c: Context): Promise<Response> {
  let tracker: CancellationWatch | undefined;

  try {
    const userId = c.get("user").id;

    const remaining = await quota.remaining(userId, "schedule_plan");
    if (remaining <= 0) {
      throw new ApiError(429, "quota_exceeded", "Monthly limit for generating schedule plans reached.");
    }

    // Charge before the generation starts. The atomic conditional UPDATE
    // makes this race-safe even across concurrent requests.
    const reserved = await quota.reserve(userId, "schedule_plan", 1);
    if (!reserved) {
      throw new ApiError(429, "quota_exceeded", "Monthly limit for generating schedule plans reached.");
    }

    tracker = listenForCancellation(
      userId,
      "schedule_plan",
      c.req.raw.signal,
    );

    const schedule = ScheduleSchema.parse(await c.req.json());

    const plan = await generateSchedulePlan(schedule, c.req.raw.signal);

    // The generation succeeded (a late disconnect must not count as a cancel)
    tracker.markCompleted();

    return c.json(plan);
  } catch (error) {
    // Free cancel or failed request → give back the unit we reserved upfront.
    tracker?.refundUpfrontIfUnsettled();
    return handleApiError(error, c);
  }
}