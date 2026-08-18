import {
  getEditedDuration,
  sequenceTimeToSourceTime,
  sourceTimeToSequenceTime,
  type TimeRange,
} from "./clipTime";
import { storedTimeToActualSequence } from "./clipTimelineInserts";
import type { TimelineVideoClip } from "./clipTimelineVideos";
import {
  createDefaultFollowStickerZone,
  followStickerToDataUrl,
  type FollowStickerConfig,
} from "./followSticker";

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
  sticker?: FollowStickerConfig;
  /** Timestamps exprimés en temps séquence (timeline étendue). */
  usesSequenceTime?: boolean;
  /** Zone figée — désactive la resync auto du sticker après placement. */
  zoneLocked?: boolean;
};

export type CreateImageOverlayOptions = {
  zone?: ImageOverlayZone;
  sticker?: FollowStickerConfig;
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
  return overlays.map((overlay) => cloneImageOverlay(overlay));
}

export function cloneImageOverlay(overlay: ImageOverlay): ImageOverlay {
  return {
    ...overlay,
    zone: { ...overlay.zone },
    ...(overlay.sticker ? { sticker: { ...overlay.sticker } } : {}),
  };
}

/** Copie indépendante pour un split timeline — préserve position/taille. */
export function cloneImageOverlayForSplit(overlay: ImageOverlay): ImageOverlay {
  return {
    ...cloneImageOverlay(overlay),
    zoneLocked: true,
  };
}

/** Stickers suivent la timeline étendue (clips / memes appendés). */
export function imageOverlayUsesSequenceTime(overlay: ImageOverlay): boolean {
  return Boolean(overlay.usesSequenceTime || overlay.sticker);
}

export function normalizeImageOverlaySequenceStorage(
  overlay: ImageOverlay,
  keepSegments: TimeRange[],
): ImageOverlay {
  if (!overlay.sticker || overlay.usesSequenceTime) return overlay;

  return {
    ...overlay,
    usesSequenceTime: true,
    start: sourceTimeToSequenceTime(overlay.start, keepSegments),
    end: sourceTimeToSequenceTime(overlay.end, keepSegments),
  };
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
  return overlays.find(
    (overlay) =>
      !overlay.usesSequenceTime &&
      time >= overlay.start &&
      time < overlay.end,
  );
}

export function findImageOverlayAtSequenceTime(
  overlays: ImageOverlay[],
  sequenceTime: number,
): ImageOverlay | undefined {
  return overlays.find(
    (overlay) =>
      overlay.usesSequenceTime &&
      sequenceTime >= overlay.start &&
      sequenceTime < overlay.end,
  );
}

export function getImageOverlaysAtTime(
  overlays: ImageOverlay[],
  time: number,
): ImageOverlay[] {
  return overlays.filter(
    (overlay) =>
      !overlay.usesSequenceTime &&
      time >= overlay.start &&
      time < overlay.end,
  );
}

export function getImageOverlaysAtSequenceTime(
  overlays: ImageOverlay[],
  sequenceTime: number,
): ImageOverlay[] {
  return overlays.filter(
    (overlay) =>
      overlay.usesSequenceTime &&
      sequenceTime >= overlay.start &&
      sequenceTime < overlay.end,
  );
}

export function getImageOverlaysForPlayhead(
  overlays: ImageOverlay[],
  sequenceTime: number,
  sourceTime: number,
): ImageOverlay[] {
  return overlays.filter((overlay) => {
    if (imageOverlayUsesSequenceTime(overlay)) {
      return sequenceTime >= overlay.start && sequenceTime < overlay.end;
    }
    return sourceTime >= overlay.start && sourceTime < overlay.end;
  });
}

export function mapImageOverlaysToSequence(
  overlays: ImageOverlay[],
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[] = [],
): PackedImageOverlay[] {
  if (keepSegments.length === 0) return [];

  return overlays
    .filter((overlay) =>
      imageOverlayUsesSequenceTime(overlay)
        ? true
        : keepSegments.some(
            (segment) => overlay.end > segment.start && overlay.start < segment.end,
          ),
    )
    .map((overlay) => ({
      ...overlay,
      sequenceStart: storedTimeToActualSequence(
        overlay.start,
        imageOverlayUsesSequenceTime(overlay),
        keepSegments,
        timelineVideos,
      ),
      sequenceEnd: storedTimeToActualSequence(
        overlay.end,
        imageOverlayUsesSequenceTime(overlay),
        keepSegments,
        timelineVideos,
      ),
    }))
    .filter((overlay) => overlay.sequenceEnd > overlay.sequenceStart + 0.05)
    .sort((a, b) => a.sequenceStart - b.sequenceStart);
}

