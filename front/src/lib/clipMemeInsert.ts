import {
  canAddCutInKeepSegments,
  mergeKeepSegmentAtCut,
  sequenceTimeToSourceTime,
  splitKeepSegmentAt,
  type TimeRange,
} from "./clipTime";
import type { ImageOverlay } from "./clipImageOverlays";
import type { TextOverlay } from "./clipTextOverlays";
import type { SoundboardClip } from "./clipSoundboards";
import type { ZoomEffect } from "./clipZoomEffects";
import {
  getTimelineVideoSequenceDuration,
  getTimelineVideoSequenceRange,
  type TimelineVideoClip,
} from "./clipTimelineVideos";
import {
  actualSequenceToNatural,
  getTimelineInserts,
  naturalToActualAfterInsert,
  shiftSequenceTimedRange,
} from "./clipTimelineInserts";

export type MemeTimelineState = {
  keepSegments: TimeRange[];
  timelineVideos: TimelineVideoClip[];
  zoomEffects: ZoomEffect[];
  imageOverlays: ImageOverlay[];
  textOverlays: TextOverlay[];
  soundboards: SoundboardClip[];
};

function unshiftSequenceItemsAfter<T extends { start: number; end: number; usesSequenceTime?: boolean }>(
  items: T[],
  afterActual: number,
  offset: number,
): T[] {
  return items.map((item) =>
    item.usesSequenceTime && item.start >= afterActual - 0.001
      ? { ...item, start: item.start + offset, end: item.end + offset }
      : item,
  );
}

function forceMergeKeepSegmentAtCut(
  keepSegments: TimeRange[],
  cutTime: number,
): TimeRange[] {
  const merged = mergeKeepSegmentAtCut(keepSegments, cutTime);
  if (merged) return merged;

  const index = keepSegments.findIndex(
    (_, i) =>
      i < keepSegments.length - 1 &&
      Math.abs(keepSegments[i].end - cutTime) < 0.1 &&
      Math.abs(keepSegments[i + 1].start - cutTime) < 0.1,
  );
  if (index === -1) return keepSegments;

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

export function removeMemeInsert(
  state: MemeTimelineState,
  memeId: string,
): (MemeTimelineState & {
  removedMeme: TimelineVideoClip;
  oldSequenceStart: number;
  memeDuration: number;
}) | null {
  const meme = state.timelineVideos.find(
    (clip) => clip.id === memeId && clip.importKind === "meme",
  );
  if (!meme) return null;

  const memeDuration = getTimelineVideoSequenceDuration(meme);
  const oldSequenceStart = meme.sequenceStart;
  const inserts = getTimelineInserts(state.timelineVideos);
  const oldNatural =
    meme.naturalInsertStart ??
    actualSequenceToNatural(oldSequenceStart, inserts) ??
    oldSequenceStart;

  const oldSourceCut = sequenceTimeToSourceTime(oldNatural, state.keepSegments);
  const keepSegments = forceMergeKeepSegmentAtCut(
    state.keepSegments,
    oldSourceCut,
  );

  const timelineVideos = state.timelineVideos
    .filter((clip) => clip.id !== memeId)
    .map((clip) =>
      clip.sequenceStart > oldSequenceStart + 0.001
        ? { ...clip, sequenceStart: clip.sequenceStart - memeDuration }
        : clip,
    );

  return {
    keepSegments,
    timelineVideos,
    zoomEffects: unshiftSequenceItemsAfter(
      state.zoomEffects,
      oldSequenceStart,
      -memeDuration,
    ),
    imageOverlays: unshiftSequenceItemsAfter(
      state.imageOverlays,
      oldSequenceStart,
      -memeDuration,
    ),
    textOverlays: unshiftSequenceItemsAfter(
      state.textOverlays,
      oldSequenceStart,
      -memeDuration,
    ),
    soundboards: unshiftSequenceItemsAfter(
      state.soundboards,
      oldSequenceStart,
      -memeDuration,
    ),
    removedMeme: meme,
    oldSequenceStart,
    memeDuration,
  };
}

export function insertMemeAtSequence(
  state: MemeTimelineState,
  meme: TimelineVideoClip,
  targetSequenceStart: number,
): MemeTimelineState | null {
  for (const other of state.timelineVideos) {
    if (other.importKind !== "meme") continue;
    const range = getTimelineVideoSequenceRange(other);
    if (
      targetSequenceStart >= range.start + 0.01 &&
      targetSequenceStart < range.end - 0.01
    ) {
      return null;
    }
  }

  const inserts = getTimelineInserts(state.timelineVideos);
  const naturalAtTarget = actualSequenceToNatural(
    targetSequenceStart,
    inserts,
  );
  if (naturalAtTarget === null) return null;

  const sourceCutTime = sequenceTimeToSourceTime(
    naturalAtTarget,
    state.keepSegments,
  );
  if (!canAddCutInKeepSegments(sourceCutTime, state.keepSegments)) {
    return null;
  }

  const nextKeepSegments = splitKeepSegmentAt(
    state.keepSegments,
    sourceCutTime,
  );
  if (!nextKeepSegments) return null;

  const memeDuration = getTimelineVideoSequenceDuration(meme);
  const newActualStart = naturalToActualAfterInsert(naturalAtTarget, inserts);

  const updatedMeme: TimelineVideoClip = {
    ...meme,
    sequenceStart: newActualStart,
    naturalInsertStart: naturalAtTarget,
  };

  const shiftItems = <T extends { start: number; end: number; usesSequenceTime?: boolean }>(
    items: T[],
  ): T[] =>
    items.map((item) =>
      item.usesSequenceTime
        ? shiftSequenceTimedRange(item, newActualStart, memeDuration)
        : item,
    );

  return {
    keepSegments: nextKeepSegments,
    timelineVideos: [
      ...state.timelineVideos.map((clip) =>
        clip.sequenceStart > newActualStart + 0.001
          ? { ...clip, sequenceStart: clip.sequenceStart + memeDuration }
          : clip,
      ),
      updatedMeme,
    ].sort((a, b) => a.sequenceStart - b.sequenceStart),
    zoomEffects: shiftItems(state.zoomEffects),
    imageOverlays: shiftItems(state.imageOverlays),
    textOverlays: shiftItems(state.textOverlays),
    soundboards: shiftItems(state.soundboards),
  };
}
