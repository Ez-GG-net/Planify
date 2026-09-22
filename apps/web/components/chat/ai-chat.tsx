"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  LoaderCircle,
  RotateCw,
  Send,
  Trash2,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  AIChatEntityType,
  AIChatActionStatus,
  AIChatMessage,
  AIChatMessagePart,
  AIChatPendingAction,
  AIChatUpdate,
  AIChatUserMessage,
  AIChatUserMessageContext,
} from "@planify/types";
import { generateRandomIDv1 } from "@planify/types";
import { generateAIChatResponse } from "@/lib/api/chat-message";
import { fetchQuotaUsage } from "@/lib/api/quota";
import { captureActionBefore } from "@/lib/chat/action-baseline";
import { useEntityNavigation } from "@/lib/chat/entity-navigation";
import {
  clearChatMessages,
  loadChatMessages,
  saveChatMessages,
} from "@/lib/chat/chat-storage";
import AIChatMessageBubble from "./ai-chat-bubble";
import { AIChatRuntimeProvider, type AIChatRuntimeValue } from "./chat-runtime";
import { TokenUsageBar } from "./ai-token-usage-bar";

export interface AIChatTypeInfo {
  title: string;
  description: string;
  placeholder: string;
  emptyTitle: string;
  emptyDescription: string;
}

//basically how much the user can scroll up without it stopping the auto-scroll to bottom
const SCROLL_BOTTOM_UNTIL = 24; //px

const CHAT_TYPE_INFO_BY_ENTITY: Record<AIChatEntityType, AIChatTypeInfo> = {
  "task-guide": {
    title: "Questions about this guide",
    description: "Ask questions or request changes to the steps.",
    placeholder: "Ask a question or request a change...",
    emptyTitle: "Need help with this task?",
    emptyDescription:
      "Ask a question or tell me how you'd like to change the guide.",
  },
  task: {
    title: "Questions about your tasks",
    description: "Ask questions or request changes to your tasks.",
    placeholder: "Ask about your tasks or request a change...",
    emptyTitle: "Need help with your schedule?",
    emptyDescription:
      "Ask a question or tell me how you'd like to change your tasks.",
  },
  "pre-task": {
    title: "Questions about your pre-tasks",
    description: "Ask questions or request changes to your pre-tasks.",
    placeholder: "Ask about your pre-tasks or request a change...",
    emptyTitle: "Need help with your preparation?",
    emptyDescription:
      "Ask a question or tell me how you'd like to change your pre-tasks.",
  },
};

/*
 * Unresolved proposals from a restored transcript so they remain
 * actionable (Accept/Reject) after navigating away and back.
 */
function collectPendingActions(
  messages: AIChatMessage[],
): AIChatPendingAction[] {
  const actions: AIChatPendingAction[] = [];

  for (const message of messages) {
    if (message.role !== "assistant") {
      continue;
    }

    for (const part of message.parts ?? []) {
      if (part.type === "action" && part.action.status === "pending") {
        actions.push(part.action);
      }
    }
  }

  return actions;
}

/*
 * Computes the first day of the next UTC month as a human-readable label
 * ("March 1"). Reused for both the catch-block response and the mid-stream
 * toast so both stay in sync.
 */
