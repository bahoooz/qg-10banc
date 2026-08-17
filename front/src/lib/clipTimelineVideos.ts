import type { ClipLayoutState } from "./clipLayout";
import {
  getEditedDuration,
  clampSegmentSpeed,
  DEFAULT_SEGMENT_SPEED,
  getPlaybackRateForSpeed,
  type TimeRange,
} from "./clipTime";
import type { ClipImportResult } from "../../types";
import {
  actualSequenceToNatural,
  getActualBaseEndSequence,
  getTimelineInserts,
  naturalToActualAfterInsert,
  type TimelineVideoImportKind,
} from "./clipTimelineInserts";

export type TimelineVideoLayoutMode = "base" | "center-crop";

export type TimelineVideoClip = {
  id: string;
  clipId: string;
  sourceUrl: string;
  previewUrl: string;
  label: string;
  sequenceStart: number;
  duration: number;
  sourceStart: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceDuration: number;
  sourceType: "upload" | "twitch";
  layoutMode: TimelineVideoLayoutMode;
  /** 0 = normal. Vitesse séquence (comme keepSegments). */
  speed?: number;
  importKind?: TimelineVideoImportKind;
  /** Point de cut (timeline compactée) — renseigné pour les memes. */
  naturalInsertStart?: number;
};

const MIN_TIMELINE_VIDEO_CUT_GAP = 0.25;

