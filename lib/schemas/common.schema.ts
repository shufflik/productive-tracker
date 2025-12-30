import { z } from "zod"

// Local sync metadata schema (optional, чтобы не ломать старые данные)
const localSyncMetaSchema = z.object({
  _localUpdatedAt: z.number().nullish(),
  _localOp: z.enum(["create", "update", "delete", "upsert"]).nullish(),
  _version: z.number().nullish(),
})

// Base schema for common properties
const baseItemSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1),
    completed: z.boolean().default(false),
    important: z.boolean().nullish(),
  })
  .merge(localSyncMetaSchema)

// Goal meta schema
const goalMetaSchema = z.object({
  percent: z.number().nullish(),
  delta: z.number().nullish(),
  isPostponed: z.boolean().nullish(),
})

// Goal schema (temporary task with deadline or backlog)
const goalSchema = baseItemSchema.extend({
  description: z.string().nullish(),
  targetDate: z.string().nullish(),
  isBacklog: z.boolean().nullish(),
  label: z.string().nullish(),
  meta: goalMetaSchema.nullish(),
})

// Habit schema (no description)
const habitSchema = baseItemSchema.extend({
  repeatType: z.enum(["daily", "weekly"]).default("daily"),
  repeatDays: z.array(z.number().min(0).max(6)).nullish(),
  currentStreak: z.number().default(0),
  maxStreak: z.number().default(0),
  lastCompletedDate: z.string().nullish(),
  completions: z.record(z.string(), z.boolean()).nullish(),
})

// Separate schemas for goals and habits
export const goalsArraySchema = z.array(goalSchema)
export const habitsArraySchema = z.array(habitSchema)

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
