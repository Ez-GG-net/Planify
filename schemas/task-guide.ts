import z from "zod"

export const TaskGuideStepSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  content: z.string().optional(),
  estimatedDuration: z.number(),
  completedAt: z.string().optional(),
})

export const TaskGuideSchema = z.object({
  description: z.string(),
  objective: z.string(),
  steps: z.array(TaskGuideStepSchema),
})
export const PreTaskGuideSchema = z.object({
  description: z.string(),
  steps: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
    })
  ),
})
