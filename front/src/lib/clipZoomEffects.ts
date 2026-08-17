import type { CamZone, NormalizedRegion } from "./clipLayout";
import {
  sourceTimeToSequenceTime,
  getEditedDuration,
  sequenceTimeToSourceTime,
  type TimeRange,
} from "./clipTime";

/** Zone de zoom = sélection source 9:16 (format de la preview verticale). */
export type ZoomEffectZone = CamZone;

export type ZoomEffect = {
  id: string;
  start: number;
  end: number;
  intensity: number;
  zone: ZoomEffectZone;
  /** Timestamps exprimés en temps séquence (timeline étendue). */
  usesSequenceTime?: boolean;
};

export type PackedZoomEffect = ZoomEffect & {
  sequenceStart: number;
  sequenceEnd: number;
};

/** À 100 % d'intensité, on ne garde que 20 % central de la zone (zoom max). */
export const ZOOM_INTENSITY_MIN_CROP = 0.2;

export const DEFAULT_ZOOM_ZONE_WIDTH = 0.2;

export const DEFAULT_ZOOM_DRAFT_INTENSITY = 50;
export const DEFAULT_ZOOM_EFFECT_DURATION = 2;
export const MIN_ZOOM_EFFECT_DURATION = 0.35;
export const ZOOM_INTENSITY_RANGE = { min: 0, max: 100, step: 5 };

/** Hauteur normalisée d'une zone 9:16 à partir de sa largeur. */
export function zoomZoneHeightFromWidth(
  width: number,
  videoWidth: number,
  videoHeight: number,
): number {
  const aspect = (videoWidth || 16) / (videoHeight || 9);
  return width * aspect * (16 / 9);
}

export function createDefaultZoomZone(
  videoWidth: number,
  videoHeight: number,
): ZoomEffectZone {
  const width = DEFAULT_ZOOM_ZONE_WIDTH;
  const height = zoomZoneHeightFromWidth(width, videoWidth, videoHeight);
  return clampZoomZone(
    { x: 0.4, y: 0.08, width, height },
    videoWidth,
    videoHeight,
  );
}

