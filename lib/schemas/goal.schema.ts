import { z } from "zod"

export const goalSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["habit", "temporary"]),
  completed: z.boolean(),
  repeatType: z.enum(["daily", "weekly"]).optional(),
  repeatDays: z.array(z.number().min(0).max(6)).optional(),
  targetDate: z.string().optional(),
  important: z.boolean().optional(),
  label: z.string().optional(),
})

export const goalsArraySchema = z.array(goalSchema)

export const dayCompletionSchema = z.object({
  date: z.string(),
  goals: z.array(
    z.object({
      id: z.string(),
      completed: z.boolean(),
    })
  ),
})

export const dayCompletionsArraySchema = z.array(dayCompletionSchema)

export const dayReasonSchema = z.object({
  date: z.string(),
  reason: z.string(),
  rating: z.number(),
})

export const dayReasonsArraySchema = z.array(dayReasonSchema)
