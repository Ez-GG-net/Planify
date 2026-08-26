import { eq, and } from "drizzle-orm";
import type { SchedulePlan } from "@planify/types";

import { db } from "../db";
import { schedule } from "../db/schema";
import { ApiError } from "../errors/handle-api-error";

/**
 * Server-side schedule CRUD. Every function takes `userId` as the first
 * argument and enforces ownership — a user can never read, update, or
 * delete another user's schedule.
 */

export async function listSchedules(userId: string): Promise<SchedulePlan[]> {
  const rows = await db
    .select()
    .from(schedule)
    .where(eq(schedule.userId, userId))
    .orderBy(schedule.createdAt);

  return rows.map(rowToPlan);
}

export async function getSchedule(
  userId: string,
  scheduleId: string,
): Promise<SchedulePlan> {
  const row = await findOwned(userId, scheduleId);
  return rowToPlan(row);
}

export async function createSchedule(
  userId: string,
  plan: SchedulePlan,
): Promise<SchedulePlan> {
  const { preTasks, tasks, ...meta } = plan;

  await db.insert(schedule).values({
    id: plan.id,
    userId,
    title: plan.title,
    startDate: plan.startDate,
    endDate: plan.endDate,
    data: { preTasks, tasks },
  });

  return plan;
}

export async function updateSchedule(
  userId: string,
  scheduleId: string,
  plan: SchedulePlan,
): Promise<SchedulePlan> {
  await findOwned(userId, scheduleId); // 404 if not found or not owned

  const { preTasks, tasks } = plan;

  await db
    .update(schedule)
    .set({
      title: plan.title,
      startDate: plan.startDate,
      endDate: plan.endDate,
      data: { preTasks, tasks },
    })
    .where(eq(schedule.id, scheduleId));

  return plan;
}

export async function deleteSchedule(
  userId: string,
  scheduleId: string,
): Promise<void> {
  await findOwned(userId, scheduleId); // 404 if not found or not owned

  await db.delete(schedule).where(eq(schedule.id, scheduleId));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function findOwned(userId: string, scheduleId: string) {
  const [row] = await db
    .select()
    .from(schedule)
    .where(and(eq(schedule.id, scheduleId), eq(schedule.userId, userId)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "not_found", "Schedule not found");
  }

  return row;
}

function rowToPlan(row: typeof schedule.$inferSelect): SchedulePlan {
  const data = row.data as { preTasks: SchedulePlan["preTasks"]; tasks: SchedulePlan["tasks"] };

  return {
    id: row.id,
    title: row.title,
    startDate: row.startDate,
    endDate: row.endDate,
    preTasks: data.preTasks,
    tasks: data.tasks,
  };
}
