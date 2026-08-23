"use client"

import { DetailSection } from "./task-details"
import { GenericDetails } from "./generic-details"

/*
 * ---------------------------------------------------------------------------
 * Location detail.
 *
 * Owns the entire presentation of `location` values so a map interaction can
 * be added here later without touching the detail renderer or other
 * sections. Today: the venue name prominent, remaining fields generic.
 * ---------------------------------------------------------------------------
 */

export function Location({ value }: { value: unknown }) {
  const name = extractLocationName(value)
  const extras = extractExtraFields(value)

  return (
    <DetailSection title="Location">
      {name != null && <p className="max-w-full wrap-break-word font-medium">{name}</p>}

      {extras != null && (
        <div className={name != null ? "mt-1 text-muted-foreground" : ""}>
          <GenericDetails data={extras} />
        </div>
      )}

      {name == null && extras == null && (
        <p className="text-muted-foreground">No location information.</p>
      )}
    </DetailSection>
  )
}

function extractLocationName(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value
  }

  if (typeof value !== "object" || value == null) {
    return null
  }

  const name = (value as Record<string, unknown>).name

  if (typeof name === "string" && name.trim()) {
    return name
  }

  if (name !== value) {
    return extractLocationName(name)
  }

  return null
}

function extractExtraFields(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value == null) {
    return null
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key, fieldValue]) => key !== "name" && fieldValue != null
  )

  return entries.length > 0 ? Object.fromEntries(entries) : null
}
