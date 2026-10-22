import { Hono } from "hono";
import { CancellationUsageResponseSchema } from "@planify/schemas";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { cancellations } from "../services/cancellation-service";
import { GENERATION_CANCEL_TYPES } from "../config/rate-limit";

/**
 * GET /rate-limits/cancellations
 *
 * Returns today's cancellation usage for every generation type. Requires an
 * authenticated session. Used by the UI to show how many free cancels
 * remain before cancels start counting against monthly quota.
 */
export const rateLimitRoutes = new Hono<AuthEnv>()
  .use("*", requireAuth)
  .get("/cancellations", async (c) => {
    const userId = c.get("user").id;

    const usage: Record<string, { used: number; limit: number }> = {};

    for (const type of GENERATION_CANCEL_TYPES) {
      usage[type] = await cancellations.usage(userId, type);
    }

    return c.json(CancellationUsageResponseSchema.parse(usage));
  });