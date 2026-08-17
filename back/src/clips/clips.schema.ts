import { z } from "zod";
import { subtitleFontIdSchema } from "./subtitleFontSchema.js";
import {
  clipLayoutExportSchema,
  imageOverlayExportSchema,
  subtitleTimingExportSchema,
  textOverlayExportSchema,
  timelineVideoExportSchema,
  zoomEffectExportSchema,
} from "./export.types.js";

const TWITCH_CLIP_PATTERNS = [
  /^https?:\/\/(www\.)?clips\.twitch\.tv\/[\w-]+$/i,
  /^https?:\/\/(www\.)?twitch\.tv\/[\w]+\/clip\/[\w-]+$/i,
];

export function normalizeTwitchClipUrl(url: string): string {
  return url.trim().replace(/[?#].*$/, "");
}

export function isTwitchClipUrl(url: string): boolean {
  const normalized = normalizeTwitchClipUrl(url);
  return TWITCH_CLIP_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function extractTwitchClipSlug(url: string): string {
  const trimmed = normalizeTwitchClipUrl(url);
  const clipsHostMatch = trimmed.match(/clips\.twitch\.tv\/([\w-]+)/i);
  if (clipsHostMatch) return clipsHostMatch[1];

  const pathMatch = trimmed.match(/twitch\.tv\/[\w]+\/clip\/([\w-]+)/i);
  if (pathMatch) return pathMatch[1];

  throw new Error("Impossible d'extraire le slug du clip Twitch");
}

export const twitchClipImportSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "L'URL du clip est requise")
    .transform(normalizeTwitchClipUrl)
    .refine(isTwitchClipUrl, {
      message: "Lien Twitch invalide",
    }),
  twitchAccountId: z.string().uuid().optional(),
});

export type TTwitchClipImport = z.infer<typeof twitchClipImportSchema>;

/** 1 Go — adapté au PC gamer local */
export const MAX_CLIP_UPLOAD_BYTES = 1024 * 1024 * 1024;

export const ACCEPTED_CLIP_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const clipSegmentSchema = z.object({
  start: z.number().min(0),
  end: z.number().positive(),
  speed: z.number().min(-200).max(200).optional(),
});

export const clipCutSchema = z.object({
  keepSegments: z
    .array(clipSegmentSchema)
    .min(1, "Au moins un segment doit être conservé")
    .refine(
      (segments) => segments.every((seg) => seg.end > seg.start),
      "Chaque segment doit avoir une fin après le début",
    ),
});

export type TClipCutPayload = z.infer<typeof clipCutSchema>;

export const clipExportSchema = clipCutSchema.extend({
  layout: clipLayoutExportSchema.optional(),
  subtitleTiming: subtitleTimingExportSchema.optional(),
  zoomEffects: z.array(zoomEffectExportSchema).optional(),
  imageOverlays: z.array(imageOverlayExportSchema).optional(),
  timelineVideos: z.array(timelineVideoExportSchema).optional(),
  textOverlays: z.array(textOverlayExportSchema).optional(),
  subtitleWords: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        start: z.number().min(0),
        end: z.number().positive(),
      }),
    )
    .optional(),
  subtitleStyle: z
    .object({
      preset: z.enum(["word-pop", "word-pop-accent"]),
      fontId: subtitleFontIdSchema.optional(),
      fontFamily: z.string().min(1),
      fontSize: z.number().positive(),
      fillColor: z.string().min(1),
      strokeColor: z.string().min(1),
      strokeWidth: z.number().min(0),
      position: z.enum(["center", "lower"]),
      animation: z.enum(["pop", "bounce", "fade", "scale"]).optional(),
      glowColor: z.string().min(1).optional(),
      glowIntensity: z.number().min(0).max(100).optional(),
      glowSpread: z.number().min(0).max(40).optional(),
      layoutX: z.number().min(0).max(1).optional(),
      layoutY: z.number().min(0).max(1).optional(),
      previewContainerWidth: z.number().positive().optional(),
    })
    .optional(),
  previewContainerWidth: z.number().positive().optional(),
});

export type TClipExportPayload = z.infer<typeof clipExportSchema>;

export const transcribeClipSchema = z.object({
  keepSegments: z.array(clipSegmentSchema).optional(),
  timelineVideos: z.array(timelineVideoExportSchema).optional(),
});

export type TTranscribeClipPayload = z.infer<typeof transcribeClipSchema>;
