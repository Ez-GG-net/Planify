import type { Context } from "hono";
import { SchedulePlanTaskSchema } from "@planify/schemas";
import { handleApiError } from "@planify/api/errors/handle-api-error";
import { generatePreTaskGuide } from "@planify/api/services/generate-pre-task-guide";

/**
 * POST /generate/pre-task-guide
 *
 * Thin HTTP layer: validates the body, delegates to the service, and maps
 * failures through the shared error envelope.
 */
export default async function postPreTaskGuide(c: Context): Promise<Response> {
  try {
    const task = SchedulePlanTaskSchema.parse(await c.req.json());

    const guide = await generatePreTaskGuide(task);

    return c.json(guide);
  } catch (error) {
    return handleApiError(error, c);
  }
}
