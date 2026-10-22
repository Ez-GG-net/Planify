import type { Context } from "hono";
import { z } from "zod";
import {
  AIChatUserMessageContextSchema,
  AIChatUserMessageSchema,
} from "@planify/schemas";
import { handleApiError } from "@planify/api/errors/handle-api-error";
import { chatStream } from "@planify/api/services/chat-stream";
import { quota } from "@planify/api/services/quota-service";
import { cancellations } from "@planify/api/services/cancellation-service";
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
 *
 * The reservation (made by require-quota) is settled exactly once — either
 * by the stream's flush when it actually runs, or by this route's catch
 * when the request dies before the stream is set up (pre-stream abort),
 * so the reserved chat tokens never leak.
 */
export default async function postChatResponse(c: Context): Promise<Response> {
  //get how much quota we have reserved for this request
  const reservation: { reserved: number; type: QuotaType } =
    c.get("quotaReservation");

  // Get the user ID from the context
  const userId = c.get("user").id;

  // Token/output tracking for the refund decision.
  let tokensUsed = 0;
  let emittedText = "";
  const textDecoder = new TextDecoder();

  let completed = false; // True once the stream produced its terminal "done" event.
  let settled = false; // Ensures the refund runs exactly once across flush + catch.

  // Set on client disconnect; settleRefund awaits it to decide whether the
  // cancel was free (full refund) or charged (streamed tokens only).
  let freeCancel: Promise<boolean> | null = null;

  const requestSignal = c.req.raw.signal;
  const recordAbort = () => {
    console.log("recordAbort called");
    if (completed || freeCancel) {
      return;
    }
    console.log("Client disconnected; recording cancellation");
    freeCancel = cancellations.consumeFree(userId, "chat_response"); // Takes a free cancel if available, otherwise returns false (charged cancel)
    
    settleRefund()
  };

  if (requestSignal.aborted) {
    recordAbort(); //if the request aborted before it started
  } else {
    requestSignal.addEventListener("abort", recordAbort, { once: true });
  }

  /**
   * Refund any unused reserved chat tokens. Called from the
   * stream's flush on the normal path, and from this route's catch when the
   * request fails/aborts before the stream is set up — without that second
   * call a pre-stream abort would leak the entire reservation.
   */
  const settleRefund = async () => {
    if (settled) {
      return; // prevent double refunds
    }
    settled = true;

    if (!reservation || reservation.reserved <= 0) {
      return;
    }

    const unused = reservation.reserved - tokensUsed;

    let wasCancelFree = false;
    if (freeCancel) {
      try {
        wasCancelFree = await freeCancel;
      } catch (error) {
        console.error("[quota] Failed to record chat cancellation:", error);
      }
    }

    /* 
      Free cancel: 
      - refund the ENTIRE reservation (nothing charged).
      
      Anything else (normal completion, charged cancel, stream error):
      - refund only the unused portion, so the user is charged for
        only the tokens that were generated (not the full amount
        reserved before the stream).
     */
    const refundAmount = completed ? Math.max(0, unused) : reservation.reserved

    console.log("Checking refund:", "unused:", unused, "refundAmount:", refundAmount, "wasCancelFree:", wasCancelFree, "completed:", completed);

    if (wasCancelFree && refundAmount > 0) {
      await quota.refund(userId, reservation.type, refundAmount);
    } else {
      // Refund only unused portion
      if (unused > 0) await quota.refund(userId, reservation.type, unused);
    }
  };

  try {
    if (!reservation) {
      throw new Error("No quota reservation found in context");
    }

    if (reservation.reserved <= 0) {
      throw new Error(`Invalid reserved quota amount`);
    }

    const { message, context } = ChatResponseRequestSchema.parse(
      await c.req.json(),
    );

    // Pass the reserved quota to the service so it can emit
    // usage_limit_reached and stop the stream when the limit is hit.
    const originalStream = chatStream(
      context,
      message,
      reservation.reserved,
      requestSignal,
    );

    // Wrap the stream to count output bytes for refunding unused quota.
    // Token-limit enforcement lives inside chatStream.
    const trackingStream = originalStream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          tokensUsed += estimateTokens(chunk.byteLength);

          // Chunks can split JSON mid-event, so accumulate decoded text.
          emittedText += textDecoder.decode(chunk, { stream: true });

          // Check for the ending done event.
          if (!completed && emittedText.includes('"type":"done"')) {
            completed = true;
          }

          controller.enqueue(chunk);
        },
        // Flush is called when the stream is closed (normally or because the
        // client disconnected), so we can refund any unused quota here (or
        // not if the user cannot use their free cancel).
        async flush() {
          await settleRefund();
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
    // The stream never ran (pre-stream abort / failure / bad body): flush
    // won't fire, so settle the reservation here instead of leaking it.
    try {
      await settleRefund();
    } catch (refundError) {
      console.error("[quota] Pre-stream refund failed:", refundError);
    }

    console.error("Failed to generate chat response:", error);

    return handleApiError(error, c);
  }
}