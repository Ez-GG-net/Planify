import { SchedulePlanTask, TaskGuideStep } from "@/types"

import { AIChatToolContext } from "./tool-type"

/**
 * Resolves the task list the conversation's scope points at: the main
 * schedule for "task", preparation for "pre-task". Tools only ever see one
 * list — tasks and pre-tasks are kept separate.
 */
export function scopedTasks(
  context: Pick<AIChatToolContext, "virtualSchedule" | "scope">,
): SchedulePlanTask[] {
  return context.scope === "pre-task"
    ? context.virtualSchedule.preTasks
    : context.virtualSchedule.tasks
}

/**
 * Finds a task within the scoped list by ID.
 */
export function findScopedTask(
  context: Pick<AIChatToolContext, "virtualSchedule" | "scope">,
  taskId: SchedulePlanTask["id"],
): SchedulePlanTask | undefined {
  return scopedTasks(context).find((task) => task.id === taskId)
}

export interface GuideStepLocation {
  task: SchedulePlanTask
  step: TaskGuideStep
}

/**
 * Finds a guide step by its numeric ID within the scoped list.
 *
 * Guide-step actions carry only a `stepId` — not the owning task's ID — so
 * the step is located by scanning every guide in scope. Step IDs are unique
 * within one guide; if they collide across guides, the first match wins.
 */
export function findScopedGuideStep(
  context: Pick<AIChatToolContext, "virtualSchedule" | "scope">,
  stepId: number,
): GuideStepLocation | undefined {
  for (const task of scopedTasks(context)) {
    const step = task.guide?.steps.find(
      (candidate) => candidate.id === stepId,
    )

    if (step) {
      return { task, step }
    }
  }

  return undefined
}
