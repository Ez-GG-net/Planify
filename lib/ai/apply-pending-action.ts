import { generateRandomIDv1 } from "@/lib/create-id"
import type {
  AIChatPendingAction,
  SchedulePlan,
  SchedulePlanTask,
  TaskGuide,
  TaskGuideStep,
} from "@/types"

import type { AIChatScope } from "@/lib/ai/tools/tool-type"

/*
 * Guide steps keep their array index as their ID, so `order` arguments map
 * directly to positions and IDs stay unique after every insert/move/delete.
 * The tradeoff: another pending guide action's stepId can dangle across a
 * renumber — acceptable while proposals resolve immediately; stable IDs would
 * be the production-grade alternative.
 */
function renumberSteps(steps: TaskGuideStep[]): TaskGuideStep[] {
  return steps.map((step, index) => ({ ...step, id: index }))
}

function withSteps(
  task: SchedulePlanTask,
  steps: TaskGuideStep[],
): SchedulePlanTask {
  const guide: TaskGuide = task.guide
    ? { ...task.guide, steps }
    : { description: "", objective: "", steps }

  return { ...task, guide }
}

interface StepLocation {
  taskIndex: number
  stepIndex: number
}

function locateGuideStep(
  tasks: SchedulePlanTask[],
  stepId: number,
): StepLocation | null {
  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
    const stepIndex = tasks[taskIndex].guide?.steps.findIndex(
      (step) => step.id === stepId,
    )

    if (stepIndex != null && stepIndex !== -1) {
      return { taskIndex, stepIndex }
    }
  }

  return null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max)
}

/**
 * Applies an approved action proposal to the plan and returns the next plan.
 *
 * `scope` decides which task list is targeted, mirroring the server-side
 * tools: an action can only ever touch the list its conversation was about,
 * so a proposal against the other list returns null (the caller marks the
 * action failed).
 */
export function applyPendingAction(
  plan: SchedulePlan,
  action: AIChatPendingAction,
  scope: AIChatScope,
): SchedulePlan | null {
  const inScope = scope === "pre-task" ? plan.preTasks : plan.tasks

  const commit = (tasks: SchedulePlanTask[]): SchedulePlan =>
    scope === "pre-task" ? { ...plan, preTasks: tasks } : { ...plan, tasks }

  switch (action.type) {
    case "modify_task": {
      const { taskId, changes } = action.arguments

      if (!inScope.some((task) => task.id === taskId)) {
        return null
      }

      return commit(
        inScope.map((task) =>
          task.id !== taskId
            ? task
            : {
                ...task,
                ...changes,
                details:
                  changes.details == null
                    ? task.details
                    : { ...task.details, ...changes.details },
              },
        ),
      )
    }

    case "create_task": {
      const newTask: SchedulePlanTask = {
        id: generateRandomIDv1(),
        title: action.arguments.title,
        date: action.arguments.date,
        startTime: action.arguments.startTime,
        estimatedDuration: action.arguments.estimatedDuration,
        // Spread into a fresh literal: the schema-inferred details type has
        // no index signature of its own, so a direct assignment to
        // SchedulePlanTask["details"] (Record<string, unknown>) fails.
        details:
          action.arguments.details == null
            ? undefined
            : { ...action.arguments.details },
      }

      return commit([...inScope, newTask])
    }

    case "delete_task": {
      const remaining = inScope.filter(
        (task) => task.id !== action.arguments.taskId,
      )

      if (remaining.length === inScope.length) {
        return null
      }

      return commit(remaining)
    }

    case "create_task_guide_step": {
      const { taskId, title, description, order } = action.arguments
      const taskIndex = inScope.findIndex((task) => task.id === taskId)

      if (taskIndex === -1) {
        return null
      }

      const task = inScope[taskIndex]
      const steps = task.guide?.steps ?? []
      const insertAt = clamp(order, 0, steps.length)

      const nextTasks = [...inScope]
      nextTasks[taskIndex] = withSteps(
        task,
        renumberSteps([
          ...steps.slice(0, insertAt),
          {
            id: insertAt,
            title,
            content: description,
            estimatedDuration: 0,
          },
          ...steps.slice(insertAt),
        ]),
      )

      return commit(nextTasks)
    }

    case "modify_task_guide_step": {
      const { stepId, changes } = action.arguments
      const location = locateGuideStep(inScope, stepId)

      if (!location) {
        return null
      }

      const { taskIndex, stepIndex } = location
      const task = inScope[taskIndex]
      const current = task.guide?.steps ?? []

      // Mutated in place below (assignment + splice); never reassigned.
      const steps = [...current]
      steps[stepIndex] = {
        ...steps[stepIndex],
        ...(changes.title != null ? { title: changes.title } : {}),
        ...(changes.description != null
          ? { content: changes.description }
          : {}),
      }

      if (changes.order != null && clamp(changes.order, 0, steps.length - 1) !== stepIndex) {
        const [moved] = steps.splice(stepIndex, 1)
        steps.splice(clamp(changes.order, 0, steps.length), 0, moved)
      }

      const nextTasks = [...inScope]
      nextTasks[taskIndex] = withSteps(task, renumberSteps(steps))

      return commit(nextTasks)
    }

    case "delete_task_guide_step": {
      const location = locateGuideStep(inScope, action.arguments.stepId)

      if (!location) {
        return null
      }

      const { taskIndex, stepIndex } = location
      const task = inScope[taskIndex]
      const steps = (task.guide?.steps ?? []).filter(
        (_, index) => index !== stepIndex,
      )

      const nextTasks = [...inScope]
      nextTasks[taskIndex] = withSteps(task, renumberSteps(steps))

      return commit(nextTasks)
    }
  }
}
