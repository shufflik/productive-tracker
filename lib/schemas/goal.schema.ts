import { z } from "zod"

// Local sync metadata schema (optional, чтобы не ломать старые данные)
const localSyncMetaSchema = z.object({
  _localUpdatedAt: z.number().optional(),
  _localOp: z.enum(["create", "update", "delete", "upsert"]).optional(),
})

// Base schema for common properties
const baseItemSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1),
    completed: z.boolean(),
    important: z.boolean().optional(),
  })
  .merge(localSyncMetaSchema)

// Goal schema (temporary task with deadline)
const goalSchema = baseItemSchema.extend({
  type: z.literal("goal"),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  label: z.string().optional(),
})

// Habit schema (no description)
const habitSchema = baseItemSchema.extend({
  type: z.literal("habit"),
  repeatType: z.enum(["daily", "weekly"]),
  repeatDays: z.array(z.number().min(0).max(6)).optional(),
  currentStreak: z.number(),
  maxStreak: z.number(),
  lastCompletedDate: z.string().optional(),
})

// Union schema
export const taskItemSchema = z.discriminatedUnion("type", [
  goalSchema,
  habitSchema,
])

export const goalsArraySchema = z.array(taskItemSchema)

export const dayCompletionSchema = z.object({
  date: z.string(),
  goals: z.array(
    z.object({
      id: z.string(),
      completed: z.boolean(),
    })
  ),
}).merge(localSyncMetaSchema)

export const dayCompletionsArraySchema = z.array(dayCompletionSchema)

export const dayReasonSchema = z.object({
  date: z.string(),
  reason: z.string(),
  rating: z.number(),
})

export const dayReasonsArraySchema = z.array(dayReasonSchema)
