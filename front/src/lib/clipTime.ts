import type { ZoomEffect } from "./clipZoomEffects";
import { cloneZoomEffects } from "./clipZoomEffects";
import type { ImageOverlay } from "./clipImageOverlays";
import { cloneImageOverlays } from "./clipImageOverlays";
import type { TextOverlay } from "./clipTextOverlays";
import { cloneTextOverlays } from "./clipTextOverlays";
import type { SoundboardClip } from "./clipSoundboards";
import { cloneSoundboards } from "./clipSoundboards";
import type { TimelineVideoClip } from "./clipTimelineVideos";
import { cloneTimelineVideos } from "./clipTimelineVideos";

export const DEFAULT_SEGMENT_SPEED = 0;
export const MIN_SEGMENT_SPEED = -200;
export const MAX_SEGMENT_SPEED = 200;

export type ClipSegment = {
  id: string;
  start: number;
  end: number;
  speed: number;
};

export type TimeRange = {
  start: number;
  end: number;
  /** 0 = normal. +200 = 200 % plus rapide (×3). -200 = 200 % plus lent (×⅓). */
  speed?: number;
};

export const MAX_TIMELINE_HISTORY = 50;

export type TimelineSnapshot = {
  keepSegments: TimeRange[];
  sourceDuration: number;
  previewUrl: string;
  currentTime: number;
  /** Segments source utilisés pour le dernier cut FFmpeg, si applicable */
  ffmpegKeepSegments: TimeRange[] | null;
  zoomEffects: ZoomEffect[];
  imageOverlays: ImageOverlay[];
  textOverlays: TextOverlay[];
  soundboards: SoundboardClip[];
  timelineVideos: TimelineVideoClip[];
};

export function clampSegmentSpeed(value: number): number {
  if (value === 250) return DEFAULT_SEGMENT_SPEED;
  if (!Number.isFinite(value)) return DEFAULT_SEGMENT_SPEED;
  return Math.max(MIN_SEGMENT_SPEED, Math.min(MAX_SEGMENT_SPEED, value));
}

export function getSegmentSpeed(range: TimeRange): number {
  return clampSegmentSpeed(range.speed ?? DEFAULT_SEGMENT_SPEED);
}

/** Taux de lecture vidéo (1 = normal, 3 = +200 %, ⅓ = -200 %). */
export function getPlaybackRateForSpeed(speedValue: number): number {
  const value = clampSegmentSpeed(speedValue);
  if (value >= 0) {
    return 1 + value / 100;
  }
  return 1 / (1 + Math.abs(value) / 100);
}

export function getSourceSegmentDuration(range: TimeRange): number {
  return Math.max(0, range.end - range.start);
}

/** Durée affichée sur la timeline (s'étire au ralenti, se compresse à l'accéléré). */
export function getSequenceSegmentDuration(range: TimeRange): number {
  const sourceDuration = getSourceSegmentDuration(range);
  const rate = getPlaybackRateForSpeed(getSegmentSpeed(range));
  return sourceDuration / rate;
}

export function formatSpeedLabel(speed: number): string {
  const value = clampSegmentSpeed(speed);
  if (value === 0) return "1×";

  const rate = getPlaybackRateForSpeed(value);
  const rateLabel = `${parseFloat(rate.toFixed(2))}×`;
  if (value > 0) return `+${value}% (${rateLabel})`;
  return `${value}% (${rateLabel})`;
}

export function formatSpeedSliderValue(speed: number): string {
  const value = clampSegmentSpeed(speed);
  if (value === 0) return "0 %";
  if (value > 0) return `+${value} %`;
  return `${value} %`;
}

export function cloneKeepSegments(segments: TimeRange[]): TimeRange[] {
  return segments.map((segment) => ({ ...segment }));
}

export function cloneTimelineSnapshot(snapshot: TimelineSnapshot): TimelineSnapshot {
  return {
    keepSegments: cloneKeepSegments(snapshot.keepSegments),
    sourceDuration: snapshot.sourceDuration,
    previewUrl: snapshot.previewUrl,
    currentTime: snapshot.currentTime,
    ffmpegKeepSegments: snapshot.ffmpegKeepSegments
      ? cloneKeepSegments(snapshot.ffmpegKeepSegments)
      : null,
    zoomEffects: cloneZoomEffects(snapshot.zoomEffects ?? []),
    imageOverlays: cloneImageOverlays(snapshot.imageOverlays ?? []),
    textOverlays: cloneTextOverlays(snapshot.textOverlays ?? []),
    soundboards: cloneSoundboards(snapshot.soundboards ?? []),
    timelineVideos: cloneTimelineVideos(snapshot.timelineVideos ?? []),
  };
}

