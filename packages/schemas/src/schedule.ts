import { z } from "zod";
import { ReviewAnswerSchema } from "./review";

export const ScheduleSchema = z.object({
  objective: z.string(),
  notesContext: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  timePerDay: z.number(),
  reviewAnswers: z.array(ReviewAnswerSchema).optional(),
});

export const WizardScheduleSchema = z.object({
  objective: z.string(),
  notesContext: z.string(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  timePerDay: z.number(),
});
