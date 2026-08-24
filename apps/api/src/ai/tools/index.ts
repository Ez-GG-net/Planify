import type {
  AIChatTool,
  AIChatToolArguments,
  AIChatToolContext,
} from "@planify/types"

import { createTask, createPreTask, createTaskGuideStep } from "./create"
import { deleteTask, deletePreTask, deleteTaskGuideStep } from "./delete"
import {
  getFilteredPreTasks,
  getFilteredTasks,
  getPreTask,
  getSchedule,
  getTask,
  getTaskGuide,
} from "./get"
import { modifyPreTask, modifyTask, modifyTaskGuideStep } from "./modify"

//Optional: add metadata such as description, execute, and requiresApproval so the model can get context about what it does
export const aiTools = {
  get_task: getTask,
  get_pre_task: getPreTask,
  get_task_guide: getTaskGuide,
  get_filtered_tasks: getFilteredTasks,
  get_filtered_pre_tasks: getFilteredPreTasks,
  get_schedule: getSchedule,

  create_task: createTask,
  create_pre_task: createPreTask,
  create_task_guide_step: createTaskGuideStep,

  modify_task: modifyTask,
  modify_pre_task: modifyPreTask,
  modify_task_guide_step: modifyTaskGuideStep,

  delete_task: deleteTask,
  delete_pre_task: deletePreTask,
  delete_task_guide_step: deleteTaskGuideStep,
} as const

/**
 * Each tool declares its own argument shape via AIChatToolArguments.
 * Calling through the union of signatures directly would require `args`
 * to satisfy every shape at once, so the entry point passes them through
 * opaquely; argument correctness is each tool's own contract.
 */
export async function executeTool(
  name: AIChatTool,
  args: AIChatToolArguments[AIChatTool],
  context: AIChatToolContext,
) {
  const tool = aiTools[name]

  if (!tool) {
    throw new Error(`Unknown AI tool: ${name}`)
  }

  return (
    tool as (
      args: AIChatToolArguments[AIChatTool],
      context: AIChatToolContext,
    ) => Promise<unknown>
  )(args, context)
}
