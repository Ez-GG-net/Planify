import { z } from "zod";

/**
 * UI-only generation state enums. These describe wizard screen states and
 * never cross the API boundary, so they stay in the web app.
 */
export const ReviewGenerationStateSchema = z.enum(["idle", "loading", "success", "error"]);

export const ScheduleGenerationStateSchema = z.enum(["idle", "loading", "success", "error"]);
