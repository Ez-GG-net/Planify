import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const REVIEW_QUESTIONS_SYSTEM_PROMPT = readFileSync(
  fileURLToPath(new URL("./prompts/review-questions.md", import.meta.url)),
  "utf8",
);

export const TASK_GUIDE_SYSTEM_PROMPT = readFileSync(
  fileURLToPath(new URL("./prompts/task-guide.md", import.meta.url)),
  "utf8",
);

export const PRE_TASK_GUIDE_SYSTEM_PROMPT = readFileSync(
  fileURLToPath(new URL("./prompts/pre-task-guide.md", import.meta.url)),
  "utf8",
);

export const SCHEDULE_PLAN_SYSTEM_PROMPT = readFileSync(
  fileURLToPath(new URL("./prompts/schedule-plan.md", import.meta.url)),
  "utf8",
);
