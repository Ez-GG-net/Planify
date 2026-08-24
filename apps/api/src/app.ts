import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config";
import { generateRoutes } from "./routes";

/**
 * Hono API application. All routes live under /[version]/*.
 *
 * CORS is restricted to the configured web origins with credentials
 * enabled — never a wildcard, because the session cookie must be sent.
 */
export const app = new Hono()
  .use(
    "/*",
    cors({
      origin: config.allowedOrigins,
      credentials: true,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  )
  .route("/generate", generateRoutes)
  .get("/health", (c) => c.json({ ok: true }));