export function createTimelineVideoId(sequenceStart: number): string {
  return `tvid-${sequenceStart.toFixed(3)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTimelineVideoLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "Vidéo";
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed;
}

export function cloneTimelineVideos(
  clips: TimelineVideoClip[],
): TimelineVideoClip[] {
  return clips.map((clip) => ({
    ...clip,
    sourceStart: clip.sourceStart ?? 0,
  }));
}

export function getTimelineVideoSpeed(clip: TimelineVideoClip): number {
  return clampSegmentSpeed(clip.speed ?? DEFAULT_SEGMENT_SPEED);
}

/** Durée affichée sur la timeline (source / taux de lecture). */
export function getTimelineVideoSequenceDuration(
  clip: TimelineVideoClip,
): number {
  const rate = getPlaybackRateForSpeed(getTimelineVideoSpeed(clip));
  return clip.duration / rate;
}

export function getTotalTimelineDuration(
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): number {
  const baseDuration = getEditedDuration(keepSegments);
  if (timelineVideos.length === 0) return baseDuration;

  let insertDuration = 0;
  for (const clip of timelineVideos) {
    if (clip.importKind === "meme") {
      insertDuration += getTimelineVideoSequenceDuration(clip);
    }
  }

  const actualBaseEnd = baseDuration + insertDuration;
  const videosEnd = timelineVideos.reduce(
    (max, clip) =>
      Math.max(max, clip.sequenceStart + getTimelineVideoSequenceDuration(clip)),
    0,
  );

  return Math.max(actualBaseEnd, videosEnd);
}

export function getActiveTimelineVideoAtSequence(
  sequenceTime: number,
  timelineVideos: TimelineVideoClip[],
): TimelineVideoClip | undefined {
  return timelineVideos.find((clip) => {
    const seqDuration = getTimelineVideoSequenceDuration(clip);
    return (
      sequenceTime >= clip.sequenceStart &&
      sequenceTime < clip.sequenceStart + seqDuration
    );
  });
}

/** Prochain point de lecture (meme, base, ou clip append). */
export function getTimelineContinuationSequenceTime(
  sequenceTime: number,
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): number | null {
  if (timelineVideos.length === 0) return null;

  const inserts = getTimelineInserts(timelineVideos);
  const actualBaseEnd = getActualBaseEndSequence(keepSegments, timelineVideos);
  const naturalBaseEnd = getEditedDuration(keepSegments);

  if (getActiveTimelineVideoAtSequence(sequenceTime, timelineVideos)) {
    return sequenceTime;
  }

  const sorted = [...timelineVideos].sort(
    (a, b) => a.sequenceStart - b.sequenceStart,
  );

  for (const insert of inserts) {
    const insertEnd = insert.actualStart + insert.duration;
    if (
      sequenceTime >= insertEnd - 0.08 &&
      sequenceTime <= insertEnd + 0.05
    ) {
      const resumeAt = naturalToActualAfterInsert(
        insert.naturalStart,
        inserts,
      );
      if (resumeAt <= actualBaseEnd + 0.001) {
        return resumeAt;
      }
    }
  }

  for (const insert of inserts) {
    if (
      sequenceTime >= insert.actualStart - 0.08 &&
      sequenceTime < insert.actualStart + 0.01
    ) {
      return insert.actualStart;
    }
  }

  const naturalAtTime = actualSequenceToNatural(sequenceTime, inserts);
  if (
    naturalAtTime !== null &&
    naturalAtTime >= naturalBaseEnd - 0.08 &&
    sequenceTime >= actualBaseEnd - 0.08
  ) {
    const appendClip = sorted.find(
      (clip) =>
        clip.importKind !== "meme" &&
        clip.sequenceStart >= actualBaseEnd - 0.001,
    );
    if (appendClip) {
      return appendClip.sequenceStart;
    }
  }

  const nextClip = sorted.find(
    (clip) => clip.sequenceStart > sequenceTime + 0.001,
  );
  if (nextClip) {
    return nextClip.sequenceStart;
  }

  const clipAtBoundary = sorted.find(
    (clip) => Math.abs(clip.sequenceStart - sequenceTime) < 0.001,
  );
  if (clipAtBoundary) {
    return clipAtBoundary.sequenceStart;
  }

  return null;
}

export function getTimelineVideoLocalTime(
  sequenceTime: number,
  clip: TimelineVideoClip,
): number {
  const rate = getPlaybackRateForSpeed(getTimelineVideoSpeed(clip));
  const sequenceOffset = Math.max(
    0,
    Math.min(getTimelineVideoSequenceDuration(clip), sequenceTime - clip.sequenceStart),
  );
  return sequenceOffset * rate;
}

export function createTimelineVideoFromImport(
  importResult: ClipImportResult,
  sequenceStart: number,
  layoutMode: TimelineVideoLayoutMode,
  importKind: TimelineVideoImportKind = "clip",
): TimelineVideoClip {
  return {
    id: createTimelineVideoId(sequenceStart),
    clipId: importResult.id,
    sourceUrl: importResult.sourceUrl || importResult.previewUrl,
    previewUrl: importResult.previewUrl,
    label: createTimelineVideoLabel(
      importResult.originalName ?? "Vidéo importée",
    ),
    sequenceStart,
    duration: importResult.duration,
    sourceStart: 0,
    sourceWidth: importResult.width,
    sourceHeight: importResult.height,
    sourceDuration: importResult.duration,
    sourceType: importResult.sourceType,
    layoutMode,
    importKind,
  };
}

export function moveTimelineVideoBySequenceOffset(
  clip: TimelineVideoClip,
  sequenceOffset: number,
  initialSeqStart?: number,
): TimelineVideoClip {
  const nextStart = Math.max(0, (initialSeqStart ?? clip.sequenceStart) + sequenceOffset);
  return { ...clip, sequenceStart: nextStart };
}

export type SequenceRange = {
  start: number;
  end: number;
};

export function getTimelineVideoSequenceRange(
  clip: TimelineVideoClip,
): SequenceRange {
  const seqDuration = getTimelineVideoSequenceDuration(clip);
  return {
    start: clip.sequenceStart,
    end: clip.sequenceStart + seqDuration,
  };
}

export function getBaseVideoSequenceRange(editedDuration: number): SequenceRange {
  return { start: 0, end: editedDuration };
}

export function sequenceRangesOverlap(
  a: SequenceRange,
  b: SequenceRange,
): boolean {
  return a.start < b.end - 0.001 && b.start < a.end - 0.001;
}

export function timelineVideoOverlapsBase(
  clip: TimelineVideoClip,
  editedDuration: number,
): boolean {
  if (editedDuration <= 0) return false;
  return sequenceRangesOverlap(
    getTimelineVideoSequenceRange(clip),
    getBaseVideoSequenceRange(editedDuration),
  );
}

/** Évite le chevauchement entre vidéos importées (poussée après le segment conflictuel). */
export function resolveTimelineVideoSequenceStart(
  clip: TimelineVideoClip,
  desiredStart: number,
  allClips: TimelineVideoClip[],
): number {
  let start = Math.max(0, desiredStart);
  const others = allClips.filter((item) => item.id !== clip.id);

  let changed = true;
  while (changed) {
    changed = false;
    const end = start + getTimelineVideoSequenceDuration(clip);
    for (const other of others) {
      const otherRange = getTimelineVideoSequenceRange(other);
      if (start < otherRange.end - 0.001 && end > otherRange.start + 0.001) {
        start = otherRange.end;
        changed = true;
        break;
      }
    }
  }

  return start;
}

export function resolveTimelineVideoPlacementStart(
  clip: TimelineVideoClip,
  desiredStart: number,
  editedDuration: number,
  allClips: TimelineVideoClip[],
): number {
  let start = Math.max(0, desiredStart);

  if (editedDuration > 0 && start < editedDuration) {
    start = editedDuration;
  }

  return resolveTimelineVideoSequenceStart(clip, start, allClips);
}

export function canAddCutInTimelineVideo(
  sequenceTime: number,
  clip: TimelineVideoClip,
): boolean {
  const seqDuration = getTimelineVideoSequenceDuration(clip);
  return (
    sequenceTime > clip.sequenceStart + MIN_TIMELINE_VIDEO_CUT_GAP &&
    sequenceTime < clip.sequenceStart + seqDuration - MIN_TIMELINE_VIDEO_CUT_GAP
  );
}

export function splitTimelineVideoAt(
  clips: TimelineVideoClip[],
  clipId: string,
  sequenceTime: number,
): TimelineVideoClip[] | null {
  const index = clips.findIndex((clip) => clip.id === clipId);
  if (index === -1) return null;

  const clip = clips[index];
  if (!canAddCutInTimelineVideo(sequenceTime, clip)) return null;

  const rate = getPlaybackRateForSpeed(getTimelineVideoSpeed(clip));
  const localSequenceCut = sequenceTime - clip.sequenceStart;
  const firstSourceDuration = localSequenceCut * rate;
  const firstPart: TimelineVideoClip = {
    ...clip,
    id: createTimelineVideoId(clip.sequenceStart),
    duration: firstSourceDuration,
  };
  const secondPart: TimelineVideoClip = {
    ...clip,
    id: createTimelineVideoId(sequenceTime),
    sequenceStart: sequenceTime,
    duration: clip.duration - firstSourceDuration,
    sourceStart: clip.sourceStart + firstSourceDuration,
  };

  return [...clips.slice(0, index), firstPart, secondPart, ...clips.slice(index + 1)].sort(
    (a, b) => a.sequenceStart - b.sequenceStart,
  );
}

export function updateTimelineVideoSpeed(
  clips: TimelineVideoClip[],
  clipId: string,
  speed: number,
): TimelineVideoClip[] | null {
  const index = clips.findIndex((clip) => clip.id === clipId);
  if (index === -1) return null;

  return clips.map((clip) =>
    clip.id === clipId ? { ...clip, speed: clampSegmentSpeed(speed) } : clip,
  );
}

export function resolveTimelineVideoLayout(
  clip: TimelineVideoClip,
  baseLayout: ClipLayoutState,
): ClipLayoutState {
  if (clip.layoutMode === "base") {
    return baseLayout;
  }

  return {
    camShape: "rounded",
    sourceCam: { x: 0, y: 0.78, width: 0.2, height: 0.2 * (16 / 9) },
    verticalCam: { x: 0.5, y: 0.5 },
    verticalCamZone: { x: 0, y: 0, width: 1, height: 1 },
    verticalCropPan: 0.5,
  };
}
