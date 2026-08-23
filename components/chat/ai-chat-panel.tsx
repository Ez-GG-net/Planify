"use client"

import { useEffect, useState } from "react"
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"

import { getSetting, setSetting } from "@/lib/storage"
import type {
  AIChatUserMessageContext,
  AIChatEntityType,
  AIChatMessage,
  AIChatPendingAction,
  AIChatUpdate,
} from "@/types"

import { AIChat } from "./ai-chat"

const DEFAULT_WIDTH = 550
const MIN_WIDTH = 320
const MAX_WIDTH = 1000

interface AIChatPanelProps {
  /**
   * Static context describing what the user is chatting about. The chat
   * component fills in the conversation history before each request.
   */
  context: AIChatUserMessageContext
  /** Called when the user confirms an AI-suggested change. */
  onApplyUpdate: (update: AIChatUpdate) => void
  /** Called when the user confirms an AI-suggested action. */
  onApplyAction: (action: AIChatPendingAction) => Promise<boolean | void>
  /** Overrides for the entity-specific copy. */
  entityType: AIChatEntityType
  previousMessages: AIChatMessage[]
  /** Session-storage scope; enables transcript persistence across routes. */
  historyKey?: string
}

export function AIChatPanel({
  context,
  onApplyUpdate,
  onApplyAction,
  entityType,
  previousMessages,
  historyKey,
}: AIChatPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  /*
   * Restore the saved width after hydration.
   */
  useEffect(() => {
    const saved = getSetting<number>("TASK_GUIDE_CHAT_WIDTH")

    if (typeof saved === "number" && saved >= MIN_WIDTH && saved <= MAX_WIDTH) {
      setWidth(saved)
    }
  }, [])

  /*
   * Persist the width so it survives navigation.
   */
  useEffect(() => {
    setSetting("TASK_GUIDE_CHAT_WIDTH", width)
  }, [width])

  function clampWidth(nextWidth: number) {
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, nextWidth))
  }

  /*
   * Resize by dragging the handle.
   *
   * Pointer capture keeps the move/up events flowing to the handle
   * even when the cursor leaves it, and disables text selection
   * for the duration of the drag.
   */
  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const handle = event.currentTarget
    const startX = event.clientX
    const startWidth = width

    handle.setPointerCapture(event.pointerId)

    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = "none"

    function handleMove(moveEvent: PointerEvent) {
      setWidth(clampWidth(startWidth + (startX - moveEvent.clientX)))
    }

    function handleUp(upEvent: PointerEvent) {
      document.body.style.userSelect = previousUserSelect

      handle.removeEventListener("pointermove", handleMove)
      handle.removeEventListener("pointerup", handleUp)

      if (handle.hasPointerCapture(upEvent.pointerId)) {
        handle.releasePointerCapture(upEvent.pointerId)
      }
    }

    handle.addEventListener("pointermove", handleMove)
    handle.addEventListener("pointerup", handleUp)
  }

  return (
    <aside
      className="w-full shrink-0 lg:w-(--chat-width)"
      style={
        {
          "--chat-width": `${width}px`,
        } as CSSProperties
      }
    >
      <div className="h-[70dvh] lg:sticky lg:top-12 lg:h-[calc(100dvh-3rem)]">
        {/* Drag handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
          aria-valuenow={width}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onKeyDown={(event) => {
            let nextWidth: number | null = null

            if (event.key === "ArrowLeft") {
              nextWidth = width - 16
            } else if (event.key === "ArrowRight") {
              nextWidth = width + 16
            }

            if (nextWidth != null) {
              event.preventDefault()
              setWidth(clampWidth(nextWidth))
            }
          }}
          className="group absolute inset-y-0 left-0 z-10 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none outline-none select-none focus-visible:bg-foreground/10 lg:block"
        >
          <div
            aria-hidden
            className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-foreground/30 group-focus-visible:bg-foreground/40"
          />
        </div>

        <AIChat
          context={context}
          onApplyUpdate={onApplyUpdate}
          onApplyAction={onApplyAction}
          entityType={entityType}
          initialMessages={previousMessages}
          historyKey={historyKey}
        />
      </div>
    </aside>
  )
}