export function createZoomEffectId(start: number): string {
  return `zoom-${start.toFixed(3)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function clampZoomIntensity(intensity: number): number {
  return Math.max(
    ZOOM_INTENSITY_RANGE.min,
    Math.min(ZOOM_INTENSITY_RANGE.max, intensity),
  );
}

/** Région source affichée dans la preview 9:16 (= zone 9:16 sélectionnée). */
export function getEffectiveZoomRegion(zone: ZoomEffectZone): NormalizedRegion {
  return {
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
  };
}

export function clampZoomZone(
  zone: ZoomEffectZone,
  videoWidth: number,
  videoHeight: number,
): ZoomEffectZone {
  const vw = videoWidth || 16;
  const vh = videoHeight || 9;

  let width = clamp01(Math.max(0.06, Math.min(0.75, zone.width)));
  let height = zoomZoneHeightFromWidth(width, vw, vh);

  if (height > 0.92) {
    height = 0.92;
    width = height / (zoomZoneHeightFromWidth(1, vw, vh));
  }

  return {
    width,
    height,
    x: clamp01(Math.min(Math.max(0, zone.x), Math.max(0, 1 - width))),
    y: clamp01(Math.min(Math.max(0, zone.y), Math.max(0, 1 - height))),
  };
}
export function cloneZoomEffects(effects: ZoomEffect[]): ZoomEffect[] {
  return effects.map((effect) => ({
    ...effect,
    zone: { ...effect.zone },
  }));
}

export function findZoomEffectAtTime(
  effects: ZoomEffect[],
  time: number,
): ZoomEffect | undefined {
  return effects.find(
    (effect) =>
      !effect.usesSequenceTime &&
      time >= effect.start &&
      time < effect.end,
  );
}

export function findZoomEffectAtSequenceTime(
  effects: ZoomEffect[],
  sequenceTime: number,
): ZoomEffect | undefined {
  return effects.find(
    (effect) =>
      effect.usesSequenceTime &&
      sequenceTime >= effect.start &&
      sequenceTime < effect.end,
  );
}

export function getActiveZoomEffectAtTime(
  effects: ZoomEffect[],
  time: number,
): ZoomEffect | null {
  return findZoomEffectAtTime(effects, time) ?? null;
}

export function getActiveZoomEffectAtSequenceTime(
  effects: ZoomEffect[],
  sequenceTime: number,
): ZoomEffect | null {
  return findZoomEffectAtSequenceTime(effects, sequenceTime) ?? null;
}

export function getActiveZoomEffectForPlayhead(
  effects: ZoomEffect[],
  sequenceTime: number,
  sourceTime: number,
): ZoomEffect | null {
  return (
    getActiveZoomEffectAtSequenceTime(effects, sequenceTime) ??
    getActiveZoomEffectAtTime(effects, sourceTime)
  );
}

export function mapZoomEffectsToSequence(
  effects: ZoomEffect[],
  keepSegments: TimeRange[],
): PackedZoomEffect[] {
  if (keepSegments.length === 0) return [];

  return effects
    .filter((effect) =>
      effect.usesSequenceTime
        ? true
        : keepSegments.some(
            (segment) => effect.end > segment.start && effect.start < segment.end,
          ),
    )
    .map((effect) => ({
      ...effect,
      sequenceStart: effect.usesSequenceTime
        ? effect.start
        : sourceTimeToSequenceTime(effect.start, keepSegments),
      sequenceEnd: effect.usesSequenceTime
        ? effect.end
        : sourceTimeToSequenceTime(effect.end, keepSegments),
    }))
    .filter((effect) => effect.sequenceEnd > effect.sequenceStart + 0.05)
    .sort((a, b) => a.sequenceStart - b.sequenceStart);
}

export function getKeepSegmentContainingTime(
  time: number,
  keepSegments: TimeRange[],
): TimeRange | undefined {
  return keepSegments.find(
    (segment) => time >= segment.start && time < segment.end,
  );
}

export function createZoomEffectAtTime(
  time: number,
  keepSegments: TimeRange[],
  videoWidth: number,
  videoHeight: number,
): ZoomEffect | null {
  const segment = getKeepSegmentContainingTime(time, keepSegments);
  if (!segment) return null;

  const end = Math.min(time + DEFAULT_ZOOM_EFFECT_DURATION, segment.end);
  if (end - time < MIN_ZOOM_EFFECT_DURATION) return null;

  return {
    id: createZoomEffectId(time),
    start: time,
    end,
    intensity: 0,
    zone: createDefaultZoomZone(videoWidth, videoHeight),
  };
}

export function createZoomEffectAtSequenceTime(
  sequenceTime: number,
  timelineDuration: number,
  videoWidth: number,
  videoHeight: number,
): ZoomEffect | null {
  const end = Math.min(sequenceTime + DEFAULT_ZOOM_EFFECT_DURATION, timelineDuration);
  if (end - sequenceTime < MIN_ZOOM_EFFECT_DURATION) return null;

  return {
    id: createZoomEffectId(sequenceTime),
    start: sequenceTime,
    end,
    intensity: 0,
    zone: createDefaultZoomZone(videoWidth, videoHeight),
    usesSequenceTime: true,
  };
}

export function updateZoomEffectBounds(
  effect: ZoomEffect,
  patch: Partial<Pick<ZoomEffect, "start" | "end">>,
  keepSegments: TimeRange[],
  timelineDuration?: number,
): ZoomEffect | null {
  const start = patch.start ?? effect.start;
  const end = patch.end ?? effect.end;
  if (end - start < MIN_ZOOM_EFFECT_DURATION) return null;

  if (effect.usesSequenceTime) {
    const maxDuration = timelineDuration ?? getEditedDuration(keepSegments);
    if (start < 0 || end > maxDuration + 0.01) return null;
    return { ...effect, start, end };
  }

  const overlaps = keepSegments.some(
    (segment) => end > segment.start && start < segment.end,
  );
  if (!overlaps) return null;

  return { ...effect, start, end };
}

export function moveZoomEffectBySequenceOffset(
  effect: ZoomEffect,
  sequenceOffset: number,
  keepSegments: TimeRange[],
  initialSeqStart?: number,
  initialSeqEnd?: number,
  timelineDuration?: number,
): ZoomEffect | null {
  if (keepSegments.length === 0) return null;

  const editedDuration = getEditedDuration(keepSegments);
  const maxDuration = timelineDuration ?? editedDuration;
  const seqStart =
    initialSeqStart ??
    (effect.usesSequenceTime
      ? effect.start
      : sourceTimeToSequenceTime(effect.start, keepSegments));
  const seqEnd =
    initialSeqEnd ??
    (effect.usesSequenceTime
      ? effect.end
      : sourceTimeToSequenceTime(effect.end, keepSegments));
  const seqDuration = seqEnd - seqStart;

  let newSeqStart = seqStart + sequenceOffset;
  if (newSeqStart < 0) newSeqStart = 0;
  const maxStart = effect.usesSequenceTime
    ? maxDuration
    : editedDuration;
  if (newSeqStart + seqDuration > maxStart) {
    newSeqStart = Math.max(0, maxStart - seqDuration);
  }

  const newSeqEnd = newSeqStart + seqDuration;

  if (effect.usesSequenceTime) {
    return updateZoomEffectBounds(
      effect,
      { start: newSeqStart, end: newSeqEnd },
      keepSegments,
      maxDuration,
    );
  }

  const newStart = sequenceTimeToSourceTime(newSeqStart, keepSegments);
  const newEnd = sequenceTimeToSourceTime(newSeqEnd, keepSegments);

  return updateZoomEffectBounds(effect, { start: newStart, end: newEnd }, keepSegments);
}
