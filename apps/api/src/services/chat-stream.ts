import { SchedulePlanSchema } from "@planify/schemas";
import {
  AIChatStreamEventSSEEPrefix,
  formatToolFailure,
  formatToolSuccess,
  generateRandomToolCallID,
} from "@planify/types";
import type {
  AIChatPendingAction,
  AIChatStreamEvent,
  AIChatTool,
  AIChatToolArguments,
  AIChatToolContext,
  AIChatUserMessage,
  AIChatUserMessageContext,
} from "@planify/types";

import { withGenerationSlot } from "@planify/api/ai/concurrency";
import { executeTool } from "../ai/tools";
import { UsageLimitReachedError } from "./chat-test-stream";
import { OLLAMA_TOOLS, parseToolArguments } from "../ai/ollama-tools";
import type { OllamaChatMessage } from "../ai/ollama-tools";
import { streamOllamaChat } from "../ai/stream-chat";

function createSSEEvent(event: AIChatStreamEvent): string {
  return `${AIChatStreamEventSSEEPrefix} ${JSON.stringify(event)}\r\n\r\n`;
}

/** Rough token estimate: ~4 chars per token. Mirrors chat-test-stream.ts. */
function estimateTokens(bytes: number): number {
  return Math.ceil(bytes / 4);
}

/** Safety cap on agent-loop rounds so a misbehaving model can't loop forever. */
const MAX_ROUNDS = 10;

function createToolContext(
  context: AIChatUserMessageContext,
): AIChatToolContext {
  const schedule = SchedulePlanSchema.parse(context.schedule);

  const virtualSchedule = structuredClone(schedule);

  const pendingActions: AIChatPendingAction[] = [];

  return {
    virtualSchedule,
    scope: context.entityType === "pre-task" ? "pre-task" : "task",
    pendingActions,
    addPendingAction(action) {
      pendingActions.push(action);
    },
  };
}

/**
 * System prompt describing the assistant's role and the schedule it can
 * inspect and edit via tools. The schedule is embedded so the model starts
 * with context instead of being forced to call get_schedule first.
 */
function buildSystemPrompt(context: AIChatUserMessageContext): string {
  let scheduleText = "The conversation is not scoped to a schedule yet.";
  if (context.schedule) {
    try {
      scheduleText = JSON.stringify(context.schedule);
    } catch {
      scheduleText = "Schedule could not be serialized.";
    }
  }

  const target =
    context.entityType === "pre-task"
      ? "the preparation (pre-task) list"
      : context.entityType === "task-guide"
        ? "a task's guide"
        : "the main schedule";

  return `You are Planify's assistant, helping the user manage their schedule.

You are currently working with ${target}.

You have access to tools to read and change schedule data. Prefer read tools
(get_task, get_schedule, get_filtered_tasks, get_task_guide, and their
pre-task variants) to gather the information you need before answering.

Write tools (create_*, modify_*, delete_*) DO NOT change anything directly —
they propose a change that the user must approve. When you call one, it
returns {"status":"pending_approval","actionId":...}, meaning the proposal is
awaiting the user's decision. Tell the user what you proposed so they can
approve or reject it.

Be concise and helpful. Answer in the same language the user writes in.

Current schedule context:
${scheduleText}`;
}

/**
 * Builds the chat history messages (everything before the current user
 * message): the conversation history, plus any assistant/tool messages
 * accumulated across agent rounds. The system and current user messages are
 * supplied separately for `callProvider`.
 */
function buildPreviousMessages(
  context: AIChatUserMessageContext,
): OllamaChatMessage[] {
  const previousMessages: OllamaChatMessage[] = [];

  for (const prev of context.previousMessages ?? []) {
    if (prev.role === "user") {
      previousMessages.push({ role: "user", content: prev.content });
    } else {
      // Assistant messages: only the plain-text content matters for the model.
      previousMessages.push({ role: "assistant", content: prev.content });
    }
  }

  return previousMessages;
}

