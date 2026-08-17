import { FOLLOW_STICKER_TAB_OVERHANG } from "./followSticker";

export type FollowStickerNaturalSize = {
  width: number;
  height: number;
};

export function measureFollowStickerNaturalSize(
  badgeRoot: HTMLElement,
): FollowStickerNaturalSize {
  return {
    width: badgeRoot.offsetWidth,
    height: badgeRoot.offsetHeight + FOLLOW_STICKER_TAB_OVERHANG,
  };
}

export function computeFollowStickerRenderScale(
  natural: FollowStickerNaturalSize,
  zonePixelWidth: number,
  zonePixelHeight: number,
): number {
  if (
    natural.width <= 0 ||
    natural.height <= 0 ||
    zonePixelWidth <= 0 ||
    zonePixelHeight <= 0
  ) {
    return 1;
  }

  return Math.min(
    zonePixelWidth / natural.width,
    zonePixelHeight / natural.height,
  );
}

export async function waitForFollowStickerCaptureReady(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
