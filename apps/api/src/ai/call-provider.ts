import { config } from "@planify/api/config";
import { ApiError } from "@planify/api/errors/handle-api-error";
import { withGenerationSlot } from "@planify/api/ai/concurrency";
import type { OllamaChatMessage, OllamaToolFunction } from "./ollama-tools";

export interface CallProviderOptions {
  systemMessage: string;
  userMessage: string;
  /**
   * Messages to insert between the system and user messages (chat history
   * plus any assistant/tool messages accumulated across prior agent rounds).
   */
  previousMessages?: OllamaChatMessage[];
  /** Ollama `tools` definitions, enabling native model tool-calling. */
  tools?: OllamaToolFunction[];
  /** JSON Schema passed to Ollama's `format` to constrain output. */
  schema?: object;
  /** A signal to abort the request. */
  signal?: AbortSignal;
  options?: {
    /** Whether to stream the response. Defaults to false. */
    stream?: boolean;
    /** Sampling temperature. Defaults to 0.5. */
    temperature?: number;
    /** Model name. Defaults to config.ollama.model. */
    model?: string;
    /**
     * Whether to acquire a generation slot for this request. Defaults to
     * true. Set false when the caller already holds a slot (e.g. the chat
     * agent loop holds one slot across all its tool rounds), so the request
     * does not re-enter the queue.
     */
    acquireSlot?: boolean;
  };
}

export interface CallProviderResult {
  /** The raw fetch Response when stream=false **/
  response: Response;
  /** The model's reported total generated-token count (for ollama its `eval_count`). */
  tokenCount?: number;
  /** Present when stream=true. The raw Ollama NDJSON byte stream. */
  stream?: ReadableStream<Uint8Array>;
}

export interface AIProviderChatResponse {
  message?: { role: string; content: string };
  done: boolean;
  done_reason?: string;
  eval_count?: number;
  error?: string;
}

/**
 *    Calls the provider and returns the result.
 *  - Currently the provider is Ollama
 */
export async function callProvider(
  opts: CallProviderOptions,
): Promise<CallProviderResult> {
  const url = `${config.ollama.apiUrl}`;
  const stream = opts.options?.stream ?? false;

  let response: Response;

  // Builds the conversation for the request. Optional prior messages are
  // inserted between the system and the current user message.
  const messages: OllamaChatMessage[] = [
    { role: "system", content: opts.systemMessage },
    ...(opts.previousMessages ?? []),
    { role: "user", content: opts.userMessage },
  ];

  const doFetch = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: opts.signal,
      body: JSON.stringify({
        model: opts.options?.model ?? config.ollama.model,
        messages,
        tools: opts.tools,
        stream,
        format: opts.schema,
        options: { temperature: opts.options?.temperature ?? 0.5 },
      }),
    });

  try {
    // Acquire a generation slot unless the caller already holds one (see
    // the chat agent loop, which keeps a single slot across its rounds).
    response =
      opts.options?.acquireSlot === false
        ? await doFetch()
        : await withGenerationSlot(doFetch, opts.signal);
  } catch (error) {
    // AbortError means the client disconnected or the request was cancelled
    if (error instanceof DOMException && error.name === "AbortError") {
      //propagate the abort signal to the caller so they can handle it
      throw error;
    }

    // ApiError (e.g. maxing out the queue) passes through.
    if (error instanceof ApiError) {
      throw error;
    }

    // Other errors are likely network issues or Ollama being down.
    throw new ApiError(
      502,
      "ai_error",
      "Could not reach the AI service. Please try again later.",
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[ai] AI provider error:", response.status, body);
    throw new ApiError(
      502,
      "ai_error",
      "The AI service returned an error. Please try again.",
    );
  }

  // Streaming: return the raw NDJSON stream untouched.
  // Token usage arrives on the final `done: true` chunk (from `eval_count`)
  if (stream) {
    if (!response.body) {
      throw new ApiError(
        502,
        "ai_error",
        "The AI service returned an empty response.",
      );
    }
    return { response, stream: response.body };
  }

  // Non-streaming: parse once and surface the reported total token count.
  // Token usage arrives directly from `eval_count`.
  // OPTIONAL OPTIMIZATION: we could avoid parsing the JSON twice if the caller wants the parsed content
  const data = (await response.clone().json()) as AIProviderChatResponse;

  if (data.error) {
    console.error("[ai] AI provider response error:", data.error);
    throw new ApiError(
      502,
      "ai_error",
      "The AI service returned an error. Please try again.",
    );
  }

  return {
    response,
    tokenCount: data.eval_count,
  };
}
