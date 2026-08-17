import type { ImageOverlayZone } from "./clipImageOverlays";
import { captureFollowStickerToPngDataUrl } from "./followStickerCapture";
import { getPlatformIconSvgMarkup } from "./followStickerPlatformIcons";
export type FollowStickerPlatform = "twitch" | "youtube" | "kick";

export type FollowStickerConfig = {
  type: "follow";
  username: string;
  platform: FollowStickerPlatform;
};

type PlatformStyle = {
  label: string;
  accentColor: string;
};

const PLATFORM_STYLES: Record<FollowStickerPlatform, PlatformStyle> = {
  twitch: {
    label: "Twitch",
    accentColor: "#9146FF",
  },
  youtube: {
    label: "YouTube",
    accentColor: "#FF0033",
  },
  kick: {
    label: "Kick",
    accentColor: "#53FC18",
  },
};

export const FOLLOW_STICKER_PLATFORMS: FollowStickerPlatform[] = [
  "twitch",
  "youtube",
  "kick",
];

export function getFollowStickerPlatformStyle(
  platform: FollowStickerPlatform,
): PlatformStyle {
  return PLATFORM_STYLES[platform];
}

/** Dépassement du tab au-dessus du pill (-top-2.5 Tailwind). */
export const FOLLOW_STICKER_TAB_OVERHANG = 10;

const PILL_PAD_X = 12;
const PILL_PAD_Y = 6;
const PILL_ICON_SIZE = 16;
const PILL_GAP = 12;
const PILL_TEXT_SIZE = 20;
const PILL_BORDER = 4;
const TAB_PAD_X = 8;
const TAB_PAD_Y = 2;
const TAB_FONT_SIZE = 8;
const TAB_LABEL = "Viens follow";

export const FOLLOW_STICKER_DESIGN_HEIGHT =
  FOLLOW_STICKER_TAB_OVERHANG + PILL_PAD_Y * 2 + PILL_TEXT_SIZE + PILL_BORDER;

export const FOLLOW_STICKER_VIEWBOX = { width: 420, height: FOLLOW_STICKER_DESIGN_HEIGHT } as const;

/** Boost de taille à l'ajout (design px → zone preview). */
export const FOLLOW_STICKER_BASE_SCALE = 1.15;

export const EXPORT_CANVAS_WIDTH = 1080;
export const EXPORT_CANVAS_HEIGHT = 1920;
export const PREVIEW_CANVAS_ASPECT = EXPORT_CANVAS_WIDTH / EXPORT_CANVAS_HEIGHT;

function truncateUsername(username: string, maxLength = 24): string {
  const trimmed = username.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function measurePillWidth(username: string): number {
  const text = truncateUsername(username.trim() || "Pseudo");
  const textWidth = text.length * PILL_TEXT_SIZE * 0.55;
  return PILL_PAD_X * 2 + PILL_ICON_SIZE + PILL_GAP + textWidth;
}

function measureTabWidth(): number {
  const textWidth = TAB_LABEL.length * TAB_FONT_SIZE * 0.58;
  return textWidth + TAB_PAD_X * 2;
}

export function estimateFollowStickerDesignSize(username: string): {
  width: number;
  height: number;
} {
  const pillWidth = measurePillWidth(username);
  const tabWidth = measureTabWidth();
  return {
    width: Math.max(Math.ceil(Math.max(pillWidth, tabWidth)), 120),
    height: FOLLOW_STICKER_DESIGN_HEIGHT,
  };
}

export function getFollowStickerNormalizedAspect(username: string): number {
  const { width, height } = estimateFollowStickerDesignSize(username);
  return PREVIEW_CANVAS_ASPECT * (height / width);
}

export function createDefaultFollowStickerZone(username: string): ImageOverlayZone {
  const design = estimateFollowStickerDesignSize(username);
  const pixelWidth = design.width * FOLLOW_STICKER_BASE_SCALE;
  const pixelHeight = design.height * FOLLOW_STICKER_BASE_SCALE;

  const width = Math.min(0.98, pixelWidth / EXPORT_CANVAS_WIDTH);
  const height = pixelHeight / EXPORT_CANVAS_HEIGHT;
  const y = Math.max(0, 1 - height - 0.03);

  return {
    x: (1 - width) / 2,
    y,
    width,
    height,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildFollowStickerSvg(config: FollowStickerConfig): string {
  const username = escapeXml(truncateUsername(config.username) || "Pseudo");
  const { width, height } = estimateFollowStickerDesignSize(config.username);
  const pillWidth = measurePillWidth(config.username);
  const tabWidth = measureTabWidth();
  const tabHeight = TAB_FONT_SIZE + TAB_PAD_Y * 2;
  const pillHeight = PILL_PAD_Y * 2 + PILL_TEXT_SIZE + PILL_BORDER;
  const pillX = (width - pillWidth) / 2;
  const pillY = FOLLOW_STICKER_TAB_OVERHANG;
  const tabX = (width - tabWidth) / 2;
  const tabY = pillY - FOLLOW_STICKER_TAB_OVERHANG;
  const pillRadius = pillHeight / 2;
  const textX = pillX + PILL_PAD_X + PILL_ICON_SIZE + PILL_GAP;
  const accent = "#8B5CF6";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect x="${tabX}" y="${tabY}" width="${tabWidth}" height="${tabHeight}" rx="8" fill="#000000"/>
  <text x="${width / 2}" y="${tabY + tabHeight - TAB_PAD_Y - 1}" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="${TAB_FONT_SIZE}" font-weight="800" letter-spacing="1.4">${TAB_LABEL.toUpperCase()}</text>
  <rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${pillHeight - PILL_BORDER}" rx="${pillRadius}" fill="#000000"/>
  <rect x="${pillX}" y="${pillY + pillHeight - PILL_BORDER}" width="${pillWidth}" height="${PILL_BORDER}" rx="2" fill="${accent}"/>
  <svg x="${pillX + PILL_PAD_X}" y="${pillY + (pillHeight - PILL_BORDER - PILL_ICON_SIZE) / 2}" width="${PILL_ICON_SIZE}" height="${PILL_ICON_SIZE}" viewBox="0 0 24 24">${getPlatformIconSvgMarkup(config.platform)}</svg>
  <text x="${textX}" y="${pillY + (pillHeight - PILL_BORDER) / 2 + PILL_TEXT_SIZE * 0.35}" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="${PILL_TEXT_SIZE}" font-weight="400">${username}</text>
</svg>`;
}

export function followStickerToDataUrl(config: FollowStickerConfig): string {
  const svg = buildFollowStickerSvg(config);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function followStickerToPngDataUrl(
  config: FollowStickerConfig,
  options: { zone: ImageOverlayZone; pixelRatio?: number },
): Promise<string> {
  return captureFollowStickerToPngDataUrl(config, options);
}
export function isFollowStickerConfig(
  value: unknown,
): value is FollowStickerConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FollowStickerConfig>;
  return (
    candidate.type === "follow" &&
    typeof candidate.username === "string" &&
    (candidate.platform === "twitch" ||
      candidate.platform === "youtube" ||
      candidate.platform === "kick")
  );
}
