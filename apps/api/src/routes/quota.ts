import { Hono } from "hono";

import { QUOTA_TYPES } from "../config/quota";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { quota } from "../services/quota-service";

/**
 * GET /quota
 *
 * Returns the current month's usage for every quota type. Requires an
 * authenticated session.
 *
 * Response shape:
 * {
 *   "review_questions": { "used": 2, "limit": 5 },
 *   "schedule_plan":    { "used": 1, "limit": 3 },
 *   ...
 * }
 */
export const quotaRoutes = new Hono<AuthEnv>()
  .use("*", requireAuth)
  .get("/", async (c) => {
    const userId = c.get("user").id;

    const entries = await Promise.all(
      QUOTA_TYPES.map(async (type) => {
        const stats = await quota.usage(userId, type);
        return [type, stats] as const;
      }),
    );

    return c.json(Object.fromEntries(entries));
  });
