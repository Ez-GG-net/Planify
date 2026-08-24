import {
  AIChatStreamEvent,
  AIChatUserMessage,
  AIChatUserMessageContext,
  AIChatMessage,
  generateRandomIDv1,
} from "@planify/types"
import type { AIChatStreamCallbacks } from "@/types"
import { request } from "@/lib/api/client"
import { AIChatUserMessageContextSchema, AIChatUserMessageSchema } from "@planify/schemas"
import { AIChatStreamCallbacksSchema } from "@/schemas"

export async function generateAIChatResponse(
  message: AIChatUserMessage,
  context: AIChatUserMessageContext,
  callbacks: AIChatStreamCallbacks,
): Promise<AIChatMessage> {
  if (!AIChatUserMessageSchema.safeParse(message).success) {
    throw new Error("Invalid message")
  }
  if (!message.content.trim()) {
    throw new Error("Message content is empty")
  }
  if (!AIChatUserMessageContextSchema.safeParse(context).success) {
    throw new Error("Invalid context")
  }
  if (!AIChatStreamCallbacksSchema.safeParse(callbacks).success) {
    throw new Error("Invalid callbacks")
  }

  const response = await request("/generate/chat-response", {
    method: "POST",
    body: JSON.stringify({
      message,
      context,
    }),
    errorMessage: "Failed to generate AI response",
  })

  if (!response.body) {
    throw new Error("Response body is missing")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ""
  let responseContent = ""

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, {
      stream: true,
    })

    const events = buffer.split("\r\n\r\n")

    buffer = events.pop() ?? ""

    for (const event of events) {
      if (!event.startsWith("data: ")) {
        continue
      }

      const json = event.slice("data: ".length)

      const data = JSON.parse(
        json,
      ) as AIChatStreamEvent

      console.log(data)

      switch (data.type) {
        case "thinking_delta":
          callbacks.onThinking?.(data.content)
          break

        case "thinking_finished":
          callbacks.onThinkingFinished?.(data.durationSeconds)
          break

        case "message_delta":
          responseContent += data.content
          callbacks.onText(data.content)
          break

        case "tool_started":
          callbacks.onToolStarted?.(
            data.toolCallId,
            data.tool,
          )
          break

        case "tool_completed":
          callbacks.onToolCompleted?.(
            data.toolCallId,
            data.tool,
            data.statusText,
          )
          break
        case "tool_failed":
          callbacks.onToolFailed?.(
            data.toolCallId,
            data.tool,
            data.statusText,
          )
          break

        case "action_proposed":
          callbacks.onAction(data.action)
          break

        case "action_resolved":
          callbacks.onActionResolved?.(
            data.actionId,
            data.status,
          )
          break

        case "done":
          callbacks.onComplete?.({
            id: generateRandomIDv1(),
            role: "assistant",
            content: responseContent,
          })
          break

        case "error":
          console.error(data.message)
      }
    }
  }

  /*
   * Flush any remaining decoder state.
   */
  buffer += decoder.decode()

  return {
    id: generateRandomIDv1(),
    role: "assistant",
    content: responseContent,
  }
}