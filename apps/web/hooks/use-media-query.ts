import * as React from "react"

/**
 * Tracks whether a CSS media query currently matches.
 * Uses useSyncExternalStore so updates are instant, hydration-safe,
 * and never cause a flash of the wrong view.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onStoreChange)
      return () => mql.removeEventListener("change", onStoreChange)
    },
    [query]
  )

  const getSnapshot = React.useCallback(
    () => window.matchMedia(query).matches,
    [query]
  )

  function getServerSnapshot() {
    return false
  }

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
