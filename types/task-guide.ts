import { PreTaskGuideSchema, TaskGuideSchema, TaskGuideStepSchema } from "@/schemas";
import z from "zod";

export type TaskGuide = z.infer<typeof TaskGuideSchema>;
export type TaskGuideStep = z.infer<typeof TaskGuideStepSchema>;
export type PreTaskGuide = z.infer<typeof PreTaskGuideSchema>;