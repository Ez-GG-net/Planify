import { z } from "zod";
import { SchedulePlanTaskSchema } from "./schedule-plan";

export const DayGroupSchema = z.object({
  date: z.string(),
  tasks: z.array(SchedulePlanTaskSchema),
});

export const TaskDetailsSchema = z.unknown()

export const TaskDayDataSchema = z.object({
  completedTasks: z.array(SchedulePlanTaskSchema),
  overdueTasks: z.array(SchedulePlanTaskSchema),
  activeTask: SchedulePlanTaskSchema.nullable(),
  upcomingTasks: z.array(SchedulePlanTaskSchema),
  completedCount: z.number(),
  totalCount: z.number(),
  isComplete: z.boolean(),
  highlightedTask: SchedulePlanTaskSchema.nullable(),
});
