"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { Check, ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getScheduleRepository } from "@/database"
import {
  minutesToDurationLabel,
  minutesToTimeLabel,
} from "@/lib/task/task-time"
import { generateTaskGuide } from "@/lib/api/task-guide"
import { TaskGuideElement } from "@/components/schedule/guide-view/task-guide"
import { AIChatPanel } from "@/components/chat/ai-chat-panel"
import { useHighlightParam } from "@/lib/chat/entity-navigation"
import { guideChatKey } from "@/lib/chat/chat-storage"
import {
  AIChatPendingAction,
  AIChatUpdate,
  SchedulePlan,
  SchedulePlanTask,
  TaskGuide,
} from "@planify/types"
import { applyPendingAction } from "@/lib/ai/apply-pending-action"

async function findTask(
  scheduleId: string,
  taskId: string
): Promise<{ plan: SchedulePlan; task: SchedulePlanTask } | null> {
  const plan = await getScheduleRepository().getSchedule(scheduleId)

  if (plan == null) {
    return null
  }

  const task = [...plan.tasks, ...plan.preTasks].find(
    (currentTask) => currentTask.id === taskId
  )

  return task == null ? null : { plan, task }
}

function persistPlan(plan: SchedulePlan) {
  return getScheduleRepository().saveSchedule(plan)
}