function getNextResetDateLabel(): string {
  return new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1),
  ).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export function AIChat({
  context,
  onApplyUpdate,
  onApplyAction,
  entityType,
  initialMessages,
  historyKey,
  onClose,
}: {
  context: AIChatUserMessageContext;
  onApplyUpdate: (update: AIChatUpdate) => void;
  onApplyAction: (action: AIChatPendingAction) => Promise<boolean | void>;
  entityType: AIChatEntityType;
  initialMessages: AIChatMessage[];
  /** Session-storage scope for this conversation; enables persistence. */
  historyKey?: string;
  /** Closes/hides the surrounding chat panel. */
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<AIChatMessage[]>(() =>
    historyKey
      ? (loadChatMessages(historyKey) ?? initialMessages)
      : initialMessages,
  );
  const [pendingActions, setPendingActions] = useState<AIChatPendingAction[]>(
    () => collectPendingActions(messages),
  );
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [failedRequest, setFailedRequest] = useState(false);
  const [isFollowingStream, setIsFollowingStream] = useState(true);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [tokenLimit, setTokenLimit] = useState<number | null>(null);

  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeAssistantMessageIdRef = useRef<string | null>(null);

  const chatTypeInfo = CHAT_TYPE_INFO_BY_ENTITY[entityType];
  /*
   * --------------------------------------------------------------------------
   * Effects
   * --------------------------------------------------------------------------
   */
  useEffect(() => {
    const element = messageListRef.current;

    // Only auto-scroll while the user is following the stream. Once they
    // scroll up, `handleMessageListScroll` flips the flag off and new
    // chunks must not yank them back to the bottom.
    if (!element || !isFollowingStream) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [messages, isFollowingStream]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch chat token quota on mount.
  useEffect(() => {
    let cancelled = false;
    fetchQuotaUsage().then((data) => {
      if (!cancelled && data.chat_tokens) {
        setTokensUsed(data.chat_tokens.used);
        setTokenLimit(data.chat_tokens.limit);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Persist the transcript whenever it settles. Writes are skipped while a
   * response is streaming so the storage write happens once per turn instead
   * of once per delta; the final message update commits before `isSending`
   * flips back to false, so nothing is missed. An empty transcript clears
   * the stored scope entirely.
   */
  useEffect(() => {
    if (!historyKey || isSending) {
      return;
    }

    if (messages.length === 0) {
      clearChatMessages(historyKey);

      return;
    }

    saveChatMessages(historyKey, messages);
  }, [historyKey, messages, isSending]);
  /*
   * --------------------------------------------------------------------------
   * Message handling
   * --------------------------------------------------------------------------
   */

  const sendMessage = async (content: string) => {
    const userMessage: AIChatUserMessage = {
      id: generateRandomIDv1(),
      role: "user",
      content,
    };

    addMessage(userMessage);

    const assistantMessageId = generateRandomIDv1();
    activeAssistantMessageIdRef.current = assistantMessageId;
    addMessage({
      id: assistantMessageId,
      role: "assistant",
      content: "",
      parts: [],
    });

    try {
      // Give the model the full live conversation so it can refer back to
      // earlier turns of this session. `messages` here is the state captured
      // before this turn's user/assistant messages were added, so it holds
      // exactly the prior history — the current `userMessage` is sent as the
      // final message.
      const requestContext: AIChatUserMessageContext = {
        ...context,
        previousMessages: messages,
      };

      const aiResponse = await generateAIChatResponse(
        userMessage,
        requestContext,
        {
          onText: (chunk) => appendAssistantContent("message", chunk),

          onThinking: (chunk) => appendAssistantContent("thinking", chunk),

          onThinkingFinished: (durationSeconds) => {
            markThinkingFinished(durationSeconds);
          },

          onToolStarted: (toolCallId, tool) => {
            addToolStarted(toolCallId, tool);
          },

          onToolCompleted: (toolCallId, tool, statusText) => {
            setToolStatus(toolCallId, "completed", statusText);
          },
          onToolFailed: (toolCallId, tool, statusText) => {
            console.error(`Tool failed: ${tool} (call ID: ${toolCallId})`);
            setToolStatus(toolCallId, "failed", statusText);
          },

          onAction: (action) => {
            addPendingAction(action);
            // Snapshot the affected values now — this is the only moment the
            // plan is guaranteed to be in the pre-change state.
            appendAssistantPart({
              type: "action",
              action,
              before: captureActionBefore(action, context),
            });
          },

          onActionResolved: (actionId, status) => {
            resolvePendingAction(actionId, status);
          },

          onUsage: (outputTokens) => {
            setTokensUsed((prev) => prev + outputTokens);
          },

          onUsageLimitReached: (message) => {
            const resetLabel = getNextResetDateLabel();
            toast.warning(message, {
              description: `Your limit resets on ${resetLabel}`,
              duration: 10_000,
            });
          },
        },
      );
      updateAssistantMessage((message) => ({
        ...message,
        content: aiResponse.content,
      }));
    } catch (error) {
      // If the server rejected the request because the monthly chat-token
      // quota is exhausted, surface the message inside the assistant bubble
      // so it looks like the AI is telling the user directly.
      const isQuotaExceeded =
        error instanceof Error && error.cause === "quota_exceeded";

      if (isQuotaExceeded) {
        const resetLabel = getNextResetDateLabel();
        updateAssistantMessage((message) => ({
          ...message,
          content: `Max token limit reached. Please wait until ${resetLabel} for your usage to reset.`,
        }));
      }

      //setFailedRequest(true)
    }
    activeAssistantMessageIdRef.current = null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = input.trim();

    if (!content || isSending) {
      return;
    }

    setInput("");
    setFailedRequest(false);
    // Sending a new message resumes following so the reply stays in view.
    setIsFollowingStream(true);
    setIsSending(true);

    try {
      await sendMessage(content);
    } catch (error) {
      console.error("Failed to send chat message:", error);
      setFailedRequest(true);
    } finally {
      setIsSending(false);
    }
  };

  /*
   * --------------------------------------------------------------------------
   * Retry
   * --------------------------------------------------------------------------
   */

  const handleRetry = async () => {
    if (isSending) {
      return;
    }

    // TODO: Store the last failed request so it can be retried.
    //
    // For now this is intentionally a no-op.

    console.log("handleRetry");
  };

  /*
   * Clears the whole conversation: local state and the persisted scope.
   * The persistence effect removes the storage entry once `messages` is
   * empty, so only state needs resetting here.
   */
  const handleClearConversation = () => {
    if (isSending) {
      return;
    }

    setMessages([]);
    setPendingActions([]);
    setFailedRequest(false);
    setIsFollowingStream(true);
  };

  /*
   * --------------------------------------------------------------------------
   * Message helpers
   * --------------------------------------------------------------------------
   */

  const addMessage = (message: AIChatMessage) => {
    setMessages((current) => [...current, message]);
  };

  const updateAssistantMessage = (
    update: (
      message: Extract<AIChatMessage, { role: "assistant" }>,
    ) => AIChatMessage,
  ) => {
    const messageId = activeAssistantMessageIdRef.current;

    if (!messageId) {
      return;
    }

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.role === "assistant"
          ? update(message)
          : message,
      ),
    );
  };
  const appendAssistantPart = (part: AIChatMessagePart) => {
    updateAssistantMessage((message) => {
      const parts = message.parts ?? [];
      const lastPart = parts.at(-1);

      if (
        lastPart?.type === part.type &&
        (part.type === "thinking" || part.type === "message") &&
        (lastPart.type === "thinking" || lastPart.type === "message")
      ) {
        return {
          ...message,
          parts: [
            ...parts.slice(0, -1),
            { ...lastPart, content: lastPart.content + part.content },
          ],
        };
      }

      return { ...message, parts: [...parts, part] };
    });
  };
  const appendAssistantContent = (
    type: "thinking" | "message",
    content: string,
  ) => {
    appendAssistantPart({ type, content });
  };
  const addPendingAction = (action: AIChatPendingAction) => {
    setPendingActions((current) => [...current, action]);
  };
  const addToolStarted = (toolCallId: string, tool: string) => {
    appendAssistantPart({ type: "tool", toolCallId, tool, status: "started" });
  };
  const setToolStatus = (
    toolCallId: string,
    status: "completed" | "failed",
    statusText?: string,
  ) => {
    updateAssistantMessage((message) => ({
      ...message,
      parts: (message.parts ?? []).map((part) =>
        part.type === "tool" && part.toolCallId === toolCallId
          ? { ...part, status, statusText }
          : part,
      ),
    }));
  };
  // Stamps the measured duration onto the segment that just finished so the
  // header can read "Thought for 3.6s". The part stays put; nothing else in
  // the stream needs to know which segment it belongs to because thinking
  // deltas always merge into the trailing thinking part.
  const markThinkingFinished = (durationSeconds: number) => {
    updateAssistantMessage((message) => {
      const parts = [...(message.parts ?? [])];

      for (let index = parts.length - 1; index >= 0; index -= 1) {
        const part = parts[index];

        if (part.type !== "thinking") {
          continue;
        }

        if (part.durationSeconds != null) {
          break;
        }

        parts[index] = { ...part, durationSeconds };
        break;
      }

      return { ...message, parts };
    });
  };
  const resolvePendingAction = (
    actionId: string,
    status: AIChatActionStatus,
  ) => {
    setPendingActions((current) =>
      current.map((action) =>
        action.id === actionId ? { ...action, status } : action,
      ),
    );
    setMessages((current) =>
      current.map((message) => {
        if (message.role !== "assistant") {
          return message;
        }

        return {
          ...message,
          parts: (message.parts ?? []).map((part) =>
            part.type === "action" && part.action.id === actionId
              ? { ...part, action: { ...part.action, status } }
              : part,
          ),
        };
      }),
    );
  };

  // Resolves a proposal from the Accept/Reject buttons in the message bubble.
  //
  // TODO: Persist the decision through the action-resolution API route once
  // it is implemented; for now this only updates the local chat state.
  const handleResolveAction = async (
    actionId: string,
    decision: "approved" | "rejected",
  ) => {
    const action = pendingActions.find((item) => item.id === actionId);

    if (decision === "approved" && action) {
      const applied = onApplyAction ? await onApplyAction(action) : false;
      resolvePendingAction(actionId, applied ? "applied" : "failed");
      return;
    }

    resolvePendingAction(actionId, decision);
  };

  // Lets the bubble render human-readable proposals ("Change "Eat Lunch"")
  // from raw tool arguments that only carry a task ID. The scoped `tasks`
  // list comes first so lookups respect the conversation's active entity
  // type (main tasks vs pre-tasks).
  const getTaskById = (taskId: string) =>
    context.tasks?.find((task) => task.id === taskId) ??
    context.schedule?.tasks.find((task) => task.id === taskId) ??
    (context.currentTask?.id === taskId ? context.currentTask : undefined);

  // Guide-step counterpart of getTaskById. The step's live position travels
  // with it because ids are array indexes that renumber after every
  // insert/move; only guide-scoped conversations have a currentGuide, so
  // list-level chats simply resolve nothing and cards lean on snapshots.
  const getGuideStep = (stepId: number) => {
    const steps = context.currentGuide?.steps;
    const step = steps?.find((candidate) => candidate.id === stepId);

    if (steps == null || step == null) {
      return undefined;
    }

    return { step, order: steps.indexOf(step) };
  };

  // Built once for the whole conversation; proposal cards follow entity
  // references through the runtime context instead of per-component hooks.
  const navigateToEntity = useEntityNavigation(context.schedule?.id);

  const chatRuntime: AIChatRuntimeValue = {
    getTaskById,
    getGuideStep,
    resolveAction: handleResolveAction,
    navigateToEntity,
    currentTaskId: context.currentTask?.id,
    scope: entityType === "pre-task" ? "pre-task" : "task",
  };

  /*
   * --------------------------------------------------------------------------
   * Scrolling
   * --------------------------------------------------------------------------
   */
  const handleMessageListScroll = () => {
    const element = messageListRef.current;

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    const atBottom = distanceFromBottom <= SCROLL_BOTTOM_UNTIL;

    setIsFollowingStream(atBottom);
  };
  const scrollToBottom = () => {
    const element = messageListRef.current;

    if (!element) {
      return;
    }
    const target = element.scrollHeight;
    const endPos = Math.min(
      target,
      element.scrollHeight - element.clientHeight,
    );

    element.scrollTo({
      top: target,
      behavior: "smooth",
    });

    element.addEventListener(
      "scrollend",
      () => {
        if (element.scrollTop >= endPos - SCROLL_BOTTOM_UNTIL) {
          element.scrollTop = element.scrollHeight;
        }
      },
      { once: true },
    );
  };

  const lastMessage = messages.at(-1);

  return (
    <Card className="flex h-full flex-col overflow-hidden bg-transparent py-0">
      <CardHeader className="shrink-0 border-b">
        <CardTitle className="flex items-center gap-2 pt-4 text-16">
          <Bot className="size-5" />
          {chatTypeInfo.title}

          <span className="ml-auto flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                aria-label="Clear conversation"
                title="Clear conversation"
                onClick={handleClearConversation}
                disabled={isSending}
              >
                <Trash2 className="size-4" />
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
              aria-label="Close chat"
              title="Close chat"
              onClick={onClose}
            >
              <X className="size-5" />
            </Button>
          </span>
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          {chatTypeInfo.description}
        </p>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        {messages.length > 0 ? (
          <div
            ref={messageListRef}
            onScroll={handleMessageListScroll}
            className="relative min-h-0 flex-1 space-y-5 overflow-y-auto p-5"
          >
            <AIChatRuntimeProvider value={chatRuntime}>
              {messages.map((message) => (
                <AIChatMessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={isSending && message.id === lastMessage?.id}
                />
              ))}
            </AIChatRuntimeProvider>

            {isSending &&
              lastMessage?.role === "assistant" &&
              !lastMessage.parts?.length && (
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Bot className="size-4" />
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm">
                    <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Loading assistant...
                    </span>
                  </div>
                </div>
              )}

            {/* Scroll-to-bottom button */}
            {!isFollowingStream && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={scrollToBottom}
                className="sticky bottom-2 left-1/2 z-10 size-9 -translate-x-1/2 rounded-full border shadow-md"
                aria-label="Scroll to latest message"
              >
                <ChevronDown className="size-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-8 text-center">
            <Bot className="mx-auto mb-3 size-8 text-muted-foreground" />

            <p className="text-sm font-medium">{chatTypeInfo.emptyTitle}</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {chatTypeInfo.emptyDescription}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="shrink-0 border-t p-4">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={chatTypeInfo.placeholder}
              className="max-h-32 min-h-10 resize-none"
              rows={1}
              disabled={isSending}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();

                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />

            <Button
              type="submit"
              className="size-10"
              disabled={!input.trim() || isSending}
              aria-label="Send message"
            >
              <Send className="size-5" />
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="shrink-0 text-xs text-muted-foreground">
              Enter to send · Shift+Enter for a new line
            </p>

            {tokenLimit != null && (
              <TokenUsageBar used={tokensUsed} limit={tokenLimit} />
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
