/**
 * Central API configuration. Everything environment-specific lives here so
 * deployment targets only differ by env vars.
 */

function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Resolves the Postgres connection string.
 *
 * The docker-compose stack is configured by the POSTGRES_* variables, so
 * those are authoritative when present — deriving the URL prevents the
 * classic drift where DATABASE_URL disagrees with the initialized cluster
 * (Postgres only applies POSTGRES_PASSWORD on first volume creation).
 * A fully-formed DATABASE_URL remains the escape hatch for external
 * databases (e.g. hosted prod instances).
 */
function resolveDatabaseUrl(): string {
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;

  if (user && password && database) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
      password,
    )}@localhost:5432/${encodeURIComponent(database)}`;
  }

  return (
    process.env.DATABASE_URL ??
    "postgresql://planify:planify@localhost:5432/planify"
  );
}

export const config = {
  port: Number(process.env.PORT ?? 3001),

  /**
   * Browser origins allowed to call this API. Comma-separated in env;
   * never use "*" for an authenticated API.
   */
  allowedOrigins: parseOrigins(process.env.WEB_ORIGINS ?? "http://localhost:3000"),

  /** Postgres connection string for Drizzle/Better Auth. */
  databaseUrl: resolveDatabaseUrl(),

  auth: {
    /** Public URL of this API; Better Auth serves /auth under it. */
    baseUrl: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3001}`,
    /** Public URL of the web client; Better Auth redirects to it after sign-in. */
    webUrl: process.env.BETTER_AUTH_WEB_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET ?? "",
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    /**
     * Origins allowed to initiate sign-in and receive session cookies.
     * Mirrors the CORS allowlist; Better Auth checks these on OAuth
     * callbacks and redirect URLs.
     */
    trustedOrigins: parseOrigins(process.env.WEB_ORIGINS ?? "http://localhost:3000"),
  },

  ollama: {
    apiUrl: process.env.OLLAMA_API_URL ?? "http://localhost:11434/api/chat",
    model: process.env.OLLAMA_MODEL ?? "gpt-oss:20b",
  },

  /**
   * AI generation concurrency. Ollama serves one request at a time on the
   * local GPU, so all generation endpoints share a single FIFO queue. The
   * queue has a maximum length; requests beyond it are rejected immediately.
   */
  ai: {
    maxConcurrentGenerations: Number(
      process.env.AI_MAX_CONCURRENT_GENERATIONS ?? 1,
    ),
    /** Maximum number of requests that can wait in the queue at once. */
    maxQueueLength: Number(process.env.AI_MAX_QUEUE_LENGTH ?? 3),
  },
} as const;
