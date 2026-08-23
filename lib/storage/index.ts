const PREFIX = "planify"

export const storageKeys = {
  REVIEW_QUESTIONS: "review-questions",
  SCHEDULES: "schedules",
  SETTINGS: "settings",
  TASK_GUIDE_CHAT_WIDTH: "task-guide-chat-width",
} as const

export function getStorageKey(key: keyof typeof storageKeys): string {
  return `${PREFIX}.${storageKeys[key]}`
}

export * from "./localstorage"
export * from "./schedule-plan"
export * from "./settings"
