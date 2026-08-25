import type { MiddlewareHandler } from "hono";

import { ApiError } from "../errors/handle-api-error";
import type { AuthSession } from "../lib/auth";
import { auth } from "../lib/auth";

/** Typed context variables this middleware guarantees downstream. */
export interface AuthEnv {
  Variables: {
    user: AuthSession["user"];
    session: AuthSession["session"];
  };
}

/**
 * Blocks anonymous requests with the shared error envelope and attaches
 * the resolved Better Auth session to the Hono context.
 *
 * Thrown ApiErrors are caught by the app-level onError handler (middleware
 * runs outside route handlers' try/catch).
 */
export const requireAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    throw new ApiError(401, "unauthorized", "Authentication required");
  }

  c.set("user", session.user);
  c.set("session", session.session);

  await next();
};
