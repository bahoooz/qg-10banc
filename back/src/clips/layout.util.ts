export type CamZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NormalizedRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutPayload = {
  camShape: "rounded" | "circle" | "free";
  sourceCam: CamZone;
  verticalCam: { x: number; y: number };
  verticalCamZone: CamZone;
  verticalCropPan: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function makeEven(value: number): number {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

/** Région 9:16 sur la source horizontale (identique au front). */
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

export function regionToPixelCrop(
  region: NormalizedRegion,
  videoWidth: number,
  videoHeight: number,
): { width: number; height: number; x: number; y: number } {
  return {
    width: makeEven(region.width * videoWidth),
    height: makeEven(region.height * videoHeight),
    x: makeEven(region.x * videoWidth),
    y: makeEven(region.y * videoHeight),
  };
}

export function buildBgCropScaleFilter(
  region: NormalizedRegion,
  videoWidth: number,
  videoHeight: number,
): string {
  const crop = regionToPixelCrop(region, videoWidth, videoHeight);
  return `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=1080:1920:flags=lanczos`;
}
