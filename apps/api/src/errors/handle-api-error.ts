import type { Context } from "hono";
import { ZodError } from "zod";

/**
 * Minimal error envelope, expanded in later phases (auth/quota/rate-limit
 * errors join the same hierarchy and mapping).
 *
 * Envelope shape:
 *   { error: { code: string, message: string } }
 *
 * Internal details (stacks, DB errors, provider internals) are logged
 * server-side only; clients receive stable codes and safe messages.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function badRequest(message: string): ApiError {
  return new ApiError(400, "invalid_request", message);
}

/**
 * Detects Postgres driver errors (pg.DatabaseError and friends).
 * These surface when the database is unreachable, shutting down, or the
 * connection pool is exhausted.
 */
function isDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  // pg.DatabaseError, pg.ClassFactoryError, etc. — any error from the
  // `pg` package will have `code` as a string (postgres error code or
  // Node system error code like ECONNREFUSED).
  const code = (error as unknown as Record<string, unknown>).code;
  if (typeof code === "string") {
    // Postgres error codes are 5 characters (e.g. "57P01", "08006").
    // Node/system error codes are alphabetic (e.g. "ECONNREFUSED").
    if (/^[A-Z0-9]{5}$/.test(code)) return true; // postgres error
    if (/^E[A-Z]+$/.test(code)) return true;       // system error (ECONNREFUSED, ETIMEDOUT, …)
  }

  return false;
}

/**
 * Maps any thrown error to a safe JSON response. Never rethrows.
 */
export function handleApiError(error: unknown, c: Context): Response {
  if (error instanceof ZodError) {
    // Validation failures describe the client's own payload, so the field
    // paths are safe to return.
    return c.json(
      {
        error: {
          code: "invalid_request",
          message: `Invalid request: ${error.issues
            .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
            .join("; ")}`,
        },
      },
      400,
    );
  }

  if (error instanceof ApiError) {
    return c.json(
      { error: { code: error.code, message: error.message } },
      error.status as 400,
    );
  }

  // Detect Postgres connection / infrastructure errors.
  // pg.DatabaseError has a string `code` property (e.g. "ECONNREFUSED",
  // "ETIMEDOUT", "57P01" for admin shutdown, "57P03" for cannot-connect-now).
  if (isDatabaseError(error)) {
    console.error("[api] Database error:", error);
    return c.json(
      {
        error: {
          code: "database_unreachable",
          message: "The database is temporarily unavailable. Please try again.",
        },
      },
      503,
    );
  }

  console.error("[api] Unhandled error:", error);

  return c.json(
    {
      error: {
        code: "internal_error",
        message: "An unexpected error occurred",
      },
    },
    500,
  );
}
