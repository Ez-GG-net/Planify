import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client (React bindings). Talks to the standalone
 * API (http://localhost:3001) which serves Better Auth under /api/auth.
 * Session cookies are set on the API origin; fetches from lib/api/client
 * already send credentials: "include".
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
});

export const { useSession } = authClient;
