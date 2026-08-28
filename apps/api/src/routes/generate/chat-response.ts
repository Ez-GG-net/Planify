import type { Context } from "hono";
import { z } from "zod";
import {
  AIChatUserMessageContextSchema,
  AIChatUserMessageSchema,
} from "@planify/schemas";
import { handleApiError } from "@planify/api/errors/handle-api-error";
import { chatStream } from "@planify/api/services/chat-stream";
import { quota } from "@planify/api/services/quota-service";
import { QuotaType } from "@planify/api/config/quota";

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
 * The service layer (testStream) owns token counting and emits the
 * `usage_limit_reached` SSE event when the reserved quota is exceeded.
 * This route only counts bytes for refunding unused quota after the stream
 * closes.
 */
export default async function postChatResponse(c: Context): Promise<Response> {
  try {
    const { message, context } = ChatResponseRequestSchema.parse(
      await c.req.json(),
    );

    //get how much quota we have reserved for this request (see /middleware/require-quota.ts)
    const reservation: { reserved: number; type: QuotaType } =
      c.get("quotaReservation");

    if (!reservation) {
      throw new Error("No quota reservation found in context");
    }

    if (reservation.reserved <= 0) {
      throw new Error(`Invalid reserved quota amount`);
    }

    // Get the user ID from the context
    const userId = c.get("user").id;

    console.log("Test AI request:", { message, context });

    // Pass the reserved quota to the service so it can emit
    // usage_limit_reached and stop the stream when the limit is hit.
    const originalStream = chatStream(
      context,
      message,
      reservation.reserved,
      c.req.raw.signal,
    );

    // Wrap the stream to count output bytes for refunding unused quota.
    // Token-limit enforcement lives inside chatStream.
    let tokensUsed = 0;
    const trackingStream = originalStream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          tokensUsed += estimateTokens(chunk.byteLength);
          controller.enqueue(chunk);
        },
        // Flush is called when the stream is closed, so we can refund any unused quota here
        async flush() {
          const unused = reservation.reserved - tokensUsed;

          // Only refund if we actually used less than we reserved
          if (unused > 0) {
            await quota.refund(userId, reservation.type, unused);
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
