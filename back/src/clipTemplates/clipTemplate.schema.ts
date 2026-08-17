import { z } from "zod";
import { clipLayoutExportSchema } from "../clips/export.types.js";
import { subtitleFontIdSchema } from "../clips/subtitleFontSchema.js";

const normalizedZoneSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
});

const subtitleLayoutSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().positive(),
});

const baseVisualStyleSchema = z.object({
  fontId: subtitleFontIdSchema,
  fillColor: z.string().min(1),
  strokeColor: z.string().min(1),
  strokeWidth: z.number().min(0),
  glowColor: z.string().min(1),
  glowIntensity: z.number().min(0).max(100),
  glowSpread: z.number().min(0).max(60),
});

const textOverlayStyleSchema = baseVisualStyleSchema.extend({
  letterSpacing: z.number().min(0).max(24),
});

const subtitleStyleSchema = baseVisualStyleSchema.extend({
  animation: z.enum(["pop", "bounce", "fade", "scale"]),
});

const subtitleTimingSchema = z.object({
  syncOffsetMs: z.number().min(-500).max(500),
  anticipationMs: z.number().min(0).max(300),
});

export const clipTemplatePayloadSchema = z.object({
  version: z.literal(1),
  layout: clipLayoutExportSchema,
  montage: z.object({
    firstTextOverlay: z
      .object({
        text: z.string().min(1).max(200),
        style: textOverlayStyleSchema,
        layout: subtitleLayoutSchema,
      })
      .nullable(),
    followSticker: z
      .object({
        username: z.string().min(1).max(24),
        platform: z.enum(["twitch", "youtube", "kick"]),
        zone: normalizedZoneSchema,
        sequenceStart: z.number().min(0).optional(),
        sequenceEnd: z.number().positive().optional(),
      })
      .nullable(),
  }),
  subtitles: z.object({
    style: subtitleStyleSchema,
    layout: subtitleLayoutSchema,
    timing: subtitleTimingSchema,
    previewContainerWidth: z.number().positive(),
  }),
});

export const createClipTemplateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  payload: clipTemplatePayloadSchema,
});

export type ClipTemplatePayload = z.infer<typeof clipTemplatePayloadSchema>;
export type CreateClipTemplateInput = z.infer<typeof createClipTemplateSchema>;
