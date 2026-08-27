import type { Context } from "hono";
import { SchedulePlanTaskSchema } from "@planify/schemas";
import { ApiError, handleApiError } from "@planify/api/errors/handle-api-error";
import { generateTaskGuide } from "@planify/api/services/generate-task-guide";
import { quota } from "@planify/api/services/quota-service";

/**
 * POST /generate/task-guide
 *
 * Thin HTTP layer: validates quota, validates the body, delegates to the
 * service, and maps failures through the shared error envelope.
 * Quota is reserved AFTER the generation succeeds.
 */
export default async function postTaskGuide(c: Context): Promise<Response> {
  try {
    const userId = c.get("user").id;

    const remaining = await quota.remaining(userId, "task_guide");
    if (remaining <= 0) {
      throw new ApiError(429, "quota_exceeded", "Monthly limit for generating task guides reached.");
    }

    const task = SchedulePlanTaskSchema.parse(await c.req.json());

    const guide = await generateTaskGuide(task, c.req.raw.signal);

    await quota.reserve(userId, "task_guide", 1);

    return c.json(guide);
  } catch (error) {
    return handleApiError(error, c);
  }
}
