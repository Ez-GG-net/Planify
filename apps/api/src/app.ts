import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config";
import { checkDatabase } from "./db";
import { handleApiError } from "./errors/handle-api-error";
import { auth } from "./lib/auth";
import { generateRoutes } from "./routes/generate";
import { quotaRoutes } from "./routes/quota";
import { scheduleRoutes } from "./routes/schedules";
import { userRoutes } from "./routes/users";

/**
 * Hono API application.
 *
 * - CORS is restricted to the configured web origins with credentials
 *   enabled — never a wildcard, because the session cookie must be sent.
 * - Better Auth serves every auth endpoint under /api/auth/*.
 * - onError maps middleware-thrown errors (e.g. requireAuth's 401) into
 *   the shared error envelope; route handlers also map their own errors.
 */
export const app = new Hono()
  .onError((error, c) => handleApiError(error, c))
  .use(
    "/*",
    cors({
      origin: config.allowedOrigins,
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  )
  .all("/api/auth/*", (c) => auth.handler(c.req.raw))
  .route("/users", userRoutes) // combines with an ID to get user-scoped resources (e.g. avatar)
  .route("/schedules", scheduleRoutes) // gets all schedules on /, combines with an ID to CRUD a single plan
  .route("/generate", generateRoutes) // generates content using AI (e.g. schedules, chat)
  .route("/quota", quotaRoutes) // gets quota usage and remaining allowance
  .get("/health", async (c) => {
    const dbOk = await checkDatabase();
    if (!dbOk) {
      return c.json({ ok: false, database: "unreachable" }, 503);
    }
    return c.json({ ok: true, database: "connected" });
  });
