"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import type { CSSProperties } from "react"
import { motion } from "motion/react"
import { useDrag } from "@use-gesture/react"

import { cn } from "@/lib/utils"
import { getSetting, setSetting } from "@/lib/storage"
import { useIsMobile } from "@/hooks/use-mobile"
import type {
  AIChatUserMessageContext,
  AIChatEntityType,
  AIChatMessage,
  AIChatPendingAction,
  AIChatUpdate,
} from "@planify/types"

import { AIChat } from "./ai-chat"
import { AIOpenLaunchers } from "./ai-open-lips"

const DEFAULT_WIDTH = 550
const MIN_WIDTH = 320
const MAX_WIDTH = 1000

/*
 * Persisted drawer width. localStorage is an external store, so the width is
 * read through useSyncExternalStore: settings restore after hydration without
 * an effect, and any write announces itself so the store re-reads. The server
 * snapshot is the default, which is what SSR renders.
 */
type WidthListener = () => void

const widthListeners = new Set<WidthListener>()

function subscribeChatWidth(listener: WidthListener) {
  widthListeners.add(listener)

  return () => {
    widthListeners.delete(listener)
  }
}

function readChatWidth(): number {
  if (typeof window === "undefined") {
    return DEFAULT_WIDTH
  }

  return getSetting<number>("TASK_GUIDE_CHAT_WIDTH") || DEFAULT_WIDTH
}

function writeChatWidth(nextWidth: number) {
  setSetting("TASK_GUIDE_CHAT_WIDTH", nextWidth)
  // Notify all subscribers that the width has changed, so they can re-read it.
  widthListeners.forEach((listener) => listener())
}

/*
 * Breakpoint that swaps the drawer's geometry: a resizable right-hand column
 * on desktop, a full-width bottom sheet below that. Shared with the rest of
 * the app via useIsMobile (768px), whose own getServerSnapshot keeps server
 * and first client paint in agreement to avoid a hydration mismatch.
 */

/*
 * The drawer's geometry depends on the breakpoint, so it is rendered only after
 * the client has resolved it. This keeps the server/first paint from briefly
 * positioning the sheet for the wrong axis during hydration.
 */
function subscribeMounted() {
  return () => {}
}

function readMounted() {
  return true
}

function readMountedServer() {
  return false
}

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
  const [isOpen, setIsOpen] = useState(false)
  const width = useSyncExternalStore(
    subscribeChatWidth,
    readChatWidth,
    () => DEFAULT_WIDTH,
  )
  const isDesktop = !useIsMobile()
  const mounted = useSyncExternalStore(
    subscribeMounted,
    readMounted,
    readMountedServer,
  )
  const drawerRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)

  /* Width at the start of a resize drag. */
  const startWidthRef = useRef(DEFAULT_WIDTH)

  /*
   * Close on Escape once the drawer is visible.
   */
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  function clampWidth(nextWidth: number) {
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, nextWidth))
  }

  /*
   * Resize by dragging the handle sticking out of the drawer's left edge.
   * `touch-action: none` keeps the drag from racing the cursor or scrolling;
   * userSelect is disabled for the duration of the drag.
   */
  useDrag(
    ({ first, last, movement: [mx] }) => {
      if (first) {
        startWidthRef.current = width
        document.body.style.userSelect = "none"
      }

      writeChatWidth(clampWidth(startWidthRef.current - mx))

      if (last) {
        document.body.style.userSelect = ""
      }
    },
    {
      target: resizeRef,
      axis: "x",
      filterTaps: true,
      touchAction: "none",
      pointer: { capture: true },
    },
  )

  if (!mounted) {
    return null
  }

  return (
    <>
      {!isOpen && <AIOpenLaunchers onOpen={() => setIsOpen(true)} />}

      {/* Overlay backdrop — mobile only, tap to dismiss. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat drawer — always mounted so the spring animates both ways; `inert`
          (plus pointer-events/translate) keeps the closed state out of sight and
          out of tab order. A full-width, half-height bottom sheet on mobile; the
          resizable 320-1000px column on desktop. */}
      <motion.div
        ref={drawerRef}
        initial={false}
        animate={
          isDesktop
            ? { x: isOpen ? "0%" : "100%", y: 0 }
            : { x: 0, y: isOpen ? "0%" : "100%" }
        }
        transition={{ type: "spring", stiffness: 380, damping: 42 }}
        role="complementary"
        aria-label="AI chat"
        inert={!isOpen}
        className={cn(
          "fixed z-40 flex flex-col",
"inset-x-0 bottom-0 h-3/4 rounded-t-2xl",
"bg-background/60 backdrop-blur-md backdrop-saturate-150",
"border border-white/10 shadow-2xl",
          "md:inset-x-auto md:inset-y-0 md:right-0 md:left-auto md:h-auto md:w-(--chat-width) md:rounded-none",
          isOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        style={
          {
            "--chat-width": `${width}px`,
          } as CSSProperties
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <AIChat
            context={context}
            onApplyUpdate={onApplyUpdate}
            onApplyAction={onApplyAction}
            entityType={entityType}
            initialMessages={previousMessages}
            historyKey={historyKey}
            onClose={() => setIsOpen(false)}
          />
        </div>

        {/* Drag handle */}
        <div
          ref={resizeRef}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat panel"
          aria-valuenow={width}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          tabIndex={0}
          onKeyDown={(event) => {
            let nextWidth: number | null = null

            if (event.key === "ArrowLeft") {
              nextWidth = width - 16
            } else if (event.key === "ArrowRight") {
              nextWidth = width + 16
            }

            if (nextWidth != null) {
              event.preventDefault()
              writeChatWidth(clampWidth(nextWidth))
            }
          }}
          className="group absolute inset-y-0 left-0 z-10 hidden w-3 -translate-x-1/2 cursor-col-resize outline-none select-none focus-visible:bg-foreground/10 md:block"
          style={{ touchAction: "none" }}
        >
          <div
            aria-hidden
            className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-foreground/30 group-focus-visible:bg-foreground/40"
          />
        </div>
      </motion.div>
    </>
  )
}