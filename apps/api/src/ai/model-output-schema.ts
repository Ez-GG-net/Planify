export const PRE_TASK_GUIDE_JSON_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  required: ["description", "steps"],
} as const;

export const REVIEW_QUESTIONS_JSON_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      noteTitle: { type: "string" },
      question: { type: "string" },
      choices: { type: "array", items: { type: "string" } },
    },
    required: ["noteTitle", "question", "choices"],
  },
} as const;

export const SCHEDULE_PLAN_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    preTasks: { type: "array", items: { type: "object" } },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          date: { type: "string" },
          startTime: { type: "number" },
          estimatedDuration: { type: "number" },
          details: { type: ["object", "null"] },
        },
        required: ["id", "title"],
      },
    },
  },
  required: ["title", "startDate", "endDate", "preTasks", "tasks"],
} as const;

export const TASK_GUIDE_JSON_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
    objective: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          estimatedDuration: { type: "number" },
        },
        required: ["title", "estimatedDuration"],
      },
    },
  },
  required: ["description", "objective", "steps"],
} as const;