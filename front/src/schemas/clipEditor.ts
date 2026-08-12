import { z } from "zod";

const TWITCH_CLIP_PATTERNS = [
  /^https?:\/\/(www\.)?clips\.twitch\.tv\/[\w-]+$/i,
  /^https?:\/\/(www\.)?twitch\.tv\/[\w]+\/clip\/[\w-]+$/i,
];

/** Retire query string (?range=7d…) et hash avant validation. */
export function normalizeTwitchClipUrl(url: string): string {
  return url.trim().replace(/[?#].*$/, "");
}

export function isTwitchClipUrl(url: string): boolean {
  const normalized = normalizeTwitchClipUrl(url);
  return TWITCH_CLIP_PATTERNS.some((pattern) => pattern.test(normalized));
}

export const twitchClipUrlSchema = z
  .string()
  .trim()
  .min(1, "Colle un lien de clip Twitch")
  .transform(normalizeTwitchClipUrl)
  .refine(isTwitchClipUrl, {
    message: "Lien Twitch invalide (clips.twitch.tv ou twitch.tv/.../clip/...)",
  });

export const ACCEPTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const ACCEPTED_VIDEO_EXTENSIONS = ".mp4,.webm,.mov";

export function isAcceptedVideoFile(file: File): boolean {
  if (ACCEPTED_VIDEO_MIME_TYPES.includes(file.type as (typeof ACCEPTED_VIDEO_MIME_TYPES)[number])) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "mp4" || ext === "webm" || ext === "mov";
}
