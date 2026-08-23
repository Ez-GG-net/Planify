import { z } from "zod";
import { ReviewGenerationStateSchema, ReviewQuestionSchema, ReviewAnswerSchema } from "./review";
import { ScheduleGenerationStateSchema, WizardScheduleSchema } from "./schedule";

export const WizardScheduleStateSchema = z.object({
  stepNum: z.number(),
  schedule: WizardScheduleSchema,
  reviewState: ReviewGenerationStateSchema,
  scheduleState: ScheduleGenerationStateSchema,
  reviewQuestions: z.array(ReviewQuestionSchema),
  reviewAnswers: z.array(ReviewAnswerSchema),
});
