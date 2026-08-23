"use client"

import type { ReactNode } from "react"

/*
 * ---------------------------------------------------------------------------
 * Shared building blocks for task detail sections.
 *
 * TaskGuideDetails composes semantic components (Location, Notes,
 * Restaurants, ...) inside a single "Details" card. Every component owns the
 * presentation of its detail type and renders itself as a DetailSection so
 * all sections stay visually consistent.
 * ---------------------------------------------------------------------------
 */

export function TaskDetails({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="task-details-heading">
      <div className="space-y-4 rounded-xl border bg-muted/40 p-5">
        <h2
          id="task-details-heading"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Details
        </h2>

        {children}
      </div>
    </section>
  )
}

export function DetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>

      <div className="min-w-0 text-sm leading-6">{children}</div>
    </div>
  )
}

/**
 * A single bold-label row: "**Name**: Épicure".
 */
export function KeyValue({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-2">
      <dt className="min-w-0 wrap-break-word font-medium">{label}:</dt>
      <dd className="min-w-0 wrap-break-word">{value}</dd>
    </div>
  )
}

/** "estimatedFlightTime" -> "Estimated Flight Time". */
export function humanizeKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase())
}

export function isPrimitive(
  value: unknown
): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
}
