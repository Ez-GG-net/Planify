import { SchedulePlanSchema } from "@planify/schemas"
import {
  AIChatStreamEventSSEEPrefix,
  formatToolFailure,
  formatToolSuccess,
  generateRandomToolCallID,
} from "@planify/types"
import type {
  AIChatPendingAction,
  AIChatStreamEvent,
  AIChatTool,
  AIChatToolArguments,
  AIChatToolContext,
  AIChatUserMessageContext,
} from "@planify/types"

import { executeTool } from "../ai/tools"
import { savePendingAction } from "../ai/test-action-store"

function createSSEEvent(event: AIChatStreamEvent): string {
  return `${AIChatStreamEventSSEEPrefix} ${JSON.stringify(event)}\r\n\r\n`
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Rough token estimate: ~4 chars per token.
 * Mirrors the same heuristic in chat-response.ts.
 */
function estimateTokens(bytes: number): number {
  return Math.ceil(bytes / 4)
}

/**
 * Thrown inside testStream when the reserved token quota is exceeded.
 * The route layer catches this and maps it to an SSE error + HTTP 429.
 */
export class UsageLimitReachedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UsageLimitReachedError"
  }
}

function createToolContext(
  context: AIChatUserMessageContext,
): AIChatToolContext {
  const schedule = SchedulePlanSchema.parse(context.schedule)

  const virtualSchedule = structuredClone(schedule)

  const pendingActions: AIChatPendingAction[] = []

  return {
    virtualSchedule,

    // The conversation's active tab decides which list tools operate on;
    // anything other than "pre-task" (including "task-guide") targets the
    // main schedule.
    scope: context.entityType === "pre-task" ? "pre-task" : "task",

    pendingActions,

    addPendingAction(action) {
      pendingActions.push(action)
    },
  }
}

async function executeToolAndStream(
  track: (event: AIChatStreamEvent) => void,
  tool: AIChatTool,
  args: AIChatToolArguments[AIChatTool],
  context: AIChatToolContext,
) {
  const toolCallId = generateRandomToolCallID()

  context.currentToolCallId = toolCallId

  //tell the client that the model is starting to execute the tool
  track({
    type: "tool_started",
    toolCallId,
    tool,
  })

  await delay(500)

  //get the result from executing the tool
  let result

  try {
    result = await executeTool(
      tool,
      args,
      context,
    )
  } catch (error) {
    //tell the client this specific tool call failed before the outer
    //catch converts the whole request into an "error" event; the failure
    //sentence is composed where the error message is actually known
    track({
      type: "tool_failed",
      toolCallId,
      tool,
      statusText: formatToolFailure(tool, error, {
        scope: context.scope,
      }),
    })
    return result
  } finally {
    context.currentToolCallId = undefined
  }

  //print for debugging
  console.log(`[AI tool result] ${tool}:`, result)

  //tell the client that the model has completed executing the tool,
  //including a one-line description of what the call produced
  track({
    type: "tool_completed",
    toolCallId,
    tool,
    statusText: formatToolSuccess(tool, args, result, {
      virtualSchedule: context.virtualSchedule,
      scope: context.scope,
    }),
  })

  return result
}

function createTextStreamer(
  track: (event: AIChatStreamEvent) => void,
  type: "thinking_delta" | "message_delta",
  text: string,
  delayMs: number,
) {
  return (async () => {
    /*
     * Split while preserving spaces so the client receives
     * reasonably small streaming chunks.
     */
    const chunks = text.split(/( )/)

    for (const chunk of chunks) {
      if (!chunk) continue

      track({ type, content: chunk })

      await delay(delayMs)
    }
  })()
}

/**
 * Streams a thinking segment and closes it with thinking_finished carrying
 * the measured duration, so the client can show "Thought for 3.6s" instead
 * of guessing from message timing. Each call is its own collapsible segment.
 */
async function streamThinking(
  track: (event: AIChatStreamEvent) => void,
  text: string,
  delayMs: number,
) {
  const startedAt = Date.now()

  await createTextStreamer(track, "thinking_delta", text, delayMs)

  track({
    type: "thinking_finished",
    durationSeconds: (Date.now() - startedAt) / 1000,
  })
}

/**
 * The simulated model. Scripts an entire response: thinking/text deltas,
 * read tools through executeToolAndStream(), one intentional tool failure,
 * and one approval-gated modify_task proposal.
 *
 * Replaced by a real model call in a later phase; until then the event
 * sequence and wire format are identical to what production will emit.
 *
 * @param tokenLimit - When set, the stream tracks estimated token usage
 *   (bytes / 4) and emits a `usage_limit_reached` SSE event followed by
 *   an error once the limit is exceeded. The caller (chat-response route)
 *   still owns refunding unused quota via the TransformStream flush.
 */
export function testStream(
  context: AIChatUserMessageContext,
  delayMs: number,
  tokenLimit?: number,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      // Token-tracking state shared across all enqueue calls.
      const usage = { tokensUsed: 0 }

      /**
       * Wraps every controller.enqueue so we can count output bytes and
       * abort when the reserved quota is exceeded. This is the single
       * choke-point for token accounting — all SSE events go through here.
       */
      const track = (event: AIChatStreamEvent) => {
        controller.enqueue(encoder.encode(createSSEEvent(event)))

        usage.tokensUsed += estimateTokens(JSON.stringify(event).length)

        if (tokenLimit != null && usage.tokensUsed > tokenLimit) {
          // Tell the client the limit was hit before erroring the stream.
          controller.enqueue(
            encoder.encode(
              createSSEEvent({
                type: "usage_limit_reached",
                message: "Chat token usage limit reached",
              }),
            ),
          )

          throw new UsageLimitReachedError(
            "Chat token usage limit reached",
          )
        }
      }

      try {
        /*
         * -----------------------------------------------------
         * Create the virtual tool context.
         * -----------------------------------------------------
         */

        const toolContext = createToolContext(context)


        await streamThinking(
          track,
          "This endpoint is not yet connected to a real model. Let me see if I can simulate a response.",
          delayMs,
        )
        await executeToolAndStream(
          track,
          "endpoint_exists" as AIChatTool,
          {},
          toolContext,
        )


        await createTextStreamer(
          track,
          "message_delta",
          "Looks like this endpoint is not yet connected to a real model. Please try again later.",
          delayMs,
        )

        track({
          type: "usage",
          outputTokens: 15, //fake number for testing
        })

        track({
          type: "done",
        })

        controller.close()
      } catch (error) {
        console.error(
          "[AI test stream] Error:",
          error,
        )

        controller.enqueue(
          encoder.encode(
            createSSEEvent({
              type: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error",
            }),
          ),
        )

        controller.close()
      }
    },
  })
}
