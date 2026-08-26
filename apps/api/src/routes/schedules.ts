import { Hono } from "hono";
import { SchedulePlanSchema, IDv1Schema } from "@planify/schemas";
import type { SchedulePlan } from "@planify/types";

import { ApiError } from "../errors/handle-api-error";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../services/schedule-service";

/**
 * Schedule CRUD. All routes require an authenticated session; the userId
 * is extracted from the session and used to enforce ownership on every query.
 *
 * Thrown ApiErrors are caught by the app-level onError envelope.
 */
export const scheduleRoutes = new Hono<AuthEnv>()
  .use("*", requireAuth)
  // gets all schedules
  .get("/", async (c) => {
    const userId = c.get("user").id;
    const plans = await listSchedules(userId);
    return c.json(plans);
  })
  // gets a single schedule by ID
  .get("/:id", async (c) => {
    const userId = c.get("user").id;
    const id = parseId(c.req.param("id"));
    const plan = await getSchedule(userId, id);
    return c.json(plan);
  })
  // creates a new schedule
  .post("/", async (c) => {
    const userId = c.get("user").id;
    const body = parseBody(await c.req.json());
    const plan = await createSchedule(userId, body);
    return c.json(plan, 201);
  })
  // updates an existing schedule by ID
  .put("/:id", async (c) => {
    const userId = c.get("user").id;
    const id = parseId(c.req.param("id"));
    const body = parseBody(await c.req.json());
    const plan = await updateSchedule(userId, id, body);
    return c.json(plan);
  })
  // deletes an existing schedule by ID
  .delete("/:id", async (c) => {
    const userId = c.get("user").id;
    const id = parseId(c.req.param("id"));
    await deleteSchedule(userId, id);
    return c.body(null, 204);
  });

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function parseId(raw: string): string {
  const result = IDv1Schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(400, "invalid_request", "Invalid schedule ID");
  }
  return result.data;
}

function parseBody(raw: unknown): SchedulePlan {
  const result = SchedulePlanSchema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(400, "invalid_request", "Invalid schedule data");
  }
  return result.data;
}
