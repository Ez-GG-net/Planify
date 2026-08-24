import type { Context } from "hono";
import { z } from "zod";
import {
  AIChatUserMessageContextSchema,
  AIChatUserMessageSchema,
} from "@planify/schemas";
import { handleApiError } from "@planify/api/errors/handle-api-error";
import { testStream } from "@planify/api/services/chat-test-stream";

/**
 * The chat stream returns raw SSE, so the whole body is one JSON object.
 * Built from the shared message/context schemas plus the non-empty content
 * rule the original handler enforced by hand.
 */
const ChatResponseRequestSchema = z.object({
  message: AIChatUserMessageSchema.refine(
    (message) => message.content.trim().length > 0,
    "Message is empty",
  ),
  context: AIChatUserMessageContextSchema,
});

/**
 * POST /generate/chat-response
 *
 * Thin HTTP layer: validates the body, starts the simulated model stream,
 * and maps pre-stream failures through the shared error envelope. Once
 * streaming has begun, failures travel as "error" SSE events instead.
 */
export default async function postChatResponse(c: Context): Promise<Response> {
  try {
    const { message, context } = ChatResponseRequestSchema.parse(
      await c.req.json(),
    );

    console.log("Test AI request:", { message, context });

    const stream = testStream(context, 50);

    /*
     * Raw Response (not c.json/streamSSE) on purpose: the client parses a
     * hand-rolled SSE framing that must stay byte-identical — events
     * delimited by \r\n\r\n, each line prefixed with the shared
     * AIChatStreamEventSSEEPrefix ("data:").
     */
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Failed to generate chat response:", error);

    return handleApiError(error, c);
  }
}
