import type { Context } from "hono";
import { ScheduleSchema } from "@planify/schemas";
import { ApiError, handleApiError } from "@planify/api/errors/handle-api-error";
import { generateSchedulePlan } from "@planify/api/services/generate-schedule-plan";
import { quota } from "@planify/api/services/quota-service";

/**
 * POST /generate/schedule
 *
 * Thin HTTP layer: validates quota, validates the body, delegates to the
 * service, and maps failures through the shared error envelope.
 * Quota is reserved AFTER the generation succeeds.
 */
export default async function postSchedule(c: Context): Promise<Response> {
  try {
    const userId = c.get("user").id;

    const remaining = await quota.remaining(userId, "schedule_plan");
    if (remaining <= 0) {
      throw new ApiError(429, "quota_exceeded", "Monthly limit for generating schedule plans reached.");
    }

    const schedule = ScheduleSchema.parse(await c.req.json());

    const plan = await generateSchedulePlan(schedule);

    await quota.reserve(userId, "schedule_plan", 1);

    return c.json(plan);
  } catch (error) {
    return handleApiError(error, c);
  }
}
