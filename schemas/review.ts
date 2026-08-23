import { z } from "zod";

export const ReviewGenerationStateSchema = z.enum(["idle", "loading", "success", "error"]);

export const ReviewQuestionSchema = z.object({
  noteTitle: z.string(),
  question: z.string(),
  choices: z.array(z.string()),
});

export const ReviewAnswerSchema = z.object({
  key: z.string(),
  answer: z.string().optional(),
  choiceNum: z.number().optional(),
});
