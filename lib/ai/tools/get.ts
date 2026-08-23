import { AIChatToolArguments, AIChatToolContext } from "./tool-type"
import { bindScope } from "./bind-scope"
import { findScopedTask, scopedTasks } from "./lookup"

export async function getTask(
  args: AIChatToolArguments["get_task"],
  context: AIChatToolContext
) {
  const task = findScopedTask(context, args.taskId)

  if (!task) {
    throw new Error(`Task not found: ${args.taskId}`)
  }

  return task
}

export async function getTaskGuide(
  args: AIChatToolArguments["get_task_guide"],
  context: AIChatToolContext
) {
  const task = findScopedTask(context, args.taskId)

  if (!task) {
    throw new Error(`Task not found: ${args.taskId}`)
  }

  // A missing guide is a valid answer, not an error — returning null lets
  // the model react (e.g. propose steps) instead of failing the call.
  return task.guide ?? null
}
export async function getSchedule(
  args: AIChatToolArguments["get_schedule"],
  context: AIChatToolContext
) {
  // Gets the schedule but omits task/preTask information that isn't
  // necessary for the model, reducing the amount of context sent.
const schedule = {
  ...context.virtualSchedule,
  tasks: context.virtualSchedule.tasks.map(({ id, title }) => ({
    id,
    title,
  })),
}

  return schedule
}

export async function getFilteredTasks(
  args: AIChatToolArguments["get_filtered_tasks"],
  context: AIChatToolContext
) {
  const { startTime, date, title, durationMinutes} = args
  return scopedTasks(context).filter((task) => {
    if (startTime && task.startTime !== startTime) return false
    if (date && task.date !== date) return false
    if (title && task.title !== title) return false
    if (durationMinutes && task.estimatedDuration !== durationMinutes) return false
    return true
  })
}

/**
 * Pre-task variants — same logic, pinned to the pre-task list.
 */
export const getPreTask = bindScope("pre-task", getTask)
export const getFilteredPreTasks = bindScope("pre-task", getFilteredTasks)
