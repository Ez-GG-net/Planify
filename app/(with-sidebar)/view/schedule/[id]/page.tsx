"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

import { useSchedules } from "@/components/schedule/schedule-context"
import SchedulePlanView from "@/components/schedule/plan/schedule-plan-view"
import { Skeleton } from "@/components/ui/skeleton"

export default function ScheduleDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  /*
   * The provider owns the schedule list; deriving the active plan from it
   * (no local copy) means sidebar renames and edits re-render this view
   * without remounting.
   */
  const { schedules, isLoaded, updateSchedule } = useSchedules()
  const plan = schedules.find((schedule) => schedule.id === params.id)

  if (!isLoaded) {
    return (
      <main className="m-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </main>
    )
  }

  if (!plan) {
    return (
      <main className="m-4">
        <p className="text-sm text-muted-foreground">Schedule not found.</p>
      </main>
    )
  }

  return (
    <div className="min-w-6">
      {/* key keeps tab/chat state per plan; renames only re-render */}
      <SchedulePlanView
        key={plan.id}
        plan={plan}
        onPlanChange={updateSchedule}
      />
    </div>
  )
}
