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
 *
 * Non-chat routes check remaining quota before generation and reserve
 * AFTER success — if the client aborts, no quota is consumed.
 * Chat keeps the middleware reservation pattern because the stream
 * tracking handles unused tokens internally.
 */
export const generateRoutes = new Hono<AuthEnv & QuotaEnv>()
  .use("*", requireAuth)
  .post("/review-questions", postReviewQuestions)
  .post("/schedule", postSchedule)
  .post("/task-guide", postTaskGuide)
  .post("/pre-task-guide", postPreTaskGuide)
  .post("/chat-response", requireQuota("chat_tokens", 2_048), postChatResponse);
