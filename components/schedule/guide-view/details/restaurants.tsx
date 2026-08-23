"use client"

import { DetailSection } from "./task-details"
import { GenericDetails } from "./generic-details"

/*
 * ---------------------------------------------------------------------------
 * Restaurants detail: time-keyed dining reservations.
 *
 * Expected shape (free-form data, parsed defensively):
 *   [{ name: string, time?: string, notes?: string, ... }]
 *
 * Rendered like:
 *   • 12:30 · Le Jules Verne
 *     Notes: Michelin star
 * ---------------------------------------------------------------------------
 */

interface RestaurantEntry {
  time?: string
  name?: string
  extras: Record<string, unknown>
}

function validString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined
}

function parseEntry(value: unknown): RestaurantEntry | null {
  if (typeof value === "string") {
    return { name: value, extras: {} }
  }

  if (typeof value !== "object" || value == null) {
    return null
  }

  const record = value as Record<string, unknown>
  const extras = Object.fromEntries(
    Object.entries(record).filter(
      ([key, fieldValue]) =>
        fieldValue != null &&
        !(key === "name" && validString(record.name) != null) &&
        !(key === "time" && validString(record.time) != null)
    )
  )

  return {
    time: validString(record.time),
    name: validString(record.name),
    extras,
  }
}

export function Restaurants({ value }: { value: unknown }) {
  const entries = (Array.isArray(value) ? value : [value])
    .map(parseEntry)
    .filter(
      (entry): entry is RestaurantEntry =>
        entry != null &&
        (entry.name != null || entry.time != null || Object.keys(entry.extras).length > 0)
    )

  if (entries.length === 0) {
    return (
      <DetailSection title="Restaurants">
        <GenericDetails data={value} />
      </DetailSection>
    )
  }

  return (
    <DetailSection title="Restaurants">
      <ul className="space-y-2">
        {entries.map((entry, index) => (
          <li
            key={`${entry.time ?? "untimed"}-${entry.name ?? "unnamed"}-${index}`}
            className="min-w-0 wrap-break-word"
          >
            <p>
              {entry.time != null && (
                <span className="font-medium">{entry.time}</span>
              )}
              {entry.time != null && entry.name != null && (
                <span aria-hidden="true"> · </span>
              )}
              {entry.name != null && <span>{entry.name}</span>}
            </p>

            {Object.keys(entry.extras).length > 0 && (
              <div className="mt-0.5 text-muted-foreground">
                <GenericDetails data={entry.extras} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </DetailSection>
  )
}
