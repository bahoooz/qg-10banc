export type CamShape = "rounded" | "circle" | "free";

/** Zone cam normalisée : width = fraction largeur vidéo, height = fraction hauteur vidéo. */
export type CamZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NormalizedPoint = {
  x: number;
  y: number;
};

export type NormalizedRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ClipLayoutState = {
  camShape: CamShape;
  sourceCam: CamZone;
  verticalCam: NormalizedPoint;
  verticalCamZone: CamZone;
  verticalCropPan: number;
};

export type DisplayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SOURCE_CAM_W = 0.2;
const SOURCE_CAM_H = SOURCE_CAM_W * (16 / 9);
const VERTICAL_CAM_W = 0.38;
const VERTICAL_CAM_H = VERTICAL_CAM_W * (9 / 16);

export const CROP_PAN_CENTER = 0.5;
export const CROP_PAN_SNAP_THRESHOLD = 0.035;

export const DEFAULT_LAYOUT: ClipLayoutState = {
  camShape: "rounded",
  sourceCam: {
    x: 0,
    y: 1 - SOURCE_CAM_H,
    width: SOURCE_CAM_W,
    height: SOURCE_CAM_H,
  },
  verticalCam: {
    x: VERTICAL_CAM_W / 2,
    y: VERTICAL_CAM_H / 2,
  },
  verticalCamZone: {
    x: 0,
    y: 0,
    width: VERTICAL_CAM_W,
    height: VERTICAL_CAM_H,
  },
  verticalCropPan: CROP_PAN_CENTER,
};

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getCamShapeClass(shape: CamShape): string {
  switch (shape) {
    case "circle":
      return "rounded-full";
    case "free":
      return "rounded-md";
    default:
      return "rounded-xl";
  }
}

export function getVideoContentRect(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
): DisplayRect {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const containerAspect = containerWidth / containerHeight;
  const videoAspect = videoWidth / videoHeight;

  if (videoAspect > containerAspect) {
    const width = containerWidth;
    const height = containerWidth / videoAspect;
    return { x: 0, y: (containerHeight - height) / 2, width, height };
  }

  const height = containerHeight;
  const width = containerHeight * videoAspect;
  return { x: (containerWidth - width) / 2, y: 0, width, height };
}

/** Carré en pixels sur le conteneur : heightFrac = widthFrac × containerAspect */
export function squareHeightFraction(
  widthFraction: number,
  containerAspect: number,
): number {
  return widthFraction * containerAspect;
}

export function camZoneToPixels(zone: CamZone, content: DisplayRect): DisplayRect {
  return {
    x: content.x + zone.x * content.width,
    y: content.y + zone.y * content.height,
    width: zone.width * content.width,
    height: zone.height * content.height,
  };
}

export function pixelsToCamZone(
  pixelX: number,
  pixelY: number,
  widthPx: number,
  heightPx: number,
  content: DisplayRect,
): CamZone {
  if (content.width <= 0 || content.height <= 0) {
    return DEFAULT_LAYOUT.sourceCam;
  }

  return {
    x: (pixelX - content.x) / content.width,
    y: (pixelY - content.y) / content.height,
    width: widthPx / content.width,
    height: heightPx / content.height,
  };
}

export function clampSourceCamZone(
  zone: CamZone,
  videoWidth: number,
  videoHeight: number,
  shape: CamShape,
): CamZone {
  const aspect = videoWidth / videoHeight;
  let width = clamp01(Math.max(0.05, Math.min(0.85, zone.width)));
  let height = clamp01(Math.max(0.05, Math.min(0.85, zone.height)));

  if (shape !== "free") {
    height = width * aspect;
  }

  return {
    width,
    height,
    x: clamp01(Math.min(Math.max(0, zone.x), Math.max(0, 1 - width))),
    y: clamp01(Math.min(Math.max(0, zone.y), Math.max(0, 1 - height))),
  };
}

export function clampVerticalCamZone(
  zone: CamZone,
  shape: CamShape,
  previewAspect = 9 / 16,
): CamZone {
  let width = clamp01(Math.max(0.08, Math.min(1, zone.width)));
  let height = clamp01(Math.max(0.05, Math.min(0.85, zone.height)));

  if (shape !== "free") {
    height = squareHeightFraction(width, previewAspect);
  }

  return { x: 0, y: 0, width, height };
}

export function clampVerticalCamPoint(
  point: NormalizedPoint,
  halfWidth: number,
  halfHeight: number,
): NormalizedPoint {
  return {
    x: clamp01(Math.min(Math.max(point.x, halfWidth), 1 - halfWidth)),
    y: clamp01(Math.min(Math.max(point.y, halfHeight), 1 - halfHeight)),
  };
}

export function getVerticalCropRegion(
  videoWidth: number,
  videoHeight: number,
  pan: number,
): NormalizedRegion {
  const aspect = videoWidth / videoHeight;
  const cropWidth = (9 / 16) / aspect;
  const maxPan = Math.max(0, 1 - cropWidth);
  return { x: clamp01(pan) * maxPan, y: 0, width: cropWidth, height: 1 };
}

export function clampVerticalCropPan(pan: number): number {
  return clamp01(pan);
}

export function snapCropPanToCenter(pan: number): {
  pan: number;
  snapped: boolean;
} {
  if (Math.abs(pan - CROP_PAN_CENTER) < CROP_PAN_SNAP_THRESHOLD) {
    return { pan: CROP_PAN_CENTER, snapped: true };
  }
  return { pan, snapped: false };
}

export function isNearCropPanCenter(pan: number): boolean {
  return Math.abs(pan - CROP_PAN_CENTER) < CROP_PAN_SNAP_THRESHOLD * 1.5;
}

export function getVideoRegionStyle(region: NormalizedRegion): {
  width: string;
  height: string;
  left: string;
  top: string;
} {
  return {
    width: `${100 / region.width}%`,
    height: `${100 / region.height}%`,
    left: `${(-region.x / region.width) * 100}%`,
    top: `${(-region.y / region.height) * 100}%`,
  };
}

export function camZoneToVideoRegion(zone: CamZone): NormalizedRegion {
  return {
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
  };
}

export function pointerToNormalizedPoint(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
): NormalizedPoint {
  return {
    x: clamp01((clientX - containerRect.left) / containerRect.width),
    y: clamp01((clientY - containerRect.top) / containerRect.height),
  };
}

export function panFromContainerRatio(
  ratio: number,
  videoWidth: number,
  videoHeight: number,
): number {
  const cropWidth = getVerticalCropRegion(videoWidth, videoHeight, 0).width;
  const maxPan = Math.max(0, 1 - cropWidth);
  if (maxPan <= 0) return 0;
  return clampVerticalCropPan(ratio * maxPan);
}

/** Convertit un pan de crop (0–1, 0.5 = centre) en ratio horizontal conteneur. */
export function cropPanToContainerRatio(
  pan: number,
  videoWidth: number,
  videoHeight: number,
): number {
  const cropWidth = getVerticalCropRegion(videoWidth, videoHeight, 0).width;
  const maxPan = Math.max(0.001, 1 - cropWidth);
  return pan / maxPan;
}
