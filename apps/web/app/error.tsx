"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Global error boundary — catches unhandled errors that propagate past
 * route-level error.tsx files. Renders a recovery UI instead of Next.js's
 * default white-screen overlay.
 *
 * The `reset` prop re-renders the failing segment, giving the user a way
 * to retry without a full page reload.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
