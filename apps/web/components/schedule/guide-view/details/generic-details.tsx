"use client"

import type { ReactNode } from "react"

import { humanizeKey, isPrimitive, KeyValue } from "./task-details"

/*
 * ---------------------------------------------------------------------------
 * Generic fallback renderer for detail types without a semantic component.
 *
 * Renders any JSON-like value as readable, indented key-value lists:
 *
 *   Airline: Air France
 *   Bookings:
 *   • Name: Le Jules Verne
 *     Time: 12:30
 *
 * Nested objects become indented blocks, arrays become bullets, primitives
 * render inline. Key order follows insertion order so output is
 * deterministic. Never falls back to JSON.stringify.
 * ---------------------------------------------------------------------------
 */

export function GenericDetails({ data }: { data: unknown }) {
  if (!hasRenderableValue(data)) {
    return null
  }

  const content = renderValue(data)

  if (content == null) {
    return null
  }

  return <div className="min-w-0 space-y-1">{content}</div>
}

export function hasRenderableValue(value: unknown): boolean {
  if (value == null) {
    return false
  }

  if (typeof value === "string") {
    return value.trim().length > 0
  }

  if (Array.isArray(value)) {
    return value.some(hasRenderableValue)
  }

  if (typeof value === "object") {
    return Object.values(value).some(hasRenderableValue)
  }

  return true
}

function renderValue(value: unknown): ReactNode | null {
  if (value == null) {
    return null
  }

  if (isPrimitive(value)) {
    return <span>{String(value)}</span>
  }

  if (Array.isArray(value)) {
    return renderArray(value)
  }

  if (typeof value === "object") {
    return renderObject(value as Record<string, unknown>)
  }

  return <span>{String(value)}</span>
}

function renderObject(object: Record<string, unknown>): ReactNode {
  const entries = Object.entries(object).filter(([, value]) =>
    hasRenderableValue(value)
  )

  if (entries.length === 0) {
    return null
  }

  return (
    <dl className="min-w-0 space-y-1">
      {entries.map(([key, value]) =>
        isPrimitive(value) ? (
          <KeyValue key={key} label={humanizeKey(key)} value={String(value)} />
        ) : (
          <div key={key} className="min-w-0">
            <dt className="max-w-full wrap-break-word font-medium">
              {humanizeKey(key)}:
            </dt>

            <dd className="ml-1 min-w-0 overflow-hidden border-l pl-3">
              {renderValue(value)}
            </dd>
          </div>
        )
      )}
    </dl>
  )
}

function renderArray(items: unknown[]): ReactNode {
  const present = items.filter(hasRenderableValue)

  if (present.length === 0) {
    return null
  }

  return (
    <ul className="list-disc space-y-1 ps-5 marker:text-muted-foreground">
      {present.map((item, index) => (
        <li key={itemKey(item, index)} className="min-w-0 wrap-break-word">
          {isPrimitive(item) ? (
            String(item)
          ) : (
            <div className="space-y-1">{renderValue(item)}</div>
          )}
        </li>
      ))}
    </ul>
  )
}

function itemKey(item: unknown, index: number) {
  if (typeof item === "object" && item != null && "id" in item) {
    const id = (item as { id?: unknown }).id

    if (typeof id === "string" || typeof id === "number") {
      return String(id)
    }
  }

  return `${typeof item}-${String(item)}-${index}`
}
