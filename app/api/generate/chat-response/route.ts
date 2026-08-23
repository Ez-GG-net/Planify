import { AIChatToolContext, executeTool } from "@/lib/ai/tools"
import { formatToolFailure, formatToolSuccess } from "@/lib/ai/tools/summaries"
import { SchedulePlanSchema } from "@/schemas"
import {
  AIChatUserMessage,
  AIChatUserMessageContext,
  AIChatStreamEventSSEEPrefix,
  AIChatStreamEvent,
  AIChatPendingAction,
} from "@/types"
import { AIChatTool, AIChatToolArguments } from "@/lib/ai/tools/tool-type"
import { savePendingAction } from "@/lib/ai/test-action-store"
import { generateRandomToolCallID } from "@/lib/create-id"

function createSSEEvent(event: AIChatStreamEvent): string {
  return `${AIChatStreamEventSSEEPrefix} ${JSON.stringify(event)}\r\n\r\n`
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  tool: AIChatTool,
  args: AIChatToolArguments[AIChatTool],
  context: AIChatToolContext,
) {
  const toolCallId = generateRandomToolCallID()

  context.currentToolCallId = toolCallId

  //tell the client that the model is starting to execute the tool
  controller.enqueue(
    encoder.encode(
      createSSEEvent({
        type: "tool_started",
        toolCallId,
        tool,
      }),
    ),
  )

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
    controller.enqueue(
      encoder.encode(
        createSSEEvent({
          type: "tool_failed",
          toolCallId,
          tool,
          statusText: formatToolFailure(tool, error, {
            scope: context.scope,
          }),
        }),
      ),
    )
    return result
  } finally {
    context.currentToolCallId = undefined
  }

  //print for debugging
  console.log(`[AI tool result] ${tool}:`, result)

  //tell the client that the model has completed executing the tool,
  //including a one-line description of what the call produced
  controller.enqueue(
    encoder.encode(
      createSSEEvent({
        type: "tool_completed",
        toolCallId,
        tool,
        statusText: formatToolSuccess(tool, args, result, {
          virtualSchedule: context.virtualSchedule,
          scope: context.scope,
        }),
      }),
    ),
  )

  return result
}

function createTextStreamer(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
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

      controller.enqueue(
        encoder.encode(
          createSSEEvent({
            type,
            content: chunk,
          }),
        ),
      )

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
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  text: string,
  delayMs: number,
) {
  const startedAt = Date.now()

  await createTextStreamer(controller, encoder, "thinking_delta", text, delayMs)

  controller.enqueue(
    encoder.encode(
      createSSEEvent({
        type: "thinking_finished",
        durationSeconds: (Date.now() - startedAt) / 1000,
      }),
    ),
  )
}

function testStream(
  context: AIChatUserMessageContext,
  delayMs: number,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
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
          controller,
          encoder,
          "I'll look through your schedule to find the Eat Lunch task.",
          delayMs,
        )

        /*
         * -----------------------------------------------------
         * MESSAGE
         * -----------------------------------------------------
         */

        await createTextStreamer(
          controller,
          encoder,
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
          controller,
          encoder,
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
          controller,
          encoder,
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
          controller,
          encoder,
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
          controller,
          encoder,
          "message_delta",
          "Fake error message below.",
          delayMs,
        )

        const errorResult = await executeToolAndStream(
          controller,
          encoder,
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
          controller,
          encoder,
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
          controller,
          encoder,
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
         * Store the action so /api/chat/action can resolve it
         * later.
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

        controller.enqueue(
          encoder.encode(
            createSSEEvent({
              type: "action_proposed",
              action: pendingAction,
            }),
          ),
        )

        /*
         * -----------------------------------------------------
         * The simulated model stops here.
         *
         * In the real implementation, the model would stop
         * generating until the user approves/rejects this
         * action.
         * -----------------------------------------------------
         */

        controller.enqueue(
          encoder.encode(
            createSSEEvent({
              type: "done",
            }),
          ),
        )

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

export async function POST(request: Request) {
  try {
    const {
      message,
      context,
    }: {
      message: AIChatUserMessage
      context: AIChatUserMessageContext
    } = await request.json()

    /*
     * ---------------------------------------------------------
     * Validate request
     * ---------------------------------------------------------
     */

    if (!message || message.content.trim().length === 0) {
      throw new Error("Message is empty")
    }

    if (!message.id) {
      throw new Error("Invalid message ID")
    }

    if (message.role !== "user") {
      throw new Error(
        `Message role is not user (reading: ${message.role})`,
      )
    }

    console.log("Test AI request:", {
      message,
      context,
    })

    /*
     * ---------------------------------------------------------
     * Start simulated model stream
     * ---------------------------------------------------------
     */

    const stream = testStream(
      context,
      50,
    )

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error(
      "Failed to generate chat response:",
      error,
    )

    return Response.json(
      {
        error: "Failed to generate AI response",
      },
      {
        status: 500,
      },
    )
  }
}