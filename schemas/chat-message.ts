import { z } from "zod";
import { AIChatPendingActionSchema } from "./chat-action";
import { IDv1Schema } from "./id";
import { SchedulePlanSchema, SchedulePlanTaskSchema } from "./schedule-plan";
import { TaskGuideSchema, TaskGuideStepSchema } from "./task-guide";

export const AIChatEntityTypeSchema = z.enum(["task-guide", "task", "pre-task"]);

export const AIChatUserMessageSchema = z.object({
  id: IDv1Schema,
  role: z.literal("user"),
  content: z.string(),
});

export const AIChatAssistantMessageSchema = z.object({
  id: IDv1Schema,
  role: z.literal("assistant"),
  content: z.string(),
  parts: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("thinking"),
        content: z.string(),
        // Set once the matching thinking_finished event arrives; while
        // absent the block is still streaming and shows the shimmer.
        durationSeconds: z.number().optional(),
      }),
      z.object({ type: z.literal("message"), content: z.string() }),
      z.object({
        type: z.literal("tool"),
        toolCallId: z.string(),
        tool: z.string(),
        status: z.enum(["started", "completed", "failed"]),
        // Server-composed one-liner describing the outcome; rendered in
        // place of the bare status word when present.
        statusText: z.string().optional(),
      }),
      z.object({
        type: z.literal("action"),
        action: AIChatPendingActionSchema,
        // Pre-change values captured client-side when the proposal arrived.
        // Diffs and headings read these instead of the live plan so a card
        // still shows what changed after the change has been applied (and
        // survives navigation). Absent on older transcripts.
        before: z.record(z.string(), z.unknown()).optional(),
      }),
    ])
  ).optional(),
});

export const AIChatMessageSchema = z.discriminatedUnion("role", [
  AIChatUserMessageSchema,
  AIChatAssistantMessageSchema,
]);

export const AIChatUserMessageContextSchema = z.object({
  entityType: AIChatEntityTypeSchema,
  schedule: SchedulePlanSchema.optional(),
  tasks: z.array(SchedulePlanTaskSchema).optional(),
  currentTask: SchedulePlanTaskSchema.optional(),
  currentGuide: TaskGuideSchema.optional(),
  currentStepNum: TaskGuideStepSchema.shape.id.optional(),
  previousMessages: z.array(AIChatMessageSchema).optional(),
});

export const AIChatUpdateSchema = z.any();
