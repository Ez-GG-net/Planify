import { PreTaskGuideSchema } from "@planify/schemas";
import type { PreTaskGuide, SchedulePlanTask } from "@planify/types";
import { ApiError } from "@planify/api/errors/handle-api-error";
import { callProvider } from "@planify/api/ai/call-provider";
import { PRE_TASK_GUIDE_SYSTEM_PROMPT } from "@planify/api/ai/prompts";

/**
 * JSON Schema passed to Ollama's `format` parameter to constrain output
 * to a PreTaskGuide object.
 */
const PRE_TASK_GUIDE_JSON_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  required: ["description", "steps"],
} as const;

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
  error?: string;
}

/**
 * Generates a pre-task guide for a given schedule pre-task using the AI provider
 */
export async function generatePreTaskGuide(
  task: SchedulePlanTask,
  signal?: AbortSignal,
): Promise<PreTaskGuide> {
  console.log("[generate] pre-task-guide request:", task);

  const { response } = await callProvider({
    systemMessage: PRE_TASK_GUIDE_SYSTEM_PROMPT,
    userMessage: JSON.stringify(task),
    schema: PRE_TASK_GUIDE_JSON_SCHEMA,
    signal,
    options: { temperature: 0.7 },
  });

  const data = (await response.json()) as OllamaChatResponse;

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

  try {
    return PreTaskGuideSchema.parse(parsed);
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
}
