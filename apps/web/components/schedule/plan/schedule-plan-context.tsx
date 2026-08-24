"use client"

import { createContext, useContext, type ReactNode } from "react"

import { IDv1, SchedulePlanTask } from "@planify/types"

/**
 * Everything the schedule-plan subtree needs to render tasks and flip their
 * completion state. Provided once by SchedulePlanView so day views, task
 * rows, and the preparation accordion stop receiving the same values as
 * drilled props.
 */
export interface SchedulePlanListValue {
  /** Main schedule tasks (not pre-tasks). */
  tasks: SchedulePlanTask[]
  /** Preparation tasks shown before the main schedule unlocks. */
  preTasks: SchedulePlanTask[]
  /** Ids of completed tasks across both lists. */
  completedIds: Set<string>
  /** First uncompleted main task — the scroll/focus target. */
  focusTaskId: string | null
  planId: IDv1
  /** Flips a task's completion and persists the plan. */
  toggleTask: (taskId: string) => void
}

const SchedulePlanListContext =
  createContext<SchedulePlanListValue | null>(null)

export function SchedulePlanListProvider({
  value,
  children,
}: {
  value: SchedulePlanListValue
  children: ReactNode
}) {
  return (
    <SchedulePlanListContext.Provider value={value}>
      {children}
    </SchedulePlanListContext.Provider>
  )
}

/** Access the enclosing schedule plan's tasks and completion controls. */
export function useSchedulePlanList(): SchedulePlanListValue {
  const value = useContext(SchedulePlanListContext)

  if (!value) {
    throw new Error(
      "useSchedulePlanList must be used within a SchedulePlanListProvider"
    )
  }

  return value
}
