import { SchedulePlanSchema } from "@planify/schemas";
import {
  generateRandomIDv1,
  type Schedule,
  type SchedulePlan,
} from "@planify/types";
import { ApiError } from "@planify/api/errors/handle-api-error";
import { AIProviderChatResponse, callProvider } from "@planify/api/ai/call-provider";
import { SCHEDULE_PLAN_SYSTEM_PROMPT } from "@planify/api/ai/prompts";

/**
 * JSON Schema passed to Ollama's `format` parameter to constrain output.
 * The plan's top-level `id` is omitted — the server assigns a UUIDv7 id.
 */
const SCHEDULE_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    preTasks: { type: "array", items: { type: "object" } },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          date: { type: "string" },
          startTime: { type: "number" },
          estimatedDuration: { type: "number" },
          details: { type: ["object", "null"] },
        },
        required: ["id", "title"],
      },
    },
  },
  required: ["title", "startDate", "endDate", "preTasks", "tasks"],
} as const;

/** Generates a schedule plan for a given Schedule (from the wizard) using the AI provider. */
export async function generateSchedulePlan(
  input: Schedule,
  signal?: AbortSignal,
): Promise<SchedulePlan> {
  console.log("[generate] schedule-plan request:", input);

  const { response } = await callProvider({
    systemMessage: SCHEDULE_PLAN_SYSTEM_PROMPT,
    userMessage: JSON.stringify(input),
    schema: SCHEDULE_PLAN_JSON_SCHEMA,
    signal,
    options: { temperature: 0.7 },
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

  let planWithoutId: Omit<SchedulePlan, "id">;

  try {
    planWithoutId = SchedulePlanSchema.omit({ id: true }).parse(parsed);
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

  // Assign a fresh UUIDv7 id — the AI must not control the plan's identity.
  const schedulePlan: SchedulePlan = {
    id: generateRandomIDv1(),
    ...planWithoutId,
  };

  return schedulePlan;
}
