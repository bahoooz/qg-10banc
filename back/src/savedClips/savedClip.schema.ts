import { z } from "zod";
import { clipLayoutExportSchema } from "../clips/export.types.js";
import { subtitleFontIdSchema } from "../clips/subtitleFontSchema.js";

const timeRangeSchema = z.object({
  start: z.number().min(0),
  end: z.number().positive(),
  speed: z.number().optional(),
});

const camZoneSchema = z.object({
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

const textOverlayStyleSchema = z.object({
  fontId: subtitleFontIdSchema,
  fillColor: z.string().min(1),
  strokeColor: z.string().min(1),
  strokeWidth: z.number().min(0),
  glowColor: z.string().min(1),
  glowIntensity: z.number().min(0).max(100),
  glowSpread: z.number().min(0).max(60),
  letterSpacing: z.number().min(0).max(24),
});

const subtitleStyleSchema = z.object({
  fontId: textOverlayStyleSchema.shape.fontId,
  fillColor: z.string().min(1),
  strokeColor: z.string().min(1),
  strokeWidth: z.number().min(0),
  animation: z.enum(["pop", "bounce", "fade", "scale"]),
  glowColor: z.string().min(1),
  glowIntensity: z.number().min(0).max(100),
  glowSpread: z.number().min(0).max(60),
});

const subtitleTimingSchema = z.object({
  syncOffsetMs: z.number().min(-500).max(500),
  anticipationMs: z.number().min(0).max(300),
});

const zoomEffectSchema = z.object({
  id: z.string().min(1),
  start: z.number().min(0),
  end: z.number().positive(),
  intensity: z.number().min(0).max(100),
  zone: camZoneSchema,
  usesSequenceTime: z.boolean().optional(),
});

const followStickerSchema = z.object({
  type: z.literal("follow"),
  username: z.string().min(1).max(24),
  platform: z.enum(["twitch", "youtube", "kick"]),
});

const imageOverlaySchema = z.object({
  id: z.string().min(1),
  start: z.number().min(0),
  end: z.number().positive(),
  src: z.string().min(1),
  label: z.string().min(1),
  zone: camZoneSchema,
  sticker: followStickerSchema.optional(),
  usesSequenceTime: z.boolean().optional(),
});

const textOverlaySchema = z.object({
  id: z.string().min(1),
  start: z.number().min(0),
  end: z.number().positive(),
  text: z.string().min(1),
  label: z.string().min(1),
  style: textOverlayStyleSchema,
  layout: subtitleLayoutSchema,
  usesSequenceTime: z.boolean().optional(),
});

const soundboardClipSchema = z.object({
  id: z.string().min(1),
  start: z.number().min(0),
  end: z.number().positive(),
  src: z.string().min(1),
  label: z.string().min(1),
  volume: z.number().min(0).max(1),
  usesSequenceTime: z.boolean().optional(),
});

const savedTimelineVideoSchema = z.object({
  id: z.string().min(1),
  clipId: z.string().uuid(),
  sourceUrl: z.string().min(1),
  previewUrl: z.string().min(1),
  label: z.string().min(1),
  sequenceStart: z.number().min(0),
  duration: z.number().positive(),
  sourceStart: z.number().min(0),
  sourceWidth: z.number().positive(),
  sourceHeight: z.number().positive(),
  sourceDuration: z.number().positive(),
  sourceType: z.enum(["upload", "twitch"]),
  layoutMode: z.enum(["base", "center-crop"]),
  speed: z.number().optional(),
  importKind: z.enum(["meme", "clip"]).optional(),
  naturalInsertStart: z.number().min(0).optional(),
});

const subtitleWordSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  start: z.number().min(0),
  end: z.number().positive(),
});

export const savedClipEditorStateSchema = z.object({
  version: z.literal(1),
  editorStep: z
    .enum(["layout", "montage", "subtitles", "export"])
    .optional(),
  layout: clipLayoutExportSchema,
  keepSegments: z.array(timeRangeSchema).min(1),
  lastFfmpegCutPayload: z.array(timeRangeSchema).nullable(),
  zoomEffects: z.array(zoomEffectSchema),
  imageOverlays: z.array(imageOverlaySchema),
  textOverlays: z.array(textOverlaySchema),
  soundboards: z.array(soundboardClipSchema),
  timelineVideos: z.array(savedTimelineVideoSchema),
  subtitleWords: z.array(subtitleWordSchema),
  subtitleStyle: subtitleStyleSchema,
  subtitleTiming: subtitleTimingSchema,
  subtitleLayout: subtitleLayoutSchema,
  subtitleLanguage: z.string().nullable(),
  previewContainerWidth: z.number().positive(),
  exportUrl: z.string().nullable().optional(),
  exportResult: z
    .object({
      id: z.string().min(1),
      exportUrl: z.string().min(1),
      duration: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .nullable()
    .optional(),
});

export const createSavedClipSchema = z.object({
  name: z.string().trim().min(1).max(80),
  clipId: z.string().uuid(),
  sourceType: z.enum(["upload", "twitch"]),
  originalName: z.string().trim().max(200).optional(),
  sourceWidth: z.number().positive(),
  sourceHeight: z.number().positive(),
  sourceDuration: z.number().positive(),
  editorState: savedClipEditorStateSchema,
});

export const updateSavedClipSchema = z.object({
  editorState: savedClipEditorStateSchema,
});

export const listSavedClipsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(5).default(5),
});

export type SavedClipEditorState = z.infer<typeof savedClipEditorStateSchema>;
export type CreateSavedClipInput = z.infer<typeof createSavedClipSchema>;
export type UpdateSavedClipInput = z.infer<typeof updateSavedClipSchema>;
