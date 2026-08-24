import { z } from "zod";

/**
 * Free-form details attached to a schedule plan task. Deliberately
 * permissive: the shape is produced by AI tools and rendered generically.
 */
export const TaskDetailsSchema = z.unknown()
