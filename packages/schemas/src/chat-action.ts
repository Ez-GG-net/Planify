import { z } from "zod";
import { ActionIDSchema, IDv1Schema, ToolCallIDSchema } from "./id";
import { TaskDetailsSchema } from "./task";

export const CreateTaskArgsSchema = z.object({
  title: z.string(),
  date: z.string(),
  startTime: z.number(),
  estimatedDuration: z.number().optional(),
  details: TaskDetailsSchema.optional(),
});

export const CreateTaskGuideStepArgsSchema = z.object({
  taskId: IDv1Schema,
  title: z.string(),
  description: z.string(),
  order: z.number(),
});

export const ModifyTaskArgsSchema = z.object({
  taskId: IDv1Schema,
  changes: z.object({
    startTime: z.number().optional(),
    date: z.string().optional(),
    title: z.string().optional(),
    estimatedDuration: z.number().optional(),
    details: TaskDetailsSchema.optional(),
  }),
});

export const ModifyTaskGuideStepArgsSchema = z.object({
  stepId: z.number(),
  changes: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    order: z.number().optional(),
  }),
});

export const DeleteTaskArgsSchema = z.object({
  taskId: IDv1Schema
});

export const DeleteTaskGuideStepArgsSchema = z.object({
  stepId: z.number(),
});

export const AIChatActionTypeSchema = z.enum([
  "create_task",
  "create_task_guide_step",
  "modify_task",
  "modify_task_guide_step",
  "delete_task",
  "delete_task_guide_step",
]);

export const AIChatActionStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "failed",
  "applied",
]);

export const AIChatPendingActionSchema = z.discriminatedUnion("type", [
  z.object({
    id: ActionIDSchema,
    toolCallId: ToolCallIDSchema,
    type: z.literal("create_task"),
    status: AIChatActionStatusSchema,
    arguments: CreateTaskArgsSchema,
  }),
  z.object({
    id: ActionIDSchema,
    toolCallId: ToolCallIDSchema,
    type: z.literal("create_task_guide_step"),
    status: AIChatActionStatusSchema,
    arguments: CreateTaskGuideStepArgsSchema,
  }),
  z.object({
    id: ActionIDSchema,
    toolCallId: ToolCallIDSchema,
    type: z.literal("modify_task"),
    status: AIChatActionStatusSchema,
    arguments: ModifyTaskArgsSchema,
  }),
  z.object({
    id: ActionIDSchema,
    toolCallId: ToolCallIDSchema,
    type: z.literal("modify_task_guide_step"),
    status: AIChatActionStatusSchema,
    arguments: ModifyTaskGuideStepArgsSchema,
  }),
  z.object({
    id: ActionIDSchema,
    toolCallId: ToolCallIDSchema,
    type: z.literal("delete_task"),
    status: AIChatActionStatusSchema,
    arguments: DeleteTaskArgsSchema,
  }),
  z.object({
    id: ActionIDSchema,
    toolCallId: ToolCallIDSchema,
    type: z.literal("delete_task_guide_step"),
    status: AIChatActionStatusSchema,
    arguments: DeleteTaskGuideStepArgsSchema,
  }),
]);
