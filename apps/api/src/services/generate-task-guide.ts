import { z } from "zod";
import type { SchedulePlanTask, TaskGuide } from "@planify/types";
import { ApiError } from "@planify/api/errors/handle-api-error";
import { AIProviderChatResponse, callProvider } from "@planify/api/ai/call-provider";
import { TASK_GUIDE_SYSTEM_PROMPT } from "@planify/api/ai/prompts";
import { TASK_GUIDE_JSON_SCHEMA } from "@planify/api/ai/model-output-schema";
import { config } from "../config";

/**
 * JSON Schema passed to Ollama's `format` parameter. Steps intentionally
 * omit their numeric `id` — server assigns ids after validation.
 */

/**
 * Validates the model output with a custom Zod schema. Task guide steps should arrive without their numeric `id`;
 */
const TaskGuideInputSchema = z.object({
  description: z.string(),
  objective: z.string(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        content: z.string().optional(),
        estimatedDuration: z.number(),
      }),
    )
    .min(1),
});

/** Generates a step by step task guide for a given schedule task using the AI provider. */
export async function generateTaskGuide(
  task: SchedulePlanTask,
  signal?: AbortSignal,
): Promise<TaskGuide> {
  console.log("[generate] task-guide request:", task);

  const { response } = await callProvider({
    systemMessage: TASK_GUIDE_SYSTEM_PROMPT,
    userMessage: JSON.stringify(task),
    schema: TASK_GUIDE_JSON_SCHEMA,
    signal,
    options: { temperature: 0.2, model: config.ollama.fastModel },
  });

  const data = (await response.json()) as AIProviderChatResponse;

  if (!data.message || !data.message.content) {
    console.error("[generate] AI response missing message content:", data);
    throw new ApiError(
      502,
      "ai_error",
      "The AI returned an invalid response. Please try again.",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(data.message.content);
  } catch {
    console.error(
      "[generate] Failed to parse AI response as JSON:",
      data.message.content,
    );
    throw new ApiError(
      502,
      "ai_error",
      "The AI returned an invalid response. Please try again.",
    );
  }

  let guide: z.infer<typeof TaskGuideInputSchema>;

  try {
    guide = TaskGuideInputSchema.parse(parsed);
  } catch {
    console.error(
      "[generate] AI response failed Zod validation:",
      JSON.stringify(parsed),
    );
    throw new ApiError(
      502,
      "ai_error",
      "The AI returned an invalid response. Please try again.",
    );
  }

  // Assign sequential numeric ids to each step.
  const taskGuide: TaskGuide = {
    description: guide.description,
    objective: guide.objective,
    steps: guide.steps.map((step, index) => ({
      id: index,
      title: step.title,
      content: step.content,
      estimatedDuration: step.estimatedDuration,
    })),
  };

  return taskGuide;
}
