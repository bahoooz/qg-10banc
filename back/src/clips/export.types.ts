import { z } from "zod";
import { subtitleFontIdSchema } from "./subtitleFontSchema.js";

const camZoneSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
});

export const clipLayoutExportSchema = z.object({
  camShape: z.enum(["rounded", "circle", "free"]),
  sourceCam: camZoneSchema,
  verticalCam: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  verticalCamZone: camZoneSchema,
  verticalCropPan: z.number().min(0).max(1),
});

export const subtitleTimingExportSchema = z.object({
  syncOffsetMs: z.number(),
  anticipationMs: z.number(),
});

export const zoomEffectExportSchema = z.object({
  sequenceStart: z.number().min(0),
  sequenceEnd: z.number().positive(),
  zone: camZoneSchema,
});

export const imageOverlayExportSchema = z.object({
  sequenceStart: z.number().min(0),
  sequenceEnd: z.number().positive(),
  src: z.string().min(1),
  zone: camZoneSchema,
  alignBottom: z.boolean().optional(),
});

export const timelineVideoExportSchema = z.object({
  instanceId: z.string().min(1).optional(),
  clipId: z.string().uuid(),
  sequenceStart: z.number().min(0),
  duration: z.number().positive(),
  sequenceDuration: z.number().positive().optional(),
  sourceStart: z.number().min(0).optional(),
  layoutMode: z.enum(["base", "center-crop"]),
  importKind: z.enum(["meme", "clip"]).optional(),
  naturalInsertStart: z.number().min(0).optional(),
  speed: z.number().optional(),
});

export const textOverlayExportSchema = z.object({
  sequenceStart: z.number().min(0),
  sequenceEnd: z.number().positive(),
  text: z.string().min(1),
  layout: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    scale: z.number().positive(),
  }),
  style: z.object({
    fontId: subtitleFontIdSchema.optional(),
    animation: z.enum(["pop", "bounce", "fade", "scale"]).optional(),
    fillColor: z.string().min(1),
    strokeColor: z.string().min(1),
    strokeWidth: z.number().min(0),
    glowColor: z.string().min(1).optional(),
    glowIntensity: z.number().min(0).max(100).optional(),
    glowSpread: z.number().min(0).max(60).optional(),
    letterSpacing: z.number().optional(),
  }),
});

export const soundboardExportSchema = z.object({
  sequenceStart: z.number().min(0),
  sequenceEnd: z.number().positive(),
  src: z.string().min(1),
  volume: z.number().min(0).max(1),
});

export type LayoutExportPayload = z.infer<typeof clipLayoutExportSchema>;
export type SubtitleTimingExportPayload = z.infer<typeof subtitleTimingExportSchema>;
export type ZoomEffectExportPayload = z.infer<typeof zoomEffectExportSchema>;
export type ImageOverlayExportPayload = z.infer<typeof imageOverlayExportSchema>;
export type TimelineVideoExportPayload = z.infer<typeof timelineVideoExportSchema>;
export type TextOverlayExportPayload = z.infer<typeof textOverlayExportSchema>;
export type SoundboardExportPayload = z.infer<typeof soundboardExportSchema>;
