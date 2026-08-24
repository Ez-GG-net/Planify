import { Hono } from "hono";
import postReviewQuestions from "./generate/review-questions";

export const generateRoutes = new Hono().post(
  "/review-questions",
  postReviewQuestions,
);
