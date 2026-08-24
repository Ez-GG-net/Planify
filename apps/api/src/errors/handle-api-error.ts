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
