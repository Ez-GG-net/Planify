"use client"

import { useRef } from "react"
import { motion, useMotionValue, useSpring } from "motion/react"
import { useDrag } from "@use-gesture/react"
import { BotMessageSquare, BotMessageSquareIcon } from "lucide-react"

/* How far the mobile tab trails the finger while being pulled left. */
const TAB_PULL_TRACK = 48
/* Horizontal pull distance that counts as "pull left to open". */
const TAB_OPEN_THRESHOLD = 36

/*
 * Desktop launcher: a square, rounded button docked to the bottom-right
 * corner, the familiar AI-chat affordance. Matches the mobile launcher's
 * background surface; hover scale, opens on click or keyboard.
 */
function DesktopChatFab({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label="Open chat"
      title="Open chat"
      onClick={onOpen}
      className="fixed right-6 bottom-6 z-30 hidden size-14 cursor-pointer items-center justify-center rounded-2xl border bg-background text-foreground shadow-lg transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 md:flex"
    >
      <BotMessageSquare className="size-6" aria-hidden />
    </button>
  )
}

/*
 * Mobile launcher: a "✦" tab docked to the bottom-right corner. Tapping it
 * opens the sheet; pulling it left springs it after the finger and opens past
 * a short threshold.
 */
function MobileChatTab({ onOpen }: { onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 400, damping: 40 })

  useDrag(
    ({ down, movement: [mx], last, tap }) => {
      if (down) {
        x.set(Math.min(0, Math.max(mx, -TAB_PULL_TRACK)))
      } else if (last) {
        x.set(0)
        if (tap || mx <= -TAB_OPEN_THRESHOLD) {
          onOpen()
        }
      }
    },
    { target: ref, axis: "x", touchAction: "pan-y", from: [0, 0] },
  )

  return (
    <motion.div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label="Open chat"
      title="Open chat"
      style={{ x: springX }}
      onClick={onOpen}
      className="fixed right-0 bottom-6 z-30 flex cursor-pointer touch-pan-y items-center rounded-l-xl border border-r-0 bg-background px-3 py-5 text-foreground shadow-lg select-none md:hidden"
    >
      <span aria-hidden className="text-lg leading-none">
        <BotMessageSquareIcon className="size-6" />
      </span>
    </motion.div>
  )
}

/**
 * Launchers for the AI chat overlay: a desktop floating button (bottom-right)
 * and a mobile tab. Rendered only while the chat is closed.
 */
export function AIOpenLaunchers({ onOpen }: { onOpen: () => void }) {
  return (
    <>
      <DesktopChatFab onOpen={onOpen} />
      <MobileChatTab onOpen={onOpen} />
    </>
  )
}