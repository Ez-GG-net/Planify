import { z } from "zod"
import type { AIChatMessage } from "@/types"

/*
 * ---------------------------------------------------------------------------
 * Session-scoped chat transcript store.
 *
 * Conversations live in sessionStorage under `planify.chat.<scope>` so they
 * survive route changes (schedule <-> task pages) without leaking between
 * browser sessions. Each chatting context owns one scope key:
 *
 *   - Schedule view, tasks tab      -> task:<scheduleId>
 *   - Schedule view, preparation tab -> pre-task:<scheduleId>
 *   - Task guide page               -> guide:<scheduleId>:<taskId>
 * ---------------------------------------------------------------------------
 */

const PREFIX = "planify.chat"

export function scheduleChatKey(
  scheduleId: string,
  entityType: "task" | "pre-task"
) {
  return `${PREFIX}.${entityType}:${scheduleId}`
}

export function guideChatKey(scheduleId: string, taskId: string) {
  return `${PREFIX}.guide:${scheduleId}:${taskId}`
}

function canUseSessionStorage() {
  return typeof sessionStorage !== "undefined"
}

/*
 * Storage-level shape check for transcripts. Deliberately looser than the
 * domain schemas: IDs stay opaque strings here because validating them
 * against domain formats (e.g. UUIDv7 task ids) would let a single legacy
 * reference wipe an entire conversation on read. Everything stored under
 * these keys was produced as an AIChatMessage in the first place, so the
 * structural match plus a cast back is sound.
 */
const storedActionSchema = z.object({
  id: z.string(),
  toolCallId: z.string(),
  type: z.string(),
  status: z.string(),
  arguments: z.record(z.string(), z.unknown()),
})

const storedPartSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("thinking"),
    content: z.string(),
    durationSeconds: z.number().optional(),
  }),
  z.object({ type: z.literal("message"), content: z.string() }),
  z.object({
    type: z.literal("tool"),
    toolCallId: z.string(),
    tool: z.string(),
    status: z.enum(["started", "completed", "failed"]),
    statusText: z.string().optional(),
  }),
  z.object({ type: z.literal("action"), action: storedActionSchema, before: z.record(z.string(), z.unknown()).optional() }),
])

const storedMessageSchema = z.discriminatedUnion("role", [
  z.object({
    id: z.string(),
    role: z.literal("user"),
    content: z.string(),
  }),
  z.object({
    id: z.string(),
    role: z.literal("assistant"),
    content: z.string(),
    parts: z.array(storedPartSchema).optional(),
  }),
])

/**
 * Reads and validates a persisted transcript. Returns null when absent or
 * malformed so callers fall back to an empty conversation.
 */
export function loadChatMessages(key: string): AIChatMessage[] | null {
  if (!canUseSessionStorage()) {
    return null
  }

  const item = sessionStorage.getItem(key)

  if (!item) {
    return null
  }

  try {
    const result = storedMessageSchema
      .array()
      .safeParse(JSON.parse(item))

    if (!result.success) {
      return null
    }

    return result.data as unknown as AIChatMessage[]
  } catch {
    return null
  }
}

export function saveChatMessages(key: string, messages: AIChatMessage[]) {
  if (!canUseSessionStorage()) {
    return
  }

  sessionStorage.setItem(key, JSON.stringify(messages))
}

export function clearChatMessages(key: string) {
  if (!canUseSessionStorage()) {
    return
  }

  sessionStorage.removeItem(key)
}
