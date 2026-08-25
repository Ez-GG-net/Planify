import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../middleware/require-auth";
import postChatResponse from "./generate/chat-response";
import postPreTaskGuide from "./generate/pre-task-guide";
import postReviewQuestions from "./generate/review-questions";
import postSchedule from "./generate/schedule";
import postTaskGuide from "./generate/task-guide";

/**
 * All generation endpoints require an authenticated session; handlers can
 * read the resolved user via c.get("user") (see AuthEnv).
 */
export const generateRoutes = new Hono<AuthEnv>()
  .use("*", requireAuth)
  .post("/review-questions", postReviewQuestions)
  .post("/schedule", postSchedule)
  .post("/task-guide", postTaskGuide)
  .post("/pre-task-guide", postPreTaskGuide)
  .post("/chat-response", postChatResponse);