/**
 * The real chat agent loop. Holds a single generation slot for the entire
 * response (including any tool rounds) so Ollama — a one-request-at-a-time
 * GPU — isn't preempted in the middle of a conversation.
 *
 * Streams the model's NDJSON output as `message_delta` SSE events, executes
 * tool calls through the shared `executeTool` registry, and replays tool
 * results back to the model until it concludes with no further tool calls.
 *
 * @param tokenLimit - When set, the stream tracks estimated token usage
 *   (chars / 4) and emits a `usage_limit_reached` SSE event followed by an
 *   error once the limit is exceeded. The route layer refunds unused quota.
 */
export function chatStream(
  context: AIChatUserMessageContext,
  message: AIChatUserMessage,
  tokenLimit?: number,
  signal?: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const usage = {
        tokensUsed: 0,
        outputTokens: 0,
      };

      const abortController = new AbortController();

      /**
       * Single choke-point for token accounting and limit enforcement: every
       * SSE event goes through here.
       */
      const emit = (event: AIChatStreamEvent) => {
        controller.enqueue(encoder.encode(createSSEEvent(event)));

        //count all SSE events towards the token limit
        usage.tokensUsed += estimateTokens(JSON.stringify(event).length);

        // If we have exceeded the token limit
        if (tokenLimit != null && usage.tokensUsed > tokenLimit) {
          controller.enqueue(
            encoder.encode(
              createSSEEvent({
                type: "usage_limit_reached",
                message: "Chat token usage limit reached",
              }),
            ),
          );
          // Stop feeding the model; money spent past this point is wasted.
          abortController.abort();
          throw new UsageLimitReachedError("Chat token usage limit reached");
        }
      };

      try {
        const toolContext = createToolContext(context);
        const systemMessage = buildSystemPrompt(context);
        const userMessage = message.content;
        const previousMessages = buildPreviousMessages(context);

        // If the caller's client disconnects, propagate the abort to Ollama.
        signal?.addEventListener("abort", () => abortController.abort(), {
          once: true,
        });

        // Hold a single generation slot for the entire multi-round loop so Ollama isn't preempted between tool rounds.
        await withGenerationSlot(async () => {
          for (let round = 0; round < MAX_ROUNDS; round++) {
            let roundText = "";
            // Reasoning-model state: the model streams `thinking` text before
            // its final `content` answer. We surface it as a self-contained
            // collapsible segment per round.
            let thinkingStartedAt: number | null = null;
            let thinkingFinished = false;
            const toolCalls: Array<{
              name: AIChatTool;
              arguments: Record<string, unknown>;
            }> = [];

            //send a thinking_finished event if the model is done reasoning
            const closeThinking = () => {
              if (thinkingStartedAt != null && !thinkingFinished) {
                emit({
                  type: "thinking_finished",
                  durationSeconds: (Date.now() - thinkingStartedAt) / 1000,
                });
                thinkingFinished = true;
                thinkingStartedAt = null;
              }
            };
            // Iterate through each NDJSON chunk from Ollama until it signals `done` or the stream is aborted.
            for await (const chunk of streamOllamaChat({
              systemMessage,
              userMessage,
              previousMessages,
              tools: OLLAMA_TOOLS,
              signal: abortController.signal,
            })) {
              // If the model is thinking, emit a `thinking_delta` event
              const thinking = chunk.message?.thinking;
              if (thinking) {
                thinkingStartedAt ??= Date.now();
                emit({ type: "thinking_delta", content: thinking });
              }
              //If the model has finished thinking and started producing content, emit a `thinking_finished` event and a `message_delta` event
              const content = chunk.message?.content;
              if (content) {
                // The final answer begins once the reasoning phase ends.
                closeThinking();
                roundText += content;
                emit({ type: "message_delta", content });
              }
              //If the model has sent tool call(s), add it to the list
              for (const call of chunk.message?.tool_calls ?? []) {
                const name = call.function?.name;
                if (name && (name as string) in OLLAMA_TOOLS_MAP) {
                  toolCalls.push({
                    name: name as AIChatTool,
                    arguments: parseToolArguments(call.function?.arguments),
                  });
                }
              }

              //If the model has finished the round, add its output token count.
              //Each round is a separate HTTP request, so eval_count is per-round —
              //sum them to get the total output across the whole turn.
              if (chunk.done != null && chunk.eval_count != null) {
                usage.outputTokens += chunk.eval_count;
              }
            }

            // If a round reasoned but produced no answer text (e.g. reasoning
            // then immediately calling a tool), still close the segment.
            closeThinking();

            // Model concluded this round without requesting any tools.
            if (toolCalls.length === 0) {
              // The model is done;
              break;
            }

            // Push the assistant's answer and tool calls to the message history so the
            // next round model can see them.
            previousMessages.push({
              role: "assistant",
              content: roundText,
              tool_calls: toolCalls.map((call) => ({
                function: { name: call.name, arguments: call.arguments },
              })),
            });

            //get the number of pending actions
            const doneBefore = toolContext.pendingActions.length;

            // Execute each tool call (in order) and emit the results as a SSEEvent
            // The model will see the results in the next round, so it can react to them.
            // Note: Tool calls do not modify the schedule, they gain information about it.
            const toolResults: OllamaChatMessage[] = [];
            for (const call of toolCalls) {
              toolResults.push(
                await executeToolAndEmit(
                  call.name,
                  call.arguments,
                  toolContext,
                  emit,
                ),
              );
            }

            // Propose each pending action (in order) and emit the results as a SSEEvent
            // The model will see the results in the next round, so it can react to them.
            // Important: Pending actions are removed as they are proposed, so the model sees only the remaining pending actions in the next round.
            // Note: Pending actions are proposals to modify the schedule, they do not modify it yet.
            for (const action of toolContext.pendingActions.slice(doneBefore)) {
              emit({ type: "action_proposed", action });
            }

            previousMessages.push(...toolResults);
          }
        }, abortController.signal);

        // emit the output token count of the final round or the total token count
        emit({
          type: "usage",
          outputTokens: usage.outputTokens || Math.ceil(usage.tokensUsed),
        });
        // emit a final `done` event to signal the end of the stream
        emit({ type: "done" });
        controller.close();
      } catch (error) {
        console.error("[AI chat stream] Error:", error);

        //Note: does not count error events towards the token limit
        controller.enqueue(
          encoder.encode(
            createSSEEvent({
              type: "error",
              message: error instanceof Error ? error.message : "Unknown error",
            }),
          ),
        );

        controller.close();
      }
    },
  });
}

