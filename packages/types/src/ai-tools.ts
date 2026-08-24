import type { AIChatPendingAction } from "./chat-action"
import type { IDv1 } from "./id"
import type { SchedulePlan } from "./schedule-plan"
import type { TaskDetails } from "./task"

/**
 * Which task list the conversation targets. Mirrors the chat panel's
 * active tab: "task" is the main schedule, "pre-task" is preparation.
 */
export type AIChatScope = "task" | "pre-task"

/*
 * Shared argument shapes. Task and pre-task tool variants accept the same
 * arguments; only the list they resolve entities against differs, so the
 * pre-task keys reuse these interfaces instead of duplicating them.
 */
export interface GetTaskArgs {
  taskId: IDv1
}

export interface GetFilteredTasksArgs {
  startTime?: number
  date?: string
  title?: string
  durationMinutes?: number
}

export interface CreateTaskArgs {
  title: string
  date: string
  startTime: number
  estimatedDuration?: number
  details?: TaskDetails
}

export interface ModifyTaskArgs {
  taskId: IDv1
  changes: {
    startTime?: number
    date?: string
    title?: string
    estimatedDuration?: number
    details?: TaskDetails
  }
}

export interface DeleteTaskArgs {
  taskId: IDv1
}

export interface AIChatToolArguments {
  get_task: GetTaskArgs
  get_pre_task: GetTaskArgs

  get_filtered_tasks: GetFilteredTasksArgs
  get_filtered_pre_tasks: GetFilteredTasksArgs

  get_task_guide: GetTaskArgs

  get_schedule: {
    scheduleId: IDv1
  }

  create_task: CreateTaskArgs
  create_pre_task: CreateTaskArgs

  create_task_guide_step: {
    taskId: IDv1
    title: string
    description: string
    order: number
  }

  modify_task: ModifyTaskArgs
  modify_pre_task: ModifyTaskArgs

  modify_task_guide_step: {
    stepId: number
    changes: {
      title?: string
      description?: string
      order?: number
    }
  }

  delete_task: DeleteTaskArgs
  delete_pre_task: DeleteTaskArgs

  delete_task_guide_step: {
    stepId: number
  }
}
export type AIChatTool = keyof AIChatToolArguments
export type AIChatReadTool =
  | "get_task"
  | "get_pre_task"
  | "get_task_guide"
  | "get_schedule"

export interface AIChatToolContext {
  virtualSchedule: SchedulePlan

  /**
   * Which task list tools resolve entities against. Tasks and pre-tasks
   * are kept separate — an ID from the other list is simply not found.
   */
  scope: AIChatScope

  pendingActions: AIChatPendingAction[]

  currentToolCallId?: string

  addPendingAction(
    action: AIChatPendingAction
  ): void
}
