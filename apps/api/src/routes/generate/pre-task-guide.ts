import type { Context } from "hono";
import { SchedulePlanTaskSchema } from "@planify/schemas";
import { ApiError, handleApiError } from "@planify/api/errors/handle-api-error";
import { generatePreTaskGuide } from "@planify/api/services/generate-pre-task-guide";
import { quota } from "@planify/api/services/quota-service";

/**
 * POST /generate/pre-task-guide
 *
 * Thin HTTP layer: validates quota, validates the body, delegates to the
 * service, and maps failures through the shared error envelope.
 * Quota is reserved AFTER the generation succeeds.
 */
export default async function postPreTaskGuide(c: Context): Promise<Response> {
  try {
    const userId = c.get("user").id;

    const remaining = await quota.remaining(userId, "pre_task_guide");
    if (remaining <= 0) {
      throw new ApiError(429, "quota_exceeded", "Monthly pre_task_guide limit reached.");
    }

    const task = SchedulePlanTaskSchema.parse(await c.req.json());

    const guide = await generatePreTaskGuide(task);

    await quota.reserve(userId, "pre_task_guide", 1);

    return c.json(guide);
  } catch (error) {
    return handleApiError(error, c);
  }
}