/** Maps tool names to their Ollama definitions for a fast existence check. */
const OLLAMA_TOOLS_MAP = new Map(
  OLLAMA_TOOLS.map((tool) => [tool.function.name, tool]),
);

/**
 * Streaming wrapper around `executeTool` that emits the same SSE lifecycle
 * events the simulated stream did (tool_started/completed/failed) and returns
 * the Ollama `tool` result message to replay to the model.
 */
async function executeToolAndEmit(
  tool: AIChatTool,
  args: AIChatToolArguments[AIChatTool],
  context: AIChatToolContext,
  emit: (event: AIChatStreamEvent) => void,
): Promise<OllamaChatMessage> {
  const toolCallId = generateRandomToolCallID();
  context.currentToolCallId = toolCallId;

  // Tell the client that the model is starting to execute the tool.
  emit({ type: "tool_started", toolCallId, tool });

  let result: ReturnType<typeof executeTool> extends Promise<infer T>
    ? T
    : never;

  try {
    result = await executeTool(tool, args, context);
  } catch (error) {
    // Tell the client that the tool call failed
    emit({
      type: "tool_failed",
      toolCallId,
      tool,
      statusText: formatToolFailure(tool, error, { scope: context.scope }),
    });

    // The model still needs a result to react to, so report the failure text.
    return {
      role: "tool",
      name: tool,
      content: JSON.stringify({
        error: error instanceof Error ? error.message : "Tool call failed",
      }),
    };
  } finally {
    context.currentToolCallId = undefined;
  }

  console.log(`[AI tool result] ${tool}:`, result);

  // Tell the client that the model has completed executing the tool, summarizing the result
  emit({
    type: "tool_completed",
    toolCallId,
    tool,
    statusText: formatToolSuccess(tool, args, result, {
      virtualSchedule: context.virtualSchedule,
      scope: context.scope,
    }),
  });

  return {
    role: "tool",
    name: tool,
    content: JSON.stringify(result),
  };
}
