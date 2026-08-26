import { z } from "zod";
import { IDv1Schema } from "./id";
import { TaskGuideSchema, PreTaskGuideSchema } from "./task-guide";



export const SchedulePlanTaskSchema = z.object({
    id: z.string(),
    completedAt: z.string().optional(),
    title: z.string(),
    date: z.string().optional(),
    startTime: z.number().optional(),
    estimatedDuration: z.number().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    guide: TaskGuideSchema.optional(),
    preTaskGuide: PreTaskGuideSchema.optional(),
});
export const SchedulePlanSchema = z.object({
    id: IDv1Schema,
    title: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    preTasks: z.array(SchedulePlanTaskSchema),
    tasks: z.array(SchedulePlanTaskSchema),
});
