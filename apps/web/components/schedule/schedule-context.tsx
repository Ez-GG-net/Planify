"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { getScheduleRepository } from "@/database"
import { IDv1, SchedulePlan } from "@planify/types"

/**
 * Single source of truth for the schedule list.
 *
 * The provider loads schedules itself on mount (so server-rendered HTML
 * never reads localStorage) and exposes mutation helpers that update state
 * and persist in one step. Every consumer â€” sidebar renames, plan view
 * edits, deletion â€” works on the same array, so a change made in one place
 * shows up everywhere immediately.
 */
type ScheduleContextValue = {
  schedules: SchedulePlan[]
  /** True once the first load from storage has settled. */
  isLoaded: boolean
  /** Replaces a plan by id and persists it. */
  updateSchedule: (nextPlan: SchedulePlan) => Promise<void>
  /** Drops a plan from the list and deletes it from storage. */
  removeSchedule: (id: IDv1) => Promise<void>
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null)

export function ScheduleProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [schedules, setSchedules] = useState<SchedulePlan[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load in an effect so the server-rendered HTML never reads localStorage
  // (which only exists in the browser). The setState calls happen inside the
  // async function, not synchronously in the effect body.
  useEffect(() => {
    let cancelled = false

    async function loadSchedules() {
      const result = await getScheduleRepository().getSchedules()

      if (!cancelled) {
        setSchedules(result)
        setIsLoaded(true)
      }
    }

    void loadSchedules()

    return () => {
      cancelled = true
    }
  }, [])

  const updateSchedule = useCallback(
    async (nextPlan: SchedulePlan) => {
      setSchedules((current) =>
        current.map((schedule) =>
          schedule.id === nextPlan.id ? nextPlan : schedule
        )
      )

      await getScheduleRepository().saveSchedule(nextPlan)
    },
    []
  )

  const removeSchedule = useCallback(async (id: IDv1) => {
    setSchedules((current) =>
      current.filter((schedule) => schedule.id !== id)
    )

    await getScheduleRepository().deleteSchedule(id)
  }, [])

  const value = useMemo<ScheduleContextValue>(
    () => ({ schedules, isLoaded, updateSchedule, removeSchedule }),
    [schedules, isLoaded, updateSchedule, removeSchedule]
  )

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedules() {
  const context = useContext(ScheduleContext)

  if (!context) {
    throw new Error("useSchedules must be used within ScheduleProvider")
  }

  return context
}
