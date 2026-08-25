// Ensures process.env is populated before ../config evaluates — this file
// is also loaded standalone by tooling (drizzle-kit, probes), which never
// runs server.ts.
import "../lib/load-env";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { config } from "../config";
import { db } from "../db";
import { captureExternalAvatar } from "./avatar";
import {
  user as userTable,
  session,
  account,
  verification,
  userAvatar,
} from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Better Auth instance. Served at <base>/api/auth by app.ts (the library's
 * default basePath — the React client and Google redirect URI assume it).
 *
 * Schema maintenance (as of better-auth/core 1.7.x): src/db/schema.ts is
 * hand-maintained against @better-auth/core's zod model definitions
 * (dist/db/schema/*.mjs) — the published @better-auth/cli is stuck on
 * 1.4.x and generates schemas missing 1.7 fields such as account.issuer.
 * Verify parity after every Better Auth upgrade.
 */
export const auth = betterAuth({
  baseURL: config.auth.baseUrl,
  webURL: config.auth.webUrl,
  secret: config.auth.secret,

  session: {
    expiresIn: 5 * 60, // 5 minutes
    updateAge: 60, // push the session expiry date forward every 60 seconds (1 minute) to keep it alive
    //disableSessionRefresh: true, // never refresh the session automatically (push the expiry date forward)
  },

  trustedOrigins: [...config.auth.trustedOrigins],

  database: drizzleAdapter(db, {
    provider: "pg",
    // v1.7's adapter does not discover tables by name — the generated
    // schema must be handed to it explicitly.
    schema: { user: userTable, session, account, verification },
  }),

  socialProviders: {
    google: {
      clientId: config.auth.google.clientId,
      clientSecret: config.auth.google.clientSecret,
    },
  },

  /**
   * Capture-once avatars: after an OAuth callback creates a new user,
   * download the provider-hosted image into user_avatar and rewrite the
   * user row to point at our own serving endpoint. Returning nothing
   * keeps the original value when capture fails.
   */
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Only run after OAuth callbacks (e.g. /callback/google, /callback/github)
      if (!ctx.path.startsWith("/callback/")) return;
      const newSession = ctx.context.newSession;
      if (!newSession) return;

      const { id, image } = newSession.user;
      if (!image) return;

      // Already captured — skip returning users
      const [existing] = await db
        .select({ userId: userAvatar.userId })
        .from(userAvatar)
        .where(eq(userAvatar.userId, id))
        .limit(1);
      if (existing) return;

      const selfHostedUrl = await captureExternalAvatar(id, image);
      if (!selfHostedUrl) return;

      // Rewrite user.image so subsequent sessions return the self-hosted URL
      await db
        .update(userTable)
        .set({ image: selfHostedUrl })
        .where(eq(userTable.id, id));

      console.log(`[avatar] captured for user ${id}`);
    }),
  },
});

/**
 * Server-side session type, inferred so schema changes flow through
 * automatically (e.g. requireAuth middleware and typed contexts).
 */
export type AuthSession = typeof auth.$Infer.Session;