export default function TaskGuidePage() {
  const params = useParams<{ id: string; tid: string }>()

  /*
   * Consumes ?highlight=<id> after mount: glows a guide step (or this
   * task itself) when arriving from an entity reference elsewhere.
   */
  useHighlightParam()

  const [hydrated, setHydrated] = useState(false)
  const [plan, setPlan] = useState<SchedulePlan | null>(null)
  const [task, setTask] = useState<SchedulePlanTask | null>(null)
  const [guide, setGuide] = useState<TaskGuide | null>(null)

  const [loadingGuide, setLoadingGuide] = useState(false)
  const [guideError, setGuideError] = useState<{ message: string; code?: string } | null>(null)
  const [guideRequestId, setGuideRequestId] = useState(0)
  const [currentStepNum, setCurrentStepNum] = useState(0)

  const router = useRouter()

  /*
   * Load the schedule from localStorage after hydration.
   */
  useEffect(() => {
    let cancelled = false

    async function loadTask() {
      const result = await findTask(params.id, params.tid)

      if (!cancelled) {
        setPlan(result?.plan ?? null)
        setTask(result?.task ?? null)
        setHydrated(true)
      }
    }

    void loadTask()

    return () => {
      cancelled = true
    }
  }, [params.id, params.tid])

  /*
   * Load the existing guide or generate a new one.
   */
  useEffect(() => {
    if (!hydrated || plan == null) {
      return
    }

    if (task == null) {
      return
    }

    let cancelled = false

    async function loadGuide() {
      if (task == null) return

      if (task.guide != null) {
        setGuide(task.guide)
        setGuideError(null)
        setLoadingGuide(false)
        return
      }

      try {
        setLoadingGuide(true)
        setGuideError(null)

        const generatedGuide = await generateTaskGuide(task)

        if (cancelled) {
          return
        }
        if (plan == undefined) return

        /*
         * Attach the generated guide to the task.
         */
        const nextPlan: SchedulePlan = {
          ...plan,

          tasks: plan.tasks.map((currentTask) =>
            currentTask.id === task.id
              ? {
                  ...currentTask,
                  guide: generatedGuide,
                }
              : currentTask
          ),

          preTasks: plan.preTasks.map((currentTask) =>
            currentTask.id === task.id
              ? {
                  ...currentTask,
                  guide: generatedGuide,
                }
              : currentTask
          ),
        }

        /*
         * Update React state.
         */
        setPlan(nextPlan)
        setTask((currentTask) =>
          currentTask == null
            ? null
            : { ...currentTask, guide: generatedGuide }
        )
        setGuide(generatedGuide)

        /*
         * Persist the guide inside SCHEDULES.
         */
        await persistPlan(nextPlan)
      } catch (error) {
        console.error("Failed to generate task guide:", error)

        if (!cancelled) {
          setGuideError({
            message:
              error instanceof Error
                ? error.message
                : "We couldn't generate a guide for this task. Please try again.",
            code: error instanceof Error ? (error.cause as string) : undefined,
          })
        }
      } finally {
        if (!cancelled) {
          setLoadingGuide(false)
        }
      }
    }

    loadGuide()

    return () => {
      cancelled = true
    }
  }, [hydrated, plan, task, params.tid, guideRequestId])

  /*
   * Toggle completion for a guide step.
   *
   * The updated guide is saved inside the SchedulePlan task,
   * so completion survives a page refresh.
   */
  async function toggleGuideStep(stepId: TaskGuide["steps"][number]["id"]) {
    if (plan == null || task == null || guide == null) {
      return
    }

    const updatedGuide: TaskGuide = {
      ...guide,

      steps: guide.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              completedAt: step.completedAt
                ? undefined
                : new Date().toISOString(),
            }
          : step
      ),
    }

    const nextPlan: SchedulePlan = {
      ...plan,

      tasks: plan.tasks.map((task) =>
        task.id === params.tid
          ? {
              ...task,
              guide: updatedGuide,
            }
          : task
      ),

      preTasks: plan.preTasks.map((task) =>
        task.id === params.tid
          ? {
              ...task,
              guide: updatedGuide,
            }
          : task
      ),
    }

    setGuide(updatedGuide)
    setPlan(nextPlan)
    setTask((currentTask) =>
      currentTask == null ? null : { ...currentTask, guide: updatedGuide }
    )

    await persistPlan(nextPlan)
  }

  /*
   * Toggle the task's own completedAt — independent of guide step completion.
   * Only available when a guide has been generated.
   */
  async function toggleTaskCompletion() {
    if (plan == null || task == null) {
      return
    }

    const completedAt = task.completedAt ? undefined : new Date().toISOString()

    const nextPlan: SchedulePlan = {
      ...plan,

      tasks: plan.tasks.map((currentTask) =>
        currentTask.id === task.id
          ? { ...currentTask, completedAt }
          : currentTask
      ),

      preTasks: plan.preTasks.map((currentTask) =>
        currentTask.id === task.id
          ? { ...currentTask, completedAt }
          : currentTask
      ),
    }

    setPlan(nextPlan)
    setTask((currentTask) =>
      currentTask == null ? null : { ...currentTask, completedAt }
    )

    await persistPlan(nextPlan)
  }

  /*
   * Apply AI-suggested changes to a task or pre-task.
   *
   * Only updates scoped to this view's entity type are accepted, and only
   * the fields the assistant actually returned are changed; the remaining
   * fields keep their current values. Guide changes are never applied here.
   */
  async function handleApplyUpdate(update: AIChatUpdate) {
    if (plan == null || task == null) {
      return
    }
    if (update.entityType !== "task" && update.entityType !== "pre-task") {
      return
    }

    if (update.action.type !== "update_task") {
      return
    }

    const { taskId, changes } = update.action

    const apply = (list: SchedulePlanTask[]): SchedulePlanTask[] =>
      list.map((currentTask) => {
        if (currentTask.id !== taskId) {
          return currentTask
        }

        return {
          ...currentTask,
          title: changes.title ?? currentTask.title,
          date: changes.date ?? currentTask.date,
          startTime: changes.startTime ?? currentTask.startTime,
          estimatedDuration:
            changes.estimatedDuration ?? currentTask.estimatedDuration,
        }
      })

    const next: SchedulePlan = {
      ...plan,
      tasks: apply(plan.tasks),
      preTasks: apply(plan.preTasks),
    }

    setPlan(next)
    await persistPlan(next)
  }
  async function handleApplyAction(
  action: AIChatPendingAction
): Promise<boolean> {
  if (plan == null || task == null) {
    return false
  }

  const nextPlan = applyPendingAction(plan, action, "task")

  if (nextPlan == null) {
    return false
  }

  await persistPlan(nextPlan)

  const updatedTask = [...nextPlan.tasks, ...nextPlan.preTasks].find(
    (currentTask) => currentTask.id === task.id
  )

  setPlan(nextPlan)
  setTask(updatedTask ?? null)
  setGuide(updatedTask?.guide ?? null)

  return true
}
  /*
   * Don't render anything that depends on localStorage until
   * the browser has hydrated.
   */
  if (!hydrated) {
    return <TaskGuidePageSkeleton />
  }

  if (plan == null) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="text-sm text-muted-foreground">Task not found.</p>
      </main>
    )
  }

  if (task == null) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <p className="text-sm text-muted-foreground">Task not found.</p>
      </main>
    )
  }

  return (
    <div className="flex w-full flex-col lg:flex-row">
      <main
        className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 py-6"
        data-highlight-id={task.id}
      >
        {/* Back */}
        <Link
          href={`/view/schedule/${plan.id}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to {plan.title}
        </Link>

        {/* Task information */}
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight">
            {task.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {task.date != null && (
              <span>
                {format(
                  new Date(`${task.date}T00:00:00`),
                  "EEEE, MMMM d, yyyy"
                )}
              </span>
            )}

            {task.date != null && task.startTime != null && (
              <span aria-hidden="true">·</span>
            )}

            {task.startTime != null && (
              <span>{minutesToTimeLabel(task.startTime)}</span>
            )}

            {(task.date != null || task.startTime != null) &&
              task.estimatedDuration != null && (
                <span aria-hidden="true">·</span>
              )}

            {task.estimatedDuration != null && (
              <span>{minutesToDurationLabel(task.estimatedDuration)}</span>
            )}
          </div>
        </header>

        {/* Guide loading */}
        {loadingGuide && <TaskGuideSkeleton />}

        {/* Guide error */}
        {guideError != null && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-5">
            <h2 className="font-medium">Unable to generate guide</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {guideError.message}
            </p>

            {guideError.code !== "quota_exceeded" && (
              <button
                type="button"
                className="mt-4 text-sm font-medium underline underline-offset-4"
                onClick={() => {
                  setGuide(null)
                  setGuideError(null)
                  setGuideRequestId((id) => id + 1)
                }}
              >
                Try again
              </button>
            )}
          </div>
        )}

        {/* Generated guide */}
        {guide != null && !loadingGuide && (
          <TaskGuideElement
            guide={guide}
            taskDetails={task.details}
            onToggleStep={toggleGuideStep}
            onStepChange={setCurrentStepNum}
          />
        )}

        {/* Mark task as complete — only shown when a guide exists */}
        {guide != null && !loadingGuide && (
          <div className="mt-6">
            <Button
              variant={task.completedAt ? "outline" : "default"}
              disabled={!task.completedAt && !guide.steps.every((s) => s.completedAt)}
              onClick={() => {
                toggleTaskCompletion()
                router.push(`/view/schedule/${plan.id}`)
              }}
            >
              {task.completedAt ? (
                <>
                  <Check className="size-4" />
                  Completed
                </>
              ) : (
                "Mark as complete"
              )}
            </Button>
          </div>
        )}
      </main>

      {/* Chat panel — persisted per task so navigating between the
          schedule and this page keeps the guide conversation. */}
      {guide != null && !loadingGuide && (
        <AIChatPanel
          context={{
            entityType: "task-guide",
            schedule: plan,
            currentTask: task,
            currentGuide: guide,
            currentStepNum: guide.steps[currentStepNum]?.id,
          }}
          onApplyUpdate={handleApplyUpdate}
          onApplyAction={handleApplyAction}
          entityType="task-guide"
          previousMessages={[]}
          historyKey={guideChatKey(plan.id, task.id)}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Loading states                                                             */
/* -------------------------------------------------------------------------- */

function TaskGuidePageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <Skeleton className="h-5 w-32" />

      <div className="space-y-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <TaskGuideSkeleton />
    </main>
  )
}

function TaskGuideSkeleton() {
  return (
    <div className="space-y-10">
      {/* Overview */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/2" />

        <div className="rounded-xl border p-5">
          <Skeleton className="mb-3 h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />

            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-5 w-16" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
