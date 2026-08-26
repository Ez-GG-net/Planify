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

        /*
         * -----------------------------------------------------
         * THINKING
         * -----------------------------------------------------
         */

        await streamThinking(
          track,
          "I'll look through your schedule to find the Eat Lunch task.",
          delayMs,
        )

        /*
         * -----------------------------------------------------
         * MESSAGE
         * -----------------------------------------------------
         */

        await createTextStreamer(
          track,
          "message_delta",
          "Let me take a look at your schedule.",
          delayMs,
        )

        /*
         * -----------------------------------------------------
         * TOOL: get_schedule
         * -----------------------------------------------------
         *
         * This goes through executeToolAndStream().
         */

        const scheduleResult = await executeToolAndStream(
          track,
          "get_schedule",
          {
            scheduleId: toolContext.virtualSchedule.id,
          },
          toolContext,
        )

        /*
         * scheduleResult is available to the simulated model
         * just like an actual model would receive the result.
         */
        console.log(
          "[AI simulation] Model received get_schedule result:",
          scheduleResult,
        )

        /*
         * -----------------------------------------------------
         * THINKING
         * -----------------------------------------------------
         */

        await streamThinking(
          track,
          "I found the schedule. Now I'll locate the Eat Lunch task.",
          delayMs,
        )

        /*
         * -----------------------------------------------------
         * Find the task.
         *
         * In the real implementation, the model would determine
         * the task ID from the get_schedule result and then call
         * get_task.
         *
         * We hard-code the title here because this is a test
         * model.
         * -----------------------------------------------------
         */

        const lunchTask = toolContext.virtualSchedule.tasks.find(
          (task) => task.title === "Eat Lunch",
        )

        if (!lunchTask) {
          throw new Error(
            'Test task "Eat Lunch" was not found in the schedule.',
          )
        }

        /*
         * -----------------------------------------------------
         * TOOL: get_task
         * -----------------------------------------------------
         */

        const taskResult = await executeToolAndStream(
          track,
          "get_task",
          {
            taskId: lunchTask.id,
          },
          toolContext,
        )

        console.log(
          "[AI simulation] Model received get_task result:",
          taskResult,
        )

        await createTextStreamer(
          track,
          "message_delta",
          "Fake error message below.",
          delayMs,
        )

        await executeToolAndStream(
          track,
          "invalid_tool_name" as AIChatTool,
          {
            taskId: lunchTask.id,
          },
          toolContext,
        )

        /*
         * -----------------------------------------------------
         * THINKING
         * -----------------------------------------------------
         */

        await streamThinking(
          track,
          "I found Eat Lunch. I'll propose changing its start time to 12:00 PM.",
          delayMs,
        )

        /*
         * -----------------------------------------------------
         * TOOL: modify_task
         * -----------------------------------------------------
         *
         * IMPORTANT:
         *
         * modifyTask() creates a pending action.
         *
         * It does NOT modify virtualSchedule.
         * -----------------------------------------------------
         */

        await executeToolAndStream(
          track,
          "modify_task",
          {
            taskId: lunchTask.id,
            changes: {
              details: {
                location: {
                  name:"Cafeteria",
                  geolocation: "48.8566, 2.3522",
                },
                something: "true",
                hello: "world",
                resturants: [
                  {"name": "Le Jules Verne", time: "12:30"},
                  {"name": "other resturant", time: "20:00"},
                ]
              }
            },
          },
          toolContext,
        )

        /*
         * The tool should have created exactly one pending action.
         */
        const pendingAction =
          toolContext.pendingActions.at(-1)

        if (!pendingAction) {
          throw new Error(
            "modify_task did not create a pending action.",
          )
        }

        /*
         * -----------------------------------------------------
         * Store the action so a future resolution endpoint can
         * look it up server-side.
         * -----------------------------------------------------
         */

        savePendingAction(
          pendingAction,
          context,
        )

        /*
         * -----------------------------------------------------
         * Tell the client that the model wants to perform
         * this action.
         * -----------------------------------------------------
         */

        track({
          type: "action_proposed",
          action: pendingAction,
        })

        /*
         * -----------------------------------------------------
         * The simulated model stops here.
         *
         * In the real implementation, the model would stop
         * generating until the user approves/rejects this
         * action.
         * -----------------------------------------------------
         */

        track({
          type: "usage",
          outputTokens: 731,
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
