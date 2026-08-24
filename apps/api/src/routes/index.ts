import { Hono } from "hono";
import postChatResponse from "./generate/chat-response";
import postPreTaskGuide from "./generate/pre-task-guide";
import postReviewQuestions from "./generate/review-questions";
import postSchedule from "./generate/schedule";
import postTaskGuide from "./generate/task-guide";

export const generateRoutes = new Hono()
  .post("/review-questions", postReviewQuestions)
  .post("/schedule", postSchedule)
  .post("/task-guide", postTaskGuide)
  .post("/pre-task-guide", postPreTaskGuide)
  .post("/chat-response", postChatResponse);
