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

export const config = {
  port: Number(process.env.PORT ?? 3001),

  /**
   * Browser origins allowed to call this API. Comma-separated in env;
   * never use "*" for an authenticated API.
   */
  allowedOrigins: parseOrigins(process.env.WEB_ORIGINS ?? "http://localhost:3000"),
} as const;
