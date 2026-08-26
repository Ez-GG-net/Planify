import { eq, and, sql } from "drizzle-orm";
import { generateRandomIDv1 } from "@planify/types";

import { db } from "../db";
import { quotaUsage } from "../db/schema";
import {
  QUOTA_LIMITS,
  type QuotaType,
} from "../config/quota";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// First day of the current UTC month, used as the period key.
// Means that all quota usage resets at the start of each month in UTC (regardless of timezone).
function currentPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Fetch-or-create the row for (userId, quotaType, currentMonth).
 * Uses an upsert so concurrent callers don't race on INSERT.
 */
async function getOrCreateRow(userId: string, type: QuotaType) {
  const periodStart = currentPeriodStart();

  // Upsert: create the row if it doesn't exist yet.
  await db
    .insert(quotaUsage)
    .values({
      id: generateRandomIDv1(),
      userId,
      quotaType: type,
      periodStart,
      used: 0,
    })
    .onConflictDoNothing({
      target: [quotaUsage.userId, quotaUsage.quotaType, quotaUsage.periodStart],
    });

  // Read the existing (or just-created) row.
  const [row] = await db
    .select()
    .from(quotaUsage)
    .where(
      and(
        eq(quotaUsage.userId, userId),
        eq(quotaUsage.quotaType, type),
        eq(quotaUsage.periodStart, periodStart),
      ),
    )
    .limit(1);

  return row!;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const quota = {
  /** Remaining units for the current month (0 if exhausted). */
  async remaining(userId: string, type: QuotaType): Promise<number> {
    const limit = QUOTA_LIMITS[type].monthly;
    const row = await getOrCreateRow(userId, type);
    return Math.max(0, limit - row.used);
  },

  /**
   * Reserve `amount` units for a request. Returns `true` if reserved
   * successfully, `false` if the monthly allowance is insufficient.
   */
  async reserve(
    userId: string,
    type: QuotaType,
    amount: number,
  ): Promise<boolean> {
    const limit = QUOTA_LIMITS[type].monthly;
    const row = await getOrCreateRow(userId, type);

    if (row.used + amount > limit) {
      return false;
    }

    await db
      .update(quotaUsage)
      .set({ used: row.used + amount })
      .where(eq(quotaUsage.id, row.id));

    return true;
  },

  /**
   * Refund `amount` units after a request completes. Clamped to 0 —
   * you cannot refund more than has been used.
   */
  async refund(
    userId: string,
    type: QuotaType,
    amount: number,
  ): Promise<void> {
    const row = await getOrCreateRow(userId, type);
    const next = Math.max(0, row.used - amount);

    await db
      .update(quotaUsage)
      .set({ used: next })
      .where(eq(quotaUsage.id, row.id));
  },

  /** Current usage summary for display in the UI. */
  async usage(
    userId: string,
    type: QuotaType,
  ): Promise<{ used: number; limit: number }> {
    const limit = QUOTA_LIMITS[type].monthly;
    const row = await getOrCreateRow(userId, type);
    return { used: row.used, limit };
  },
};
