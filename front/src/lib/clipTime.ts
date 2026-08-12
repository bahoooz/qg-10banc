import type { ZoomEffect } from "./clipZoomEffects";
import { cloneZoomEffects } from "./clipZoomEffects";
import type { ImageOverlay } from "./clipImageOverlays";
import { cloneImageOverlays } from "./clipImageOverlays";
import type { TextOverlay } from "./clipTextOverlays";
import { cloneTextOverlays } from "./clipTextOverlays";

export type ClipSegment = {
  id: string;
  start: number;
  end: number;
};

export type TimeRange = {
  start: number;
  end: number;
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
};

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
    }));
}

export function getEditedDuration(ranges: TimeRange[]): number {
  return ranges.reduce((sum, range) => sum + (range.end - range.start), 0);
}

export type PackedSegment = ClipSegment & {
  sequenceStart: number;
  sequenceEnd: number;
};

/** Segments affichés bout-à-bout sans espace vide (style Premiere Pro). */
export function buildPackedSegments(ranges: TimeRange[]): PackedSegment[] {
  const sorted = buildSegmentsFromKeepRanges(ranges);
  let sequenceOffset = 0;

  return sorted.map((segment) => {
    const duration = segment.end - segment.start;
    const packed: PackedSegment = {
      ...segment,
      sequenceStart: sequenceOffset,
      sequenceEnd: sequenceOffset + duration,
    };
    sequenceOffset += duration;
    return packed;
  });
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
      return segment.sequenceStart + (sourceTime - segment.start);
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
      return segment.start + (sequenceTime - segment.sequenceStart);
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
    { start: segment.start, end: time },
    { start: time, end: segment.end },
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
