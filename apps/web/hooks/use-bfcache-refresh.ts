"use client";

import { useEffect, useState } from "react";

/**
 * Returns a version counter that increments when the page is restored
 * from the browser's back-forward cache (bfcache). Use the returned
 * value as a React key or useEffect dependency to force fresh data
 * loads after the browser restores a frozen page.
 *
 * Without this, useEffect(() => {}, []) hooks never re-fire on
 * bfcache restore — the browser paints the stale snapshot directly.
 */
export function useBfcacheRefresh(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        setVersion((v) => v + 1);
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return version;
}
