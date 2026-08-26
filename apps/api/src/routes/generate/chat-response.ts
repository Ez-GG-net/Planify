import type { Context } from "hono";
import { z } from "zod";
import {
  AIChatUserMessageContextSchema,
  AIChatUserMessageSchema,
} from "@planify/schemas";
import { handleApiError } from "@planify/api/errors/handle-api-error";
import { testStream } from "@planify/api/services/chat-test-stream";
import { quota } from "@planify/api/services/quota-service";

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
 * Rough token estimate for the simulated model: ~4 chars per token.
 * Real AI will report exact usage via `response.usage.total_tokens`.
 */
function estimateTokens(bytes: number): number {
  return Math.ceil(bytes / 4);
}

/**
 * POST /generate/chat-response
 *
 * Thin HTTP layer: validates the body, starts the simulated model stream,
 * and maps pre-stream failures through the shared error envelope. Once
 * streaming has begun, failures travel as "error" SSE events instead.
 *
 * After the stream completes, unused quota tokens are refunded.
 */
export default async function postChatResponse(c: Context): Promise<Response> {
  try {
    const { message, context } = ChatResponseRequestSchema.parse(
      await c.req.json(),
    );

    //get how much quota we have reserved for this request (see /middleware/require-quota.ts)
    const reservation = c.get("quotaReservation");

    console.log("Test AI request:", { message, context });

    const originalStream = testStream(context, 50);

    // Wrap the stream to count output bytes, then refund unused quota
    // Basically count bytes generated, and give back any unused quota tokens (assuming 4 bytes per token)
    let totalBytes = 0;
    const trackingStream = originalStream.pipeThrough(
      new TransformStream({
        // Transform is called for each chunk of data, so we can count bytes here
        transform(chunk, controller) {
          totalBytes += chunk.byteLength;
          controller.enqueue(chunk);
        },
        // Flush is called when the stream is closed, so we can refund any unused quota here
        async flush() {
          if (reservation) {
            const used = estimateTokens(totalBytes);
            const unused = reservation.reserved - used;

            // Only refund if we actually used less than we reserved (assuming that the stream will stop if it exceeds the reserved quota)
            if (unused > 0) {
              const userId = c.get("user").id;
              await quota.refund(userId, reservation.type, unused);
            }
          }
        },
      }),
    );

    /*
     * Raw Response (not c.json/streamSSE) on purpose: the client parses a
     * hand-rolled SSE framing that must stay byte-identical — events
     * delimited by \r\n\r\n, each line prefixed with the shared
     * AIChatStreamEventSSEEPrefix ("data:").
     */
    return new Response(trackingStream, {
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