export function formatClipTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

const MIN_CUT_GAP = 0.25;

export function buildSegmentsFromKeepRanges(ranges: TimeRange[]): ClipSegment[] {
  return [...ranges]
    .sort((a, b) => a.start - b.start)
    .map((range, index) => ({
      id: `seg-${index}-${range.start.toFixed(3)}-${range.end.toFixed(3)}`,
      start: range.start,
      end: range.end,
      speed: getSegmentSpeed(range),
    }));
}

export function getEditedDuration(ranges: TimeRange[]): number {
  return ranges.reduce(
    (sum, range) => sum + getSequenceSegmentDuration(range),
    0,
  );
}

export type PackedSegment = ClipSegment & {
  sequenceStart: number;
  sequenceEnd: number;
};

/** Segments affichés bout-à-bout sans espace vide (style Premiere Pro). */
export function buildPackedSegments(ranges: TimeRange[]): PackedSegment[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let sequenceOffset = 0;

  return sorted.map((range, index) => {
    const sequenceDuration = getSequenceSegmentDuration(range);
    const packed: PackedSegment = {
      id: `seg-${index}-${range.start.toFixed(3)}-${range.end.toFixed(3)}`,
      start: range.start,
      end: range.end,
      speed: getSegmentSpeed(range),
      sequenceStart: sequenceOffset,
      sequenceEnd: sequenceOffset + sequenceDuration,
    };
    sequenceOffset += sequenceDuration;
    return packed;
  });
}

export function getSpeedAtSourceTime(
  sourceTime: number,
  keepSegments: TimeRange[],
): number {
  const segment = keepSegments.find(
    (range) => sourceTime >= range.start && sourceTime < range.end,
  );
  return segment ? getSegmentSpeed(segment) : DEFAULT_SEGMENT_SPEED;
}

/** Temps source → position sur la timeline compactée. */
export function sourceTimeToSequenceTime(
  sourceTime: number,
  keepSegments: TimeRange[],
): number {
  const packed = buildPackedSegments(keepSegments);
  if (packed.length === 0) return 0;

  for (const segment of packed) {
    if (sourceTime >= segment.start && sourceTime < segment.end) {
      const sourceOffset = sourceTime - segment.start;
      const rate = getPlaybackRateForSpeed(segment.speed);
      const sequenceOffset = sourceOffset / rate;
      return segment.sequenceStart + sequenceOffset;
    }
  }

  const last = packed[packed.length - 1];
  if (sourceTime >= last.end) return last.sequenceEnd;

  const first = packed[0];
  if (sourceTime < first.start) return first.sequenceStart;

  return 0;
}

/** Position timeline compactée → temps source pour la lecture vidéo. */
export function sequenceTimeToSourceTime(
  sequenceTime: number,
  keepSegments: TimeRange[],
): number {
  const packed = buildPackedSegments(keepSegments);
  if (packed.length === 0) return 0;

  for (const segment of packed) {
    if (sequenceTime >= segment.sequenceStart && sequenceTime < segment.sequenceEnd) {
      const sequenceOffset = sequenceTime - segment.sequenceStart;
      const rate = getPlaybackRateForSpeed(segment.speed);
      const sourceOffset = sequenceOffset * rate;
      return segment.start + sourceOffset;
    }
  }

  const last = packed[packed.length - 1];
  if (sequenceTime >= last.sequenceEnd) {
    return Math.max(0, last.end - 0.01);
  }

  return packed[0].start;
}

/** Marqueurs de cut sur la timeline compactée (frontières entre segments conservés). */
export function getPackedCutMarkers(keepSegments: TimeRange[]): number[] {
  return buildPackedSegments(keepSegments)
    .slice(1)
    .map((segment) => segment.sequenceStart);
}

export function getTimelineCutMarkers(
  ranges: TimeRange[],
  sourceDuration: number,
): number[] {
  const markers = new Set<number>();

  for (const range of ranges) {
    if (range.start > MIN_CUT_GAP) markers.add(range.start);
    if (range.end < sourceDuration - MIN_CUT_GAP) markers.add(range.end);
  }

  return [...markers].sort((a, b) => a - b);
}

