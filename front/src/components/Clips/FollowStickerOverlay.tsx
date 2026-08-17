import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import {
  FOLLOW_STICKER_BASE_SCALE,
  type FollowStickerConfig,
} from "../../lib/followSticker";
import {
  clampImageOverlayZone,
  type ImageOverlayZone,
} from "../../lib/clipImageOverlays";
import type { FollowStickerNaturalSize } from "../../lib/followStickerMeasure";
import { FollowStickerScaledStage } from "./FollowStickerScaledStage";

type FollowStickerOverlayProps = {
  config: FollowStickerConfig;
  zone: ImageOverlayZone;
  containerRef: RefObject<HTMLDivElement | null>;
  onZoneSync?: (zone: ImageOverlayZone) => void;
};

/**
 * Affiche le sticker et synchronise la zone overlay sur sa taille visuelle exacte.
 */
export function FollowStickerOverlay({
  config,
  zone,
  containerRef,
  onZoneSync,
}: FollowStickerOverlayProps) {
  const lastSyncKeyRef = useRef("");

  const handleMeasured = useCallback(
    (measure: {
      natural: FollowStickerNaturalSize;
    }) => {
      if (!onZoneSync) return;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      if (containerRect.width <= 0 || containerRect.height <= 0) return;

      const { natural } = measure;
      const syncKey = `${config.username}|${config.platform}|${natural.width}|${natural.height}`;
      if (syncKey === lastSyncKeyRef.current) return;

      const targetPixelW = natural.width * FOLLOW_STICKER_BASE_SCALE;
      const targetPixelH = natural.height * FOLLOW_STICKER_BASE_SCALE;
      const normW = targetPixelW / containerRect.width;
      const normH = targetPixelH / containerRect.height;

      const centerX = zone.x + zone.width / 2;
      const bottomY = zone.y + zone.height;

      onZoneSync(
        clampImageOverlayZone({
          x: centerX - normW / 2,
          y: Math.max(0, bottomY - normH),
          width: normW,
          height: normH,
        }),
      );
      lastSyncKeyRef.current = syncKey;
    },
    [
      config.platform,
      config.username,
      containerRef,
      onZoneSync,
      zone.height,
      zone.width,
      zone.x,
      zone.y,
    ],
  );

  return (
    <FollowStickerScaledStage
      config={config}
      fill
      className="h-full w-full"
      onMeasured={handleMeasured}
    />
  );
}
