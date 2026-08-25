import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../db";
import { userAvatar } from "../db/schema";
import { ApiError } from "../errors/handle-api-error";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";

/**
 * User-scoped resources. All routes require a valid session; thrown
 * ApiErrors fall through to the app-level onError envelope.
 */
export const userRoutes = new Hono<AuthEnv>()
  .use("*", requireAuth)
  .get("/:id/avatar", async (c) => {
    const id = c.req.param("id");

    const [row] = await db
      .select()
      .from(userAvatar)
      .where(eq(userAvatar.userId, id))
      .limit(1);

    if (!row) {
      throw new ApiError(404, "not_found", "Avatar not found");
    }

    // Raw Response: binary body with explicit headers. Private caching —
    // the bytes are only meant for authenticated sessions.
    return new Response(new Uint8Array(row.data), {
      status: 200,
      headers: {
        "Content-Type": row.mimeType,
        "Content-Length": String(row.byteSize),
        "Cache-Control": "private, max-age=86400",
      },
    });
  });
