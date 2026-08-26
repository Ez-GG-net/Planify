import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import { requireQuota, type QuotaEnv } from "../middleware/require-quota";
import postChatResponse from "./generate/chat-response";
import postPreTaskGuide from "./generate/pre-task-guide";
import postReviewQuestions from "./generate/review-questions";
import postSchedule from "./generate/schedule";
import postTaskGuide from "./generate/task-guide";

/**
 * All generation endpoints require an authenticated session; handlers can
 * read the resolved user via c.get("user") (see AuthEnv).
 */
export const generateRoutes = new Hono<AuthEnv & QuotaEnv>()
  .use("*", requireAuth)
  .post("/review-questions", requireQuota("review_questions"), postReviewQuestions)
  .post("/schedule", requireQuota("schedule_plan"), postSchedule)
  .post("/task-guide", requireQuota("task_guide"), postTaskGuide)
  .post("/pre-task-guide", requireQuota("pre_task_guide"), postPreTaskGuide)
  .post("/chat-response", requireQuota("chat_tokens", 2_048), postChatResponse);
