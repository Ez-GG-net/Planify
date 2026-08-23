"use client"

import { DetailSection } from "./task-details"
import { GenericDetails } from "./generic-details"

/*
 * ---------------------------------------------------------------------------
 * Notes detail: a free-text remark (string) or a list of remarks.
 * ---------------------------------------------------------------------------
 */

export function Notes({ value }: { value: unknown }) {
  const notes = Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((note) => note.trim())
        .filter(Boolean)
    : null

  if (typeof value === "string" && value.trim().length === 0) {
    return null
  }

  if (Array.isArray(value) && notes?.length === 0) {
    return null
  }

  return (
    <DetailSection title="Notes">
      {typeof value === "string" ? (
        <p className="wrap-break-word">{value.trim()}</p>
      ) : notes != null ? (
        <ul className="list-disc space-y-1 ps-5 marker:text-muted-foreground">
          {notes.map((note, index) => (
            <li className="ml-1 wrap-break-word" key={`${note}-${index}`}>{note}</li>
          ))}
        </ul>
      ) : (
        <GenericDetails data={value} />
      )}
    </DetailSection>
  )
}
