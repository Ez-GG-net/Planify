import type { MiddlewareHandler } from "hono";

import { ApiError } from "../errors/handle-api-error";
import type { QuotaType } from "../config/quota";
import { QUOTA_LIMITS } from "../config/quota";
import { quota } from "../services/quota-service";
import type { AuthEnv } from "./require-auth";

/** Context variables set by the quota middleware for downstream refund use. */
export interface QuotaEnv {
  Variables: {
    quotaReservation: { type: QuotaType; reserved: number } | null;
  };
}

/**
 * Reserves quota before a request proceeds. If the user has insufficient
 * monthly allowance, throws 429 quota_exceeded.
 *
 * For token-based quotas (chat_tokens), the `amount` caps the reservation
 * to the per-request limit or remaining monthly allowance (whichever is
 * smaller). For count-based quotas, `amount` defaults to 1.
 *
 * The reservation info is stored on the context so route handlers can
 * call `quota.refund()` after the request completes (e.g. chat streaming
 * returns unused tokens).
 */
export function requireQuota(
  type: QuotaType,
  amount?: number,
): MiddlewareHandler<AuthEnv & QuotaEnv> {
  const limit = QUOTA_LIMITS[type];

  // The reserved amount is the requested amount
  // If none is provided, it defaults to the per-request limit
  // If no limit per request is defined, it defaults to 1.
  const reserveAmount = amount ?? (limit.perRequest ?? 1);

  if (reserveAmount <= 0) {
    throw new Error(
      `Invalid reserve amount ${reserveAmount} for quota type ${type}`,
    );
  }

  return async (c, next) => {
    const userId = c.get("user").id;
    const remaining = await quota.remaining(userId, type);

    // Clamp token reservations to remaining monthly allowance (so that we don't accidentally reserve more than the user has left).
    // For count-based quotas, this will be 1 or 0 (if exhausted).
    // For token-based quotas, this will be the remaining tokens (or 0 if exhausted).
    const clamped = Math.min(reserveAmount, remaining);

    //If we have no remaining quota, throw an error
    if (remaining <= 0) {
      throw new ApiError(
        429,
        "quota_exceeded",
        `Monthly ${type} limit reached.`,
      );
    }

    // Reserve the clamped amount of quota for this request
    const reserved = await quota.reserve(userId, type, clamped);

    // If we couldn't reserve the quota, throw an error
    if (!reserved) {
      throw new ApiError(
        429,
        "quota_exceeded",
        `Monthly ${type} limit reached.`,
      );
    }

    // Store the reservation info on the context for downstream refund use
    c.set("quotaReservation", { type, reserved: clamped });
    await next();
  };
}
