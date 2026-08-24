import { z } from "zod";
import {
  ReviewQuestionSchema,
  ReviewAnswerSchema,
  WizardScheduleSchema,
} from "@planify/schemas";
import { ReviewGenerationStateSchema, ScheduleGenerationStateSchema } from "./ui-state";

export const WizardScheduleStateSchema = z.object({
  stepNum: z.number(),
  schedule: WizardScheduleSchema,
  reviewState: ReviewGenerationStateSchema,
  scheduleState: ScheduleGenerationStateSchema,
  reviewQuestions: z.array(ReviewQuestionSchema),
  reviewAnswers: z.array(ReviewAnswerSchema),
});