export function createImageOverlayAtTime(
  time: number,
  keepSegments: TimeRange[],
  src: string,
  label: string,
  options?: CreateImageOverlayOptions,
): ImageOverlay | null {
  const segment = getKeepSegmentContainingTime(time, keepSegments);
  if (!segment) return null;

  const end = Math.min(time + DEFAULT_IMAGE_OVERLAY_DURATION, segment.end);
  if (end - time < MIN_IMAGE_OVERLAY_DURATION) return null;

  const sticker = options?.sticker;
  const zone =
    options?.zone ??
    (sticker ? createDefaultFollowStickerZone(sticker.username) : createDefaultImageZone());
  const resolvedSrc = sticker ? followStickerToDataUrl(sticker) : src;

  return {
    id: createImageOverlayId(time),
    start: time,
    end,
    src: resolvedSrc,
    label,
    zone,
    ...(sticker ? { sticker } : {}),
  };
}

export function createImageOverlayAtSequenceTime(
  sequenceTime: number,
  timelineDuration: number,
  src: string,
  label: string,
  options?: CreateImageOverlayOptions,
): ImageOverlay | null {
  const end = Math.min(
    sequenceTime + DEFAULT_IMAGE_OVERLAY_DURATION,
    timelineDuration,
  );
  if (end - sequenceTime < MIN_IMAGE_OVERLAY_DURATION) return null;

  const sticker = options?.sticker;
  const zone =
    options?.zone ??
    (sticker ? createDefaultFollowStickerZone(sticker.username) : createDefaultImageZone());
  const resolvedSrc = sticker ? followStickerToDataUrl(sticker) : src;

  return {
    id: createImageOverlayId(sequenceTime),
    start: sequenceTime,
    end,
    src: resolvedSrc,
    label,
    zone,
    usesSequenceTime: true,
    ...(sticker ? { sticker } : {}),
  };
}

export function updateImageOverlayBounds(
  overlay: ImageOverlay,
  patch: Partial<Pick<ImageOverlay, "start" | "end">>,
  keepSegments: TimeRange[],
  timelineDuration?: number,
): ImageOverlay | null {
  const start = patch.start ?? overlay.start;
  const end = patch.end ?? overlay.end;
  if (end - start < MIN_IMAGE_OVERLAY_DURATION) return null;

  if (imageOverlayUsesSequenceTime(overlay)) {
    const maxDuration = timelineDuration ?? getEditedDuration(keepSegments);
    if (start < 0 || end > maxDuration + 0.01) return null;
    return { ...overlay, start, end, usesSequenceTime: true };
  }

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
  timelineDuration?: number,
): ImageOverlay | null {
  if (keepSegments.length === 0) return null;

  const editedDuration = getEditedDuration(keepSegments);
  const maxDuration = timelineDuration ?? editedDuration;
  const seqStart =
    initialSeqStart ??
    (imageOverlayUsesSequenceTime(overlay)
      ? overlay.start
      : sourceTimeToSequenceTime(overlay.start, keepSegments));
  const seqEnd =
    initialSeqEnd ??
    (imageOverlayUsesSequenceTime(overlay)
      ? overlay.end
      : sourceTimeToSequenceTime(overlay.end, keepSegments));
  const seqDuration = seqEnd - seqStart;

  let newSeqStart = seqStart + sequenceOffset;
  if (newSeqStart < 0) newSeqStart = 0;
  const maxStart = imageOverlayUsesSequenceTime(overlay) ? maxDuration : editedDuration;
  if (newSeqStart + seqDuration > maxStart) {
    newSeqStart = Math.max(0, maxStart - seqDuration);
  }

  const newSeqEnd = newSeqStart + seqDuration;

  if (imageOverlayUsesSequenceTime(overlay)) {
    return updateImageOverlayBounds(
      overlay,
      { start: newSeqStart, end: newSeqEnd },
      keepSegments,
      maxDuration,
    );
  }

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
