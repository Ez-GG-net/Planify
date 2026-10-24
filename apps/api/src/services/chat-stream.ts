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
import { OLLAMA_TOOLS, parseToolArguments } from "../ai/ollama-tools";
import type { OllamaChatMessage, OllamaToolFunction } from "../ai/ollama-tools";
import { streamOllamaChat } from "../ai/stream-chat";

export class UsageLimitReachedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "UsageLimitReachedError"
  }
}
function combineRoundTextAndReasoning(roundText: string, roundReasoning: string): string {
  return `<Previous reasoning>
${roundReasoning}
</Previous reasoning>

${roundText}`;
}

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

  // FAQ: This is not its own seperate markdown file because it's a dynamic system prompt
  const target =
    context.entityType === "pre-task"
      ? "the preparation (pre-task) list"
      : context.entityType === "task-guide"
        ? "a task's guide"
        : "the main schedule";

  return `
# Information
  You are Planify's assistant, helping the user manage their schedule.

# Task Information
  Each task will have a title, date, start time, and estimated duration. Tasks may also have a guide with steps and details.
  Start time will be written in minutes-from-midnight (e.g. 8:30am = 510, 3:15pm = 915).

# Tools

  Read tools (get_*) inspect the current schedule and tasks.
  They do not modify anything.

  The user does not give the results to the read tools, a tool call is made in the background and the results are returned to you. You can then use the results to reason about the next steps.

  Write tools (create_*, modify_*, delete_*) create proposed changes.
  They do not directly modify the schedule unless the user approves them.

  ## Write Tool Protocol

  Before calling a write tool, briefly state what change you are proposing.

  When a write tool returns:

  {"status":"pending_approval","actionId":"..."}

  the proposal has been successfully created.

  After receiving pending_approval:

  - Stop immediately.
  - Do not call any additional tools.
  - Do not create, modify, or delete another task.
  - Do not repeat or restate the proposal.
  - Do not continue reasoning about the requested change.
  - Wait for the application to provide the approval or rejection result.

  The application handles approval through the proposal UI. Do not ask the user to approve or reject the proposal. 
  
  Do not request permission to proceed with any changes, write tools will ask for it.

  Do not request approval for your planned changes, the application will handle that.

  Never call a write tool again for the same change unless the application explicitly indicates that the previous proposal was rejected or cancelled.

# Context
  You are currently working with ${target}.
  
  Current date: ${new Date().toISOString()}

# Output
  - Make responses short and concise. 
  - Do not include any extra commentary or explanations. Only respond with the information requested or the action proposed.
  - Answer in the same language the user writes in.
  - Do not refer to yourself as an AI model or assistant, you are the user's personal assistant.
`;
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
    } else if (prev.role === "assistant") {
      // Assistant messages: only the plain-text content matters for the model.
      previousMessages.push({ role: "assistant", content: prev.content });
    } //Ignore tool messages from past turns
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
          // Stop feeding the model; tokens spent past this point is wasted.
          abortController.abort();
          throw new UsageLimitReachedError("Chat token usage limit reached");
        }
      };

      try {
        const toolContext = createToolContext(context);
        const systemMessage = buildSystemPrompt(context);
        const previousMessages: OllamaChatMessage[] = [
          ...buildPreviousMessages(context),
          // The current user message is seeded here, in chronological order,
          // so it sits before any assistant/tool round messages the agent
          // loop appends below. Passing `userMessage: ""` per round keeps
          // callProvider from re-posing it as a fresh prompt on every
          // iteration (which read like the assistant responding before the
          // request and re-derived identical reasoning each round).
          { role: "user", content: message.content },
        ];

        // If the caller's client disconnects, propagate the abort to Ollama.
        signal?.addEventListener("abort", () => abortController.abort(), {
          once: true,
        });

        // Hold a single generation slot for the entire multi-round loop so Ollama isn't preempted between tool rounds.
        await withGenerationSlot(async () => {
          for (let round = 0; round < MAX_ROUNDS; round++) {
            ////console.dir(previousMessages, { depth: 5, colors: true });
            let roundText = "";
            // Reasoning-model state: the model streams `thinking` text before
            // its final `content` answer. We surface it as a self-contained
            // collapsible segment per round, and accumulate it so the next
            // round's Ollama call can see the model's own prior chain of
            // thought instead of forcing it to re-derive from scratch.
            let roundReasoning = "";
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
              userMessage: "",
              previousMessages,
              tools: OLLAMA_TOOLS,
              signal: abortController.signal,
            })) {
              // If the model is thinking, emit a `thinking_delta` event
              const thinking = chunk.message?.thinking;
              if (thinking) {
                thinkingStartedAt ??= Date.now();
                roundReasoning += thinking;
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
                //Check if the tool name exists, add it to the list of tool calls 
                if (name && OLLAMA_TOOLS_MAP.has(name)) {
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

            // Push the assistant's answer (plus its chain of thought) and
            // tool calls to the message history so the next round model can
            // see them and continue its reasoning.
            previousMessages.push({
              role: "assistant",
              content: roundReasoning.trim() ? combineRoundTextAndReasoning(roundText, roundReasoning) : roundText,
              //thinking: roundReasoning, //add this back if ollama models support it
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
            if (toolContext.pendingActions.length > doneBefore) {
              break; // Stop the loop after proposing actions, the model must wait for approval or rejection before continuing.
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
        //ignore cancel abort errors
        if (error instanceof DOMException && error.name === "AbortError") {
          console.log("[AI chat stream] Stream aborted by client");
          controller.close();
          return;
        }

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
const OLLAMA_TOOLS_MAP = new Map<string, OllamaToolFunction>(
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
