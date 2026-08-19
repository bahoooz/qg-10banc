import { z } from "zod";

export const liveStatusQuerySchema = z.object({
  streamer_id: z.string().trim().min(1),
});

export const createMarkerSchema = z.object({
  id: z.uuid(),
  streamer_id: z.string().trim().min(1),
  pressed_at: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "pressed_at doit être une date ISO 8601 valide",
    }),
  obs_stream_offset_ms: z.number().int().nonnegative(),
  obs_timecode: z.string().optional().default(""),
  obs_scene: z.string().optional().default(""),
  window_before_ms: z.number().int().nonnegative(),
  window_after_ms: z.number().int().nonnegative(),
  thumbnail: z.string().optional(),
  client_version: z.string().optional(),
});

export type CreateMarkerInput = z.infer<typeof createMarkerSchema>;
