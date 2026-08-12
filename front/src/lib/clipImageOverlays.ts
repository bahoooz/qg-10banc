import {
  getEditedDuration,
  sequenceTimeToSourceTime,
  sourceTimeToSequenceTime,
  type TimeRange,
} from "./clipTime";

export type ImageOverlayZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageOverlay = {
  id: string;
  start: number;
  end: number;
  src: string;
  label: string;
  zone: ImageOverlayZone;
};

export type PackedImageOverlay = ImageOverlay & {
  sequenceStart: number;
  sequenceEnd: number;
};

export const DEFAULT_IMAGE_OVERLAY_DURATION = 2;
export const MIN_IMAGE_OVERLAY_DURATION = 0.35;
export const MIN_IMAGE_OVERLAY_SIZE = 0.08;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function createImageOverlayId(start: number): string {
  return `img-${start.toFixed(3)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultImageZone(): ImageOverlayZone {
  return {
    x: 0.25,
    y: 0.25,
    width: 0.5,
    height: 0.35,
  };
}

export function clampImageOverlayZone(zone: ImageOverlayZone): ImageOverlayZone {
  let width = clamp01(Math.max(MIN_IMAGE_OVERLAY_SIZE, zone.width));
  let height = clamp01(Math.max(MIN_IMAGE_OVERLAY_SIZE, zone.height));

  return {
    width,
    height,
    x: clamp01(Math.min(Math.max(0, zone.x), Math.max(0, 1 - width))),
    y: clamp01(Math.min(Math.max(0, zone.y), Math.max(0, 1 - height))),
  };
}

export function cloneImageOverlays(overlays: ImageOverlay[]): ImageOverlay[] {
  return overlays.map((overlay) => ({
    ...overlay,
    zone: { ...overlay.zone },
  }));
}

function getKeepSegmentContainingTime(
  time: number,
  keepSegments: TimeRange[],
): TimeRange | undefined {
  return keepSegments.find(
    (segment) => time >= segment.start && time < segment.end,
  );
}

export function findImageOverlayAtTime(
  overlays: ImageOverlay[],
  time: number,
): ImageOverlay | undefined {
  return overlays.find((overlay) => time >= overlay.start && time < overlay.end);
}

export function getImageOverlaysAtTime(
  overlays: ImageOverlay[],
  time: number,
): ImageOverlay[] {
  return overlays.filter(
    (overlay) => time >= overlay.start && time < overlay.end,
  );
}

export function mapImageOverlaysToSequence(
  overlays: ImageOverlay[],
  keepSegments: TimeRange[],
): PackedImageOverlay[] {
  if (keepSegments.length === 0) return [];

  return overlays
    .filter((overlay) =>
      keepSegments.some(
        (segment) => overlay.end > segment.start && overlay.start < segment.end,
      ),
    )
    .map((overlay) => ({
      ...overlay,
      sequenceStart: sourceTimeToSequenceTime(overlay.start, keepSegments),
      sequenceEnd: sourceTimeToSequenceTime(overlay.end, keepSegments),
    }))
    .filter((overlay) => overlay.sequenceEnd > overlay.sequenceStart + 0.05)
    .sort((a, b) => a.sequenceStart - b.sequenceStart);
}

export function createImageOverlayAtTime(
  time: number,
  keepSegments: TimeRange[],
  src: string,
  label: string,
): ImageOverlay | null {
  const segment = getKeepSegmentContainingTime(time, keepSegments);
  if (!segment) return null;

  const end = Math.min(time + DEFAULT_IMAGE_OVERLAY_DURATION, segment.end);
  if (end - time < MIN_IMAGE_OVERLAY_DURATION) return null;

  return {
    id: createImageOverlayId(time),
    start: time,
    end,
    src,
    label,
    zone: createDefaultImageZone(),
  };
}

export function updateImageOverlayBounds(
  overlay: ImageOverlay,
  patch: Partial<Pick<ImageOverlay, "start" | "end">>,
  keepSegments: TimeRange[],
): ImageOverlay | null {
  const start = patch.start ?? overlay.start;
  const end = patch.end ?? overlay.end;
  if (end - start < MIN_IMAGE_OVERLAY_DURATION) return null;

  const overlaps = keepSegments.some(
    (segment) => end > segment.start && start < segment.end,
  );
  if (!overlaps) return null;

  return { ...overlay, start, end };
}

export function moveImageOverlayBySequenceOffset(
  overlay: ImageOverlay,
  sequenceOffset: number,
  keepSegments: TimeRange[],
  initialSeqStart?: number,
  initialSeqEnd?: number,
): ImageOverlay | null {
  if (keepSegments.length === 0) return null;

  const editedDuration = getEditedDuration(keepSegments);
  const seqStart =
    initialSeqStart ?? sourceTimeToSequenceTime(overlay.start, keepSegments);
  const seqEnd =
    initialSeqEnd ?? sourceTimeToSequenceTime(overlay.end, keepSegments);
  const seqDuration = seqEnd - seqStart;

  let newSeqStart = seqStart + sequenceOffset;
  if (newSeqStart < 0) newSeqStart = 0;
  if (newSeqStart + seqDuration > editedDuration) {
    newSeqStart = Math.max(0, editedDuration - seqDuration);
  }

  const newSeqEnd = newSeqStart + seqDuration;
  const newStart = sequenceTimeToSourceTime(newSeqStart, keepSegments);
  const newEnd = sequenceTimeToSourceTime(newSeqEnd, keepSegments);

  return updateImageOverlayBounds(
    overlay,
    { start: newStart, end: newEnd },
    keepSegments,
  );
}

export function resizeImageOverlayAtSequenceEdge(
  overlay: ImageOverlay,
  edge: "start" | "end",
  sequenceTime: number,
  fixedSequenceBound: number,
  keepSegments: TimeRange[],
  editedDuration: number,
): { start: number; end: number } | null {
  let seqStart: number;
  let seqEnd: number;

  if (edge === "start") {
    seqEnd = fixedSequenceBound;
    seqStart = Math.max(
      0,
      Math.min(sequenceTime, seqEnd - MIN_IMAGE_OVERLAY_DURATION),
    );
  } else {
    seqStart = fixedSequenceBound;
    seqEnd = Math.min(
      editedDuration,
      Math.max(sequenceTime, seqStart + MIN_IMAGE_OVERLAY_DURATION),
    );
  }

  const start = sequenceTimeToSourceTime(seqStart, keepSegments);
  const end = sequenceTimeToSourceTime(seqEnd, keepSegments);
  const updated = updateImageOverlayBounds(overlay, { start, end }, keepSegments);
  if (!updated) return null;

  return { start: updated.start, end: updated.end };
}
