"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"

/*
 * ---------------------------------------------------------------------------
 * Entity navigation for chat references.
 *
 * Clicking an entity reference either glows it in place (when its element is
 * already on the current page) or navigates to its page with a ?highlight=
 * parameter that the target page consumes to run the same glow after mount.
 * ---------------------------------------------------------------------------
 */

const HIGHLIGHT_PARAM = "highlight"
/** How long pages keep looking for a highlighted element before giving up. */
const HIGHLIGHT_TIMEOUT_MS = 2500
const HIGHLIGHT_POLL_MS = 100

/**
 * Plays the one-shot attention ring on an element. Re-adding the class is
 * preceded by a reflow read so rapid re-clicks restart the animation.
 */
export function flashGlow(element: HTMLElement) {
  element.classList.remove("glow-flash")
  void element.offsetWidth
  element.classList.add("glow-flash")

  element.addEventListener(
    "animationend",
    () => element.classList.remove("glow-flash"),
    { once: true }
  )
}

/**
 * Scrolls the first element carrying `data-highlight-id={id}` into view and
 * flashes it. Returns false when no such element exists on the page.
 */
export function highlightElement(id: string): boolean {
  const element = document.querySelector<HTMLElement>(
    `[data-highlight-id="${CSS.escape(id)}"]`
  )

  if (element == null) {
    return false
  }

  element.scrollIntoView({ behavior: "smooth", block: "center" })
  flashGlow(element)

  return true
}

export interface EntityTarget {
  /** Parent task id (also the highlight id for plain task references). */
  taskId: string
  /** Present when the reference points at a specific guide step. */
  stepId?: number
}

/**
 * Returns a callback that navigates to (or glows) an entity. The highlight
 * id is the step id for step references, otherwise the task id.
 */
export function useEntityNavigation(scheduleId?: string) {
  const router = useRouter()

  return useCallback(
    (target: EntityTarget) => {
      if (scheduleId == null) {
        return
      }

      const highlightId = String(target.stepId ?? target.taskId)
      const path = `/view/schedule/${scheduleId}/task/${target.taskId}`

      // Already on the target page and the element is rendered -> glow it.
      if (
        window.location.pathname === path &&
        highlightElement(highlightId)
      ) {
        return
      }

      const params = new URLSearchParams({ [HIGHLIGHT_PARAM]: highlightId })

      router.push(`${path}?${params.toString()}`)
    },
    [router, scheduleId]
  )
}

/**
 * Page-side consumer: looks for ?highlight=<id>, waits for the element to
 * appear (views hydrate from localStorage and may switch tabs first), runs
 * the glow once, then strips the parameter so refreshes don't re-flash.
 */
export function useHighlightParam() {
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search)
    const id = initial.get(HIGHLIGHT_PARAM)

    if (id == null) {
      return
    }

    let cancelled = false
    let elapsed = 0

    const stripParam = () => {
      const url = new URL(window.location.href)

      url.searchParams.delete(HIGHLIGHT_PARAM)
      window.history.replaceState(null, "", `${url.pathname}${url.search}`)
    }

    // The element may not exist yet — schedule views hydrate from
    // localStorage and can still be switching tabs — so poll briefly.
    const interval = setInterval(() => {
      elapsed += HIGHLIGHT_POLL_MS

      if (cancelled) {
        clearInterval(interval)

        return
      }

      if (highlightElement(id)) {
        clearInterval(interval)
        stripParam()
      } else if (elapsed > HIGHLIGHT_TIMEOUT_MS) {
        clearInterval(interval)
      }
    }, HIGHLIGHT_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])
}