export function canAddCutInKeepSegments(
  time: number,
  keepSegments: TimeRange[],
): boolean {
  return keepSegments.some(
    (segment) =>
      time > segment.start + MIN_CUT_GAP && time < segment.end - MIN_CUT_GAP,
  );
}

export function isTimeInsideKeepSegments(
  time: number,
  keepSegments: TimeRange[],
): boolean {
  return keepSegments.some(
    (segment) => time >= segment.start && time < segment.end,
  );
}

/** Avance la lecture au prochain segment conservé ou signale la fin. */
export function resolvePlaybackTime(
  time: number,
  keepSegments: TimeRange[],
): number | "ended" {
  const sorted = [...keepSegments].sort((a, b) => a.start - b.start);
  if (sorted.length === 0) return "ended";

  for (let i = 0; i < sorted.length; i++) {
    const segment = sorted[i];
    if (time >= segment.start && time < segment.end) return time;

    const next = sorted[i + 1];
    if (time >= segment.end && next && time < next.start) {
      return next.start;
    }
  }

  const last = sorted[sorted.length - 1];
  if (time >= last.end) return "ended";

  const first = sorted[0];
  if (time < first.start) return first.start;

  return time;
}

/** Replace le curseur dans un segment valide après une édition. */
export function snapTimeToKeepSegments(
  time: number,
  keepSegments: TimeRange[],
): number {
  if (keepSegments.length === 0) return 0;
  if (isTimeInsideKeepSegments(time, keepSegments)) return time;

  const sorted = [...keepSegments].sort((a, b) => a.start - b.start);
  const next = sorted.find((segment) => segment.start > time);
  if (next) return next.start;

  const last = sorted[sorted.length - 1];
  return Math.max(0, last.end - 0.01);
}

/** Fusionne deux segments adjacents séparés par un cut (ex. retrait d'un meme). */
export function mergeKeepSegmentAtCut(
  keepSegments: TimeRange[],
  cutTime: number,
): TimeRange[] | null {
  const index = keepSegments.findIndex(
    (_, i) =>
      i < keepSegments.length - 1 &&
      Math.abs(keepSegments[i].end - cutTime) < 0.05 &&
      Math.abs(keepSegments[i + 1].start - cutTime) < 0.05,
  );
  if (index === -1) return null;

  const first = keepSegments[index];
  const second = keepSegments[index + 1];
  const next = [...keepSegments];
  next.splice(index, 2, {
    start: first.start,
    end: second.end,
    speed: first.speed ?? second.speed,
  });
  return next.sort((a, b) => a.start - b.start);
}

export function splitKeepSegmentAt(
  keepSegments: TimeRange[],
  time: number,
): TimeRange[] | null {
  const index = keepSegments.findIndex(
    (segment) =>
      time > segment.start + MIN_CUT_GAP && time < segment.end - MIN_CUT_GAP,
  );
  if (index === -1) return null;

  const segment = keepSegments[index];
  const next = [...keepSegments];
  next.splice(
    index,
    1,
    { start: segment.start, end: time, speed: segment.speed },
    { start: time, end: segment.end, speed: segment.speed },
  );
  return next.sort((a, b) => a.start - b.start);
}

export function removeKeepSegmentById(
  keepSegments: TimeRange[],
  segmentId: string,
): TimeRange[] | null {
  const segments = buildSegmentsFromKeepRanges(keepSegments);
  const toRemove = segments.find((segment) => segment.id === segmentId);
  if (!toRemove) return null;

  const next = keepSegments.filter(
    (range) =>
      Math.abs(range.start - toRemove.start) > 0.001 ||
      Math.abs(range.end - toRemove.end) > 0.001,
  );

  if (next.length === 0) return null;
  return next;
}

export function updateKeepSegmentSpeed(
  keepSegments: TimeRange[],
  segmentId: string,
  speed: number,
): TimeRange[] | null {
  const segments = buildSegmentsFromKeepRanges(keepSegments);
  const target = segments.find((segment) => segment.id === segmentId);
  if (!target) return null;

  const clampedSpeed = clampSegmentSpeed(speed);
  return keepSegments.map((range) =>
    Math.abs(range.start - target.start) < 0.001 &&
    Math.abs(range.end - target.end) < 0.001
      ? { ...range, speed: clampedSpeed }
      : range,
  );
}
