"use client"

import type { ReactNode } from "react"

import {
  DetailSection,
  humanizeKey,
  TaskDetails,
} from "./details/task-details"
import { GenericDetails, hasRenderableValue } from "./details/generic-details"
import { Location } from "./details/location"
import { Notes } from "./details/notes"
import { Restaurants } from "./details/restaurants"

/*
 * ---------------------------------------------------------------------------
 * TaskGuideDetails — orchestrator for a task's free-form `details` record.
 *
 * Known detail types get semantic components (each owning its presentation
 * and future interactions); unknown keys fall through to the generic
 * renderer in original insertion order:
 *
 *   <TaskDetails>
 *     <Location />
 *     <Notes />
 *     <Restaurants />
 *     <DetailSection><GenericDetails /></DetailSection>  // fallbacks
 *   </TaskDetails>
 * ---------------------------------------------------------------------------
 */

/**
 * Detail types with dedicated semantic components. Each owns its
 * presentation and future interactions; every other key falls through to
 * the generic renderer in original insertion order.
 */
const SEMANTIC_COMPONENTS: Record<
  string,
  (props: { value: unknown }) => ReactNode
> = {
  location: Location,
  notes: Notes,
  restaurants: Restaurants,
}

export default function TaskGuideDetails({
  details,
}: {
  details: Record<string, unknown> | undefined
}) {
  if (details == null) {
    return null
  }

  const entries = Object.entries(details).filter(([, value]) =>
    hasRenderableValue(value)
  )

  if (entries.length === 0) {
    return null
  }

  return (
    <TaskDetails>
      {entries.map(([key, value]) => {
        const Semantic = SEMANTIC_COMPONENTS[key]

        if (Semantic != null) {
          return <Semantic key={key} value={value} />
        }

        return (
          <DetailSection key={key} title={humanizeKey(key)}>
            <GenericDetails data={value} />
          </DetailSection>
        )
      })}
    </TaskDetails>
  )
}
