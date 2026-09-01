import { ReviewQuestionSchema } from "@planify/schemas";
import type { ReviewQuestion, WizardSchedule } from "@planify/types";
import { ApiError } from "@planify/api/errors/handle-api-error";
import { AIProviderChatResponse, callProvider } from "@planify/api/ai/call-provider";
import { REVIEW_QUESTIONS_SYSTEM_PROMPT } from "@planify/api/ai/prompts";
import { REVIEW_QUESTIONS_JSON_SCHEMA } from "@planify/api/ai/model-output-schema";

/**
 * JSON Schema passed to Ollama's `format` parameter to constrain output
 * to an array of ReviewQuestion objects.
 */

/** Generates review questions for a given WizardSchedule using the AI provider. */
export async function generateReviewQuestions(
  schedule: WizardSchedule,
  signal?: AbortSignal,
): Promise<ReviewQuestion[]> {
  console.log("[generate] review-questions request:", schedule);

  const { response } = await callProvider({
    systemMessage: REVIEW_QUESTIONS_SYSTEM_PROMPT,
    userMessage: JSON.stringify(schedule),
    schema: REVIEW_QUESTIONS_JSON_SCHEMA,
    signal,
    options: { temperature: 0.6 },
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

  // Parse and validate the JSON content from the model.
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
    return ReviewQuestionSchema.array().parse(parsed);
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
