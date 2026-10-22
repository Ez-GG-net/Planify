import { and, eq, lt, sql } from "drizzle-orm";
import type { GenerationCancelType } from "@planify/types";
import { generateRandomGenerationCancelID } from "@planify/types";

import { db } from "../db";
import { generationCancellation } from "../db/schema";
import { DAILY_CANCEL_LIMIT } from "../config/rate-limit";
import { quota } from "./quota-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// First instant of the current UTC day, used as the period key. Matches the
// quota service's UTC convention so all quota/rate-limit resets are aligned.
function currentPeriodStart(): Date {
  const now = new Date();
  return new Date(now.setUTCHours(0, 0, 0, 0));
}

/**
 * Fetch-or-create the row for (userId, generationType, currentDay).
 * Uses an upsert so concurrent callers don't race on INSERT.
 */
async function getOrCreateRow(userId: string, type: GenerationCancelType) {
  const periodStart = currentPeriodStart();

  await db
    .insert(generationCancellation)
    .values({
      id: generateRandomGenerationCancelID(),
      userId,
      generationType: type,
      periodStart,
      used: 0,
    })
    .onConflictDoNothing({
      target: [
        generationCancellation.userId,
        generationCancellation.generationType,
        generationCancellation.periodStart,
      ],
    });

  const [row] = await db
    .select()
    .from(generationCancellation)
    .where(
      and(
        eq(generationCancellation.userId, userId),
        eq(generationCancellation.generationType, type),
        eq(generationCancellation.periodStart, periodStart),
      ),
    )
    .limit(1);

  return row!;
}

/**
 * Abort tracking for the count-based generation routes, which charge one
 * monthly quota unit UPFRONT (before the generation starts).
 *
 * Settlement rules:
 * - Success: the upfront reservation stands (charged).
 * - Free cancel (daily allowance remains): the upfront unit is refunded.
 * - Charged cancel (allowance exhausted): the upfront unit is kept — that
 *   IS the monthly charge.
 * - Any other failure (invalid body, provider error, ...): refunded so an
 *   unsuccessful request never costs quota.
 *
 * The watch also guards `markCompleted()`, so a cancellation AFTER the
 * generation succeeded is never counted or refunded.
 */
export interface CancellationWatch {
  /** Call after the generation succeeds so a late disconnect isn't counted. */
  markCompleted(): void;
  /**
   * Refund the upfront charge unless this request already settled (success,
   * an abort was accounted for, or a refund was issued). Call from the
   * route's catch block.
   */
  refundUpfrontIfUnsettled(): void;
}

export function listenForCancellation(
  userId: string,
  type: Exclude<GenerationCancelType, "chat_response">,
  signal: AbortSignal,
): CancellationWatch {
  let completed = false;
  let aborted = false;
  let refunded = false;

  const refundUnit = () => {
    if (refunded) {
      return; //exclude double refund
    }
    refunded = true;

    void quota.refund(userId, type, 1).catch((error) => {
      console.error(`[cancellations] Refund failed for ${type}:`, error);
    });
  };

  const onAbort = () => {
    if (completed || aborted || refunded) {
      return; //exclude double abort, double refund
    }
    aborted = true;
    void (async () => {
      try {
        const wasFree = await cancellations.consumeFree(userId, type);
        
        // Free cancel → give back the unit reserved upfront. A charged
        // cancel keeps the reservation: that is the monthly charge.
        if (wasFree && !completed) {
          refundUnit();
        } else {
          console.log(`[cancellations] Charged cancel for user ${userId} (type: ${type}).`);
        }
      } catch (error) {
        console.error(
          `[cancellations] Failed to record cancellation for ${type}:`,
          error,
        );
      }
    })();
  };
  if (signal.aborted) {
    onAbort();
  } else {
    signal.addEventListener("abort", onAbort, { once: true });
  }

  return {
    markCompleted() {
      completed = true;
    },
    refundUpfrontIfUnsettled() {
      if (completed || aborted || refunded) {
        return;
      }
      refundUnit();
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const cancellations = {
  /** Free cancels remaining today for a generation type (0 if exhausted). */
  async remaining(userId: string, type: GenerationCancelType): Promise<number> {
    const limit = DAILY_CANCEL_LIMIT[type];
    const row = await getOrCreateRow(userId, type);
    return Math.max(0, limit - row.used);
  },

  /** Today's usage summary for display in the UI. */
  async usage(
    userId: string,
    type: GenerationCancelType,
  ): Promise<{ used: number; limit: number }> {
    const limit = DAILY_CANCEL_LIMIT[type];
    const row = await getOrCreateRow(userId, type);
    return { used: row.used, limit };
  },

  /**
   * Atomically consume one free daily cancel if the allowance remains.
   * Returns `true` when cancellations used increased/was taken, `false` 
   * when the limit is reached
   */
  async consumeFree(
    userId: string,
    type: GenerationCancelType,
  ): Promise<boolean> {
    const periodStart = currentPeriodStart();
    await getOrCreateRow(userId, type);

    const limit = DAILY_CANCEL_LIMIT[type];
    const [updated] = await db
      .update(generationCancellation)
      .set({ used: sql`${generationCancellation.used} + 1` })
      .where(
        and(
          eq(generationCancellation.userId, userId),
          eq(generationCancellation.generationType, type),
          eq(generationCancellation.periodStart, periodStart),
          lt(generationCancellation.used, limit),
        ),
      )
      .returning({ id: generationCancellation.id });

    return Boolean(updated);
  },
};