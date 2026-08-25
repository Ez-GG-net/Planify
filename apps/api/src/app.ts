import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config";
import { handleApiError } from "./errors/handle-api-error";
import { auth } from "./lib/auth";
import { generateRoutes } from "./routes";
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
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  )
  .all("/api/auth/*", (c) => auth.handler(c.req.raw))
  .route("/users", userRoutes)
  .route("/generate", generateRoutes)
  .get("/health", (c) => c.json({ ok: true })); //Later add a more comprehensive health check
