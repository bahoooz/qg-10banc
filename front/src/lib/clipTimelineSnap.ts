/** Seuil de magnétisme entre bords de segments (secondes séquence). */
export const TIMELINE_SNAP_THRESHOLD_SEC = 0.25;

export type TimelineSnapExclude = {
  zoomEffectId?: string;
  imageOverlayId?: string;
  textOverlayId?: string;
  soundboardId?: string;
  timelineVideoId?: string;
};

type SnapPointSource = {
  id: string;
  sequenceStart: number;
  sequenceEnd: number;
};

export type TimelineSnapResult = {
  time: number;
  snapPoint: number | null;
};

export function collectTimelineSnapPoints(input: {
  segmentStarts: number[];
  segmentEnds: number[];
  cutMarkers: number[];
  zoomEffects: SnapPointSource[];
  imageOverlays: SnapPointSource[];
  textOverlays: SnapPointSource[];
  soundboards: SnapPointSource[];
  timelineVideos: SnapPointSource[];
  sequencePlayhead?: number;
  exclude?: TimelineSnapExclude;
}): number[] {
  const points: number[] = [0];

  if (
    input.sequencePlayhead !== undefined &&
    input.sequencePlayhead > 0.01
  ) {
    points.push(input.sequencePlayhead);
  }

  for (const start of input.segmentStarts) {
    if (start > 0.01) points.push(start);
  }

  for (const end of input.segmentEnds) {
    if (end > 0.01) points.push(end);
  }

  for (const marker of input.cutMarkers) {
    if (marker > 0.01) points.push(marker);
  }

  const pushBounds = (
    items: SnapPointSource[],
    excludedId: string | undefined,
  ) => {
    for (const item of items) {
      if (item.id === excludedId) continue;
      if (item.sequenceStart > 0.01) points.push(item.sequenceStart);
      if (item.sequenceEnd > 0.01) points.push(item.sequenceEnd);
    }
  };

  pushBounds(input.zoomEffects, input.exclude?.zoomEffectId);
  pushBounds(input.imageOverlays, input.exclude?.imageOverlayId);
  pushBounds(input.textOverlays, input.exclude?.textOverlayId);
  pushBounds(input.soundboards, input.exclude?.soundboardId);
  pushBounds(input.timelineVideos, input.exclude?.timelineVideoId);

  return [...new Set(points.map((point) => Math.round(point * 1000) / 1000))].sort(
    (a, b) => a - b,
  );
}

export function snapSequenceTimeWithFeedback(
  time: number,
  snapPoints: number[],
  threshold = TIMELINE_SNAP_THRESHOLD_SEC,
): TimelineSnapResult {
  let closest = time;
  let matchedPoint: number | null = null;
  let minDistance = threshold;

  for (const point of snapPoints) {
    const distance = Math.abs(point - time);
    if (distance < minDistance) {
      minDistance = distance;
      closest = point;
      matchedPoint = point;
    }
  }

  return { time: closest, snapPoint: matchedPoint };
}

export function snapSegmentMoveStart(
  rawStart: number,
  duration: number,
  snapPoints: number[],
  threshold = TIMELINE_SNAP_THRESHOLD_SEC,
): TimelineSnapResult {
  const rawEnd = rawStart + duration;
  const startSnap = snapSequenceTimeWithFeedback(rawStart, snapPoints, threshold);
  const endSnap = snapSequenceTimeWithFeedback(rawEnd, snapPoints, threshold);

  const startDistance =
    startSnap.snapPoint !== null
      ? Math.abs(rawStart - startSnap.snapPoint)
      : threshold + 1;
  const endDistance =
    endSnap.snapPoint !== null ? Math.abs(rawEnd - endSnap.snapPoint) : threshold + 1;

  if (endSnap.snapPoint !== null && endDistance < startDistance) {
    return {
      time: endSnap.time - duration,
      snapPoint: endSnap.snapPoint,
    };
  }

  return startSnap;
}

export function snapSequenceTime(
  time: number,
  snapPoints: number[],
  threshold = TIMELINE_SNAP_THRESHOLD_SEC,
): number {
  return snapSequenceTimeWithFeedback(time, snapPoints, threshold).time;
}
