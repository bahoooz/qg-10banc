import type { FollowStickerPlatform } from "./followSticker";

/** Chemins SVG officiels (Simple Icons). */
const PLATFORM_ICON_PATHS: Record<FollowStickerPlatform, string> = {
  twitch:
    "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  kick: "M3 3h7v4.585h-.004L8.917 7.816a25.736 25.736 0 0 1-1.782 2.686 25.924 25.924 0 0 1-1.781 2.687L10 18.414V22H3V3zm18 0h-7v4.585h.004l1.079 1.231a25.736 25.736 0 0 1 1.782 2.686 25.924 25.924 0 0 1 1.781 2.687L14 18.414V22h7V3z",
};

export function getPlatformIconSvgMarkup(
  platform: FollowStickerPlatform,
  fill = "#FFFFFF",
): string {
  return `<path fill="${fill}" d="${PLATFORM_ICON_PATHS[platform]}"/>`;
}

type FollowStickerPlatformIconProps = {
  platform: FollowStickerPlatform;
  className?: string;
};

export function FollowStickerPlatformIcon({
  platform,
  className,
}: FollowStickerPlatformIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d={PLATFORM_ICON_PATHS[platform]} />
    </svg>
  );
}
