"use client"

import { useCallback, useMemo, useState } from "react"
import { format } from "date-fns"
import { Check, Lock } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { applyPendingAction } from "@/lib/ai/apply-pending-action"
import type { AIChatScope } from "@planify/types"
import { useHighlightParam } from "@/lib/chat/entity-navigation"
import { scheduleChatKey } from "@/lib/chat/chat-storage"
import { compareTasks } from "@/lib/task/task-state"
import { AIChatPanel } from "@/components/chat/ai-chat-panel"
import {
  AIChatPendingAction,
  AIChatUpdate,
  SchedulePlan,
  SchedulePlanTask,
} from "@planify/types"
import { MobileTaskDayView } from "./mobile.task-day-view"
import { PreTaskAccordion } from "./pre-task-accordion"
import { TaskDayColumns } from "./desktop.task-day-columns"
import {
  SchedulePlanListProvider,
  type SchedulePlanListValue,
} from "./schedule-plan-context"

interface SchedulePlanViewProps {
  plan: SchedulePlan,
  onPlanChange: (nextPlan: SchedulePlan) => Promise<void>
}

export default function SchedulePlanView({ plan, onPlanChange }: SchedulePlanViewProps) {


  const tasks = plan.tasks
  const preTasks = plan.preTasks


  const completedIds = useMemo(
    () =>
      new Set(
        [...tasks, ...preTasks]
          .filter((task) => task.completedAt)
          .map((task) => task.id)
      ),
    [tasks, preTasks]
  )

  const sortedTasks = useMemo(() => [...tasks].sort(compareTasks), [tasks])

  // The first uncompleted task in chronological order is the scroll target,
  // even when it is overdue.
  const focusTaskId =
    sortedTasks.find((task) => !completedIds.has(task.id))?.id ?? null

  const hasPreTasks = preTasks.length > 0
  const allPretasksDone =
    !hasPreTasks || preTasks.every((task) => completedIds.has(task.id))

  /*
   * Pretasks and the main schedule never appear at the same time; which tab is
   * shown first depends on whether preparation is finished. The active tab
   * also decides what the AI chat is about.
   */
  const defaultTab = !allPretasksDone ? "preparation" : "schedule"

  /*
   * Inbound entity references (?highlight=<id>) may point at a pre-task;
   * start on the preparation tab so its element can render for the glow.
   * Safe to read the URL eagerly: this view only mounts after the page's
   * hydration gate, never during server rendering.
   */
  const [activeTab, setActiveTab] = useState<"preparation" | "schedule">(() => {
    const highlightId = new URLSearchParams(window.location.search).get(
      "highlight"
    )

    return highlightId != null &&
      preTasks.some((task) => task.id === highlightId)
      ? "preparation"
      : defaultTab
  })

  /*
   * Completing the final pre-task while the user is looking at the
   * preparation tab jumps straight to the schedule — the moment the unlock
   * happens is exactly when the main plan becomes interesting. Transition-
   * only: mounting with everything already done never redirects, and
   * un-completing then re-completing re-fires naturally. Tracked during
   * render (React's recommended previous-state pattern) rather than in an
   * effect to avoid a cascading second commit.
   */
  const [prevAllPretasksDone, setPrevAllPretasksDone] =
    useState(allPretasksDone)

  if (prevAllPretasksDone !== allPretasksDone) {
    setPrevAllPretasksDone(allPretasksDone)

    if (allPretasksDone && activeTab === "preparation") {
      setActiveTab("schedule")
    }
  }

  // Consumes the parameter: scrolls to and glows the referenced element
  // once it has rendered (polling covers late hydration).
  useHighlightParam()

  const toggleTask = useCallback(
    async (taskId: string) => {
      const completedAt = new Date().toISOString()

      const toggle = (list: SchedulePlanTask[]) =>
        list.map((task) =>
          task.id === taskId
            ? {
                ...task,
                completedAt: task.completedAt ? undefined : completedAt,
              }
            : task
        )

      await onPlanChange({
        ...plan,
        tasks: toggle(plan.tasks),
        preTasks: toggle(plan.preTasks),
      })
    },
    [plan, onPlanChange]
  )

  /*
   * Apply AI-suggested changes to a task or pre-task.
   *
   * Only updates scoped to this view's entity type are accepted, and only
   * the fields the assistant actually returned are changed; the remaining
   * fields keep their current values. Guide changes are never applied here.
   */
  async function handleApplyUpdate(update: AIChatUpdate) {
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
    const next = {
      ...plan,
      tasks: apply(plan.tasks),
      preTasks: apply(plan.preTasks),
    }

    await onPlanChange(next)
    return true
  }

  async function handleApplyAction(
    action: AIChatPendingAction
  ): Promise<boolean> {
    /*
     * Same scoping rule the tools use server-side: an action applies to the
     * list its conversation's tab is about. The chat panel remounts per tab
     * (`key={activeTab}`), so a proposal never outlives a tab switch and
     * strict scoping is safe.
     */
    const scope: AIChatScope = activeTab === "preparation" ? "pre-task" : "task"

    const next = applyPendingAction(plan, action, scope)

    if (!next) {
      return false
    }

    await onPlanChange(next)
    return true
  }

  const schedule = (
    <>
      {/* Desktop: horizontal-scrolling day columns. */}
      <div className="hidden md:block">
        <TaskDayColumns />
      </div>
      {/* Mobile: the same-height mobile variant. */}
      <div className="md:hidden">
        <MobileTaskDayView />
      </div>
    </>
  )

  // One value for the whole task subtree; stable across unrelated re-renders
  // (tab switches, chat activity) thanks to the memoized pieces.
  const planListValue = useMemo<SchedulePlanListValue>(
    () => ({
      tasks,
      preTasks,
      completedIds,
      focusTaskId,
      planId: plan.id,
      toggleTask,
    }),
    [tasks, preTasks, completedIds, focusTaskId, plan.id, toggleTask]
  )

  return (
    <div className="flex w-full flex-col lg:flex-row">
      <div className="max-w-full min-w-0 flex-1 px-4 py-6">
        <header className="mb-6">
          <h1 className="text-xl font-semibold">{plan.title}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(`${plan.startDate}T00:00:00`), "MMM d, yyyy")}{" "}
            - {format(new Date(`${plan.endDate}T00:00:00`), "MMM d, yyyy")}
          </p>
        </header>

        <SchedulePlanListProvider value={planListValue}>
          {hasPreTasks ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "preparation" | "schedule")
              }
            >
              <div className="flex justify-start border-b pb-5">
                <TabsList>
                  <TabsTrigger value="preparation">
                    Preparation
                    {allPretasksDone && (
                      <Check className="size-3.5 text-primary" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="schedule" disabled={!allPretasksDone}>
                    {!allPretasksDone && <Lock className="size-3.5" />}
                    Schedule
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="preparation" className="mt-2">
                <PreTaskAccordion />
              </TabsContent>

              <TabsContent value="schedule" className="mt-4">
                {schedule}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="mt-2">{schedule}</div>
          )}
        </SchedulePlanListProvider>
      </div>

      {/* AI chat panel. Keyed by tab so each context gets its own
          conversation. */}
      <AIChatPanel
        key={activeTab}
        context={{
          entityType: activeTab === "preparation" ? "pre-task" : "task",
          schedule: plan,
          tasks: activeTab === "preparation" ? preTasks : tasks,
        }}
        onApplyUpdate={handleApplyUpdate}
        onApplyAction={handleApplyAction}
        entityType={activeTab === "preparation" ? "pre-task" : "task"}
        previousMessages={[]}
        historyKey={scheduleChatKey(
          plan.id,
          activeTab === "preparation" ? "pre-task" : "task"
        )}
      />
    </div>
  )
}
