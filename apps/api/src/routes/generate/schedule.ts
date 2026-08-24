import type { Context } from "hono";
import { ScheduleSchema } from "@planify/schemas";
import { handleApiError } from "@planify/api/errors/handle-api-error";
import { generateSchedulePlan } from "@planify/api/services/generate-schedule-plan";

/**
 * POST /generate/schedule
 *
 * Thin HTTP layer: validates the body, delegates to the service, and maps
 * failures through the shared error envelope.
 */
export default async function postSchedule(c: Context): Promise<Response> {
  try {
    const schedule = ScheduleSchema.parse(await c.req.json());

    const plan = await generateSchedulePlan(schedule);

    return c.json(plan);
  } catch (error) {
    return handleApiError(error, c);
  }
}
