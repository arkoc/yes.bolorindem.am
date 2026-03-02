import { z } from "zod";

export const standardCompletionSchema = z.object({
  taskId: z.string().uuid(),
  notes: z.string().optional(),
});

export const formCompletionSchema = z.object({
  taskId: z.string().uuid(),
  formData: z.record(z.unknown()),
  notes: z.string().optional(),
});

export const locationCompletionSchema = z.object({
  taskId: z.string().uuid(),
  locationData: z.object({
    lat: z.number(),
    lng: z.number(),
    selectedPointId: z.string().optional(),
    timestamp: z.string(),
  }),
  notes: z.string().optional(),
});

export const completionSchema = z.discriminatedUnion("taskType", [
  z.object({ taskType: z.literal("standard"), taskId: z.string().uuid(), notes: z.string().optional() }),
  z.object({ taskType: z.literal("form"), taskId: z.string().uuid(), formData: z.record(z.unknown()), notes: z.string().optional() }),
  z.object({
    taskType: z.literal("location"),
    taskId: z.string().uuid(),
    count: z.number().int().min(1).max(500).default(1),
    locationData: z.object({
      lat: z.number(),
      lng: z.number(),
      selectedPointId: z.string().optional(),
      timestamp: z.string(),
    }),
    notes: z.string().optional(),
  }),
  z.object({
    taskType: z.literal("photo"),
    taskId: z.string().uuid(),
    count: z.number().int().min(1).max(500).default(1),
    evidenceUrls: z.array(z.string()).min(1),
    notes: z.string().optional(),
  }),
]);

export type CompletionPayload = z.infer<typeof completionSchema>;
