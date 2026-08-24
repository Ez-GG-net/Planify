"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar"
import { ScheduleProvider } from "@/components/schedule/schedule-context"
import { AppSidebar } from "@/components/app-sidebar"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { PanelLeftIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Desktop hover-reveal layer + mobile edge-swipe gesture.
 *
 * Lives inside SidebarProvider because the swipe needs `setOpenMobile`
 * from context. Renders nothing while the sidebar is pinned.
 */
function SidebarHoverLayer({
  pinned,
  hovered,
  onHoveredChange,
  onPin,
}: {
  pinned: boolean
  hovered: boolean
  onHoveredChange: (hovered: boolean) => void
  onPin: () => void
}) {
  const { setOpenMobile } = useSidebar()
  const isMobile = useIsMobile()

  // Mobile: treat a rightward swipe that starts at the left edge of the
  // screen as a request to open the sidebar sheet.
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!isMobile) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStart.current =
        touch.clientX < 24 ? { x: touch.clientX, y: touch.clientY } : null
    }

    const handleTouchMove = (e: TouchEvent) => {
      const start = touchStart.current
      if (!start) return
      const touch = e.touches[0]
      const dx = touch.clientX - start.x
      const dy = Math.abs(touch.clientY - start.y)
      if (dx > 48 && dy < 72) {
        touchStart.current = null
        setOpenMobile(true)
      }
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
    }
  }, [isMobile, setOpenMobile])

  return (
    <>
      {/* Left-edge hover strip: reveal the sidebar on hover, pin on click.
          Unmounts while revealed so the sliding sidebar can't flicker it. */}
      {!isMobile && !pinned && !hovered && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Show sidebar"
          title="Show sidebar"
          onClick={onPin}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onPin()
            }
          }}
          onMouseEnter={() => onHoveredChange(true)}
          onFocus={() => onHoveredChange(true)}
          className="fixed inset-y-0 left-0 z-20 hidden w-1.5 cursor-pointer transition-colors hover:bg-sidebar-accent/60 focus-visible:bg-sidebar-accent md:block"
        />
      )}
    </>
  )
}

/**
 * Top bar for the main content area. Lives in normal flow inside
 * SidebarInset, so it pushes page content down instead of floating over it.
 * Its left padding follows the pinned sidebar so the toggle button stays
 * visible just to the right of it.
 */
function SiteHeader({ pinned }: { pinned: boolean }) {
  const { toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()

  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center border-b bg-background transition-[padding] duration-200 ease-in-out",
        !isMobile && pinned ? "pl-[calc(var(--sidebar-width)+0.75rem)]" : "pl-3"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
      >
        <PanelLeftIcon className="static" />
      </Button>
    </header>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isMobile = useIsMobile()

  // Desktop sidebar state: `pinned` keeps it open permanently (the current
  // behavior); `hovered` is the temporary reveal from the edge strip.
  const [pinned, setPinned] = useState(true)
  const [hovered, setHovered] = useState(false)

  /* Schedule data loading and mutation live in <ScheduleProvider> —
   * the sidebar, plan pages, and this layout all read one source. */

  const open = pinned || hovered

  // Ctrl/Cmd+B (and the top-bar toggle) route through here. On desktop this
  // pins/unpins; on mobile toggleSidebar controls the sheet directly.
  const handleOpenChange = useCallback((next: boolean) => {
    if (next) {
      setPinned(true)
    } else {
      setPinned(false)
      setHovered(false)
    }
  }, [])

  const handleSidebarMouseLeave = useCallback(() => {
    // Only affects the temporary reveal; harmless when pinned (hovered is
    // already false then).
    setHovered(false)
  }, [])

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <SidebarHoverLayer
        pinned={pinned}
        hovered={hovered}
        onHoveredChange={setHovered}
        onPin={() => setPinned(true)}
      />
      <ScheduleProvider>
        <AppSidebar
          onCreateSchedule={() => router.push("/new/schedule/")}
          revealed={hovered}
          onMouseLeave={isMobile ? undefined : handleSidebarMouseLeave}
        />

        <SidebarInset>
          <SiteHeader pinned={pinned} />
          {children}
        </SidebarInset>
      </ScheduleProvider>
    </SidebarProvider>
  )
}
