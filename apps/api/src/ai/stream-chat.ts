import { config } from "@planify/api/config";
import { ApiError } from "@planify/api/errors/handle-api-error";
import { callProvider } from "@planify/api/ai/call-provider";
import type {
  OllamaChatChunk,
  OllamaChatMessage,
  OllamaToolFunction,
} from "./ollama-tools";

/**
 * Streaming wrapper over the shared `callProvider` transport.
 *
 * `callProvider` performs the fetch and exposes the raw NDJSON body as a
 * stream; this module consumes that stream, splits it into individual
 * OllamaChatChunks (one JSON object per line), and surfaces each as an async
 * iterator element so the chat agent loop can stream text and react to tool
 * calls as they arrive.
 *
 * It deliberately passes `acquireSlot: false` — the chat agent loop holds a
 * single generation slot across all of its tool rounds, so per-round
 * requests must not re-enter the queue.
 */

export async function* streamOllamaChat(opts: {
  systemMessage: string;
  userMessage: string;
  /** Messages inserted between the system and current user message. */
  previousMessages?: OllamaChatMessage[];
  tools?: OllamaToolFunction[];
  signal?: AbortSignal;
  temperature?: number;
  /** Model for this chat stream. Defaults to config.ollama.chatModel. */
  model?: string;
}): AsyncGenerator<OllamaChatChunk> {
  const { stream } = await callProvider({
    systemMessage: opts.systemMessage,
    userMessage: opts.userMessage,
    previousMessages: opts.previousMessages,
    tools: opts.tools,
    signal: opts.signal,
    options: {
      stream: true,
      temperature: opts.temperature,
      model: opts.model ?? config.ollama.chatModel,
      acquireSlot: false,
    },
  });

  // In stream mode callProvider always returns a body (or throws 502), so
  // the stream is guaranteed present here.
  const reader = stream!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Ollama streams NDJSON: one JSON object per line.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let chunk: OllamaChatChunk;
      try {
        chunk = JSON.parse(trimmed) as OllamaChatChunk;
      } catch {
        console.error("[ai] Failed to parse Ollama NDJSON line:", trimmed);
        continue;
      }

      if (chunk.error) {
        console.error("[ai] AI provider response error:", chunk.error);
        throw new ApiError(502, "ai_error", chunk.error);
      }

      yield chunk;
    }
  }
}
