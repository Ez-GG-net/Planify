import type { AIChatTool } from "@planify/types";

/**
 * Ollama's `/api/chat` `tools` parameter expects an array of OpenAI-style
 * function tool definitions. Each maps one of the server-side AI tools to a
 * name, description, and JSON Schema for its arguments, so the model can
 * emit a structured `tool_calls` block the server hands to `executeTool`.
 *
 * These schemas are the model-facing contract for the tool registry in
 * `tools/index.ts`. They are hand-written because the registry types its
 * arguments as TS interfaces, not runtime schemas.
 */
export interface OllamaToolFunction {
  type: "function";
  function: {
    name: AIChatTool;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** A tool name plus its parsed arguments, as dispatched to `executeTool`. */
export interface OllamaToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** One message in the conversation array sent to Ollama's `/api/chat`. */
export type OllamaChatMessage = {
  role: "system" | "user";
  content: string;
}
| {
    role: "assistant";
    content: string;
    /**
     * The round's full chain of thought (all `thinking` deltas concatenated
     * in arrival order); only ever populated server-side.
     */
    thinking?: string;
    tool_calls?: Array<{ function: { name: string; arguments: unknown } }>;
}
| {
    role: "tool";
    content: string;
    name?: string;
}
/** One NDJSON line yielded while streaming a chat response from Ollama. */
export interface OllamaChatChunk {
  message?: {
    role?: string;
    content?: string;
    /** Reasoning text emitted by reasoning-model families (e.g. gpt-oss). */
    thinking?: string;
    tool_calls?: Array<{
      function?: { name?: string; arguments?: unknown };
    }>;
  };
  done?: boolean;
  done_reason?: string;
  /** Generated-token count. Only present on the final `done: true` line. */
  eval_count?: number;
  error?: string;
}

/**
 * Ollama may return `arguments` as a JSON string or an object. Normalizes to
 * a plain object so `executeTool` always receives a usable shape.
 */
export function parseToolArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
}

const taskIdProperty = {
  type: "string",
  description: "The task's ID.",
} as const;

const schedulePlanParameters: Record<string, unknown> = {
  type: "object",
  properties: {
    scheduleId: { type: "string", description: "The schedule plan's ID." },
  },
  required: ["scheduleId"],
};

const detailedTaskParameters: Record<string, unknown> = {
  type: "object",
  properties: {
    title: { type: "string", description: "The task's title." },
    date: {
      type: "string",
      description: "ISO date (YYYY-MM-DD) or date label.",
    },
    startTime: {
      type: "number",
      description: "Start time as minutes-from-midnight.",
    },
    estimatedDuration: {
      type: "number",
      description: "Estimated duration in minutes.",
    },
    details: {
      type: "object",
      description: "Free-form task details.",
      additionalProperties: true,
    },
  },
  required: ["title", "date", "startTime"],
};

const modifyChanges: Record<string, unknown> = {
  type: "object",
  properties: {
    startTime: {
      type: "number",
      description: "New start time in minutes-from-midnight.",
    },
    date: { type: "string", description: "New ISO date." },
    title: { type: "string", description: "New title." },
    estimatedDuration: {
      type: "number",
      description: "New estimated duration in minutes.",
    },
    details: { type: "object", description: "New details." },
  },
};

const modifyTaskParameters: Record<string, unknown> = {
  type: "object",
  properties: {
    taskId: taskIdProperty,
    changes: modifyChanges,
  },
  required: ["taskId", "changes"],
};

const getFilteredParameters: Record<string, unknown> = {
  type: "object",
  properties: {
    startTime: {
      type: "number",
      description: "Filter by start time (minutes-from-midnight).",
    },
    date: { type: "string", description: "Filter by ISO date." },
    title: { type: "string", description: "Filter by title substring." },
    durationMinutes: {
      type: "number",
      description: "Filter by estimated duration in minutes.",
    },
  },
};

const createGuideStepParameters: Record<string, unknown> = {
  type: "object",
  properties: {
    taskId: taskIdProperty,
    title: { type: "string", description: "Step title." },
    description: { type: "string", description: "Step description." },
    order: { type: "number", description: "Step order (1-based)." },
  },
  required: ["taskId", "title", "description", "order"],
};

const modifyGuideStepParameters: Record<string, unknown> = {
  type: "object",
  properties: {
    stepId: { type: "number", description: "The guide step's numeric ID." },
    changes: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        order: { type: "number" },
      },
    },
  },
  required: ["stepId", "changes"],
};

const guideStepIdParameters: Record<string, unknown> = {
  type: "object",
  properties: {
    stepId: { type: "number", description: "The guide step's numeric ID." },
  },
  required: ["stepId"],
};

const simpleTaskIdParameters: Record<string, unknown> = {
  type: "object",
  properties: {
    taskId: taskIdProperty,
  },
  required: ["taskId"],
};

/**
 * The full 14-tool registry, described as Ollama function tools. Task and
 * pre-task variants share argument shapes; only their descriptions differ so
 * the model knows which list each variant targets.
 *
 * These allow the model to retrieve information about the schedule plan and CRUD parts of it.
 */
export const OLLAMA_TOOLS: OllamaToolFunction[] = [
  {
    type: "function",
    function: {
      name: "get_task",
      description: "Retrieve a single task on the main schedule by ID.",
      parameters: simpleTaskIdParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_tasks",
      description: "Get all tasks on the main schedule (no details, just id/title).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_pre_tasks",
      description: "Get all pre-tasks in the preparation list (no details, just id/title).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pre_task",
      description:
        "Retrieve a single pre-task from the preparation list by ID.",
      parameters: simpleTaskIdParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "get_task_guide",
      description: "Retrieve the task guide (or null) for a task by ID.",
      parameters: simpleTaskIdParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "get_schedule",
      description:
        "Retrieve the current schedule plan (tasks and pre-tasks omitted except id/title).",
      parameters: schedulePlanParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "get_filtered_tasks",
      description: "Search the main schedule's tasks by filters.",
      parameters: getFilteredParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "get_filtered_pre_tasks",
      description:
        "Search the preparation list's pre-tasks by filters.",
      parameters: getFilteredParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Propose creating a new task on the main schedule. Requires user approval before it is applied.",
      parameters: detailedTaskParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "create_pre_task",
      description:
        "Propose creating a new pre-task in the preparation list. Requires user approval before it is applied.",
      parameters: detailedTaskParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "create_task_guide_step",
      description:
        "Propose adding a step to a task's guide. Requires user approval before it is applied.",
      parameters: createGuideStepParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "modify_task",
      description:
        "Propose updating a task on the main schedule. Requires user approval before it is applied.",
      parameters: modifyTaskParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "modify_pre_task",
      description:
        "Propose updating a pre-task in the preparation list. Requires user approval before it is applied.",
      parameters: modifyTaskParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "modify_task_guide_step",
      description:
        "Propose updating a task guide step. Requires user approval before it is applied.",
      parameters: modifyGuideStepParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description:
        "Propose deleting a task on the main schedule. Requires user approval before it is applied.",
      parameters: simpleTaskIdParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "delete_pre_task",
      description:
        "Propose deleting a pre-task from the preparation list. Requires user approval before it is applied.",
      parameters: simpleTaskIdParameters,
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task_guide_step",
      description:
        "Propose removing a task guide step. Requires user approval before it is applied.",
      parameters: guideStepIdParameters,
    },
  },
];
