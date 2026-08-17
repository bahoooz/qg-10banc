import {
  clampImageOverlayZone,
  type ImageOverlayZone,
} from "./clipImageOverlays";

export const OVERLAY_LAYOUT_CENTER = 0.5;
export const OVERLAY_LAYOUT_SNAP_THRESHOLD = 0.035;

export function snapNormalizedAxis(value: number): {
  value: number;
  snapped: boolean;
} {
  if (Math.abs(value - OVERLAY_LAYOUT_CENTER) < OVERLAY_LAYOUT_SNAP_THRESHOLD) {
    return { value: OVERLAY_LAYOUT_CENTER, snapped: true };
  }
  return { value, snapped: false };
}

export function snapImageOverlayZoneMove(zone: ImageOverlayZone): {
  zone: ImageOverlayZone;
  snappedX: boolean;
  snappedY: boolean;
} {
  const centerX = zone.x + zone.width / 2;
  const centerY = zone.y + zone.height / 2;
  const snappedX = snapNormalizedAxis(centerX);
  const snappedY = snapNormalizedAxis(centerY);

  return {
    zone: clampImageOverlayZone({
      ...zone,
      x: snappedX.value - zone.width / 2,
      y: snappedY.value - zone.height / 2,
    }),
    snappedX: snappedX.snapped,
    snappedY: snappedY.snapped,
  };
}
