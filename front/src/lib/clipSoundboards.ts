import {
  getEditedDuration,
  sequenceTimeToSourceTime,
  sourceTimeToSequenceTime,
  type TimeRange,
} from "./clipTime";
import { storedTimeToActualSequence } from "./clipTimelineInserts";
import type { TimelineVideoClip } from "./clipTimelineVideos";

export type SoundboardClip = {
  id: string;
  start: number;
  end: number;
  src: string;
  label: string;
  volume: number;
  /** Timestamps exprimés en temps séquence (timeline étendue). */
  usesSequenceTime?: boolean;
};

export type PackedSoundboardClip = SoundboardClip & {
  sequenceStart: number;
  sequenceEnd: number;
};

export const DEFAULT_SOUNDBOARD_DURATION = 2;
export const MIN_SOUNDBOARD_DURATION = 0.2;
export const DEFAULT_SOUNDBOARD_VOLUME = 0.85;
export const SOUNDBOARD_VOLUME_RANGE = { min: 0, max: 1, step: 0.05 } as const;

export function clampSoundboardVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function createSoundboardId(start: number): string {
  return `sfx-${start.toFixed(3)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSoundboardLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "Son";
  return trimmed.length > 22 ? `${trimmed.slice(0, 22)}…` : trimmed;
}

export function cloneSoundboards(clips: SoundboardClip[]): SoundboardClip[] {
  return clips.map((clip) => ({ ...clip }));
}

function getKeepSegmentContainingTime(
  time: number,
  keepSegments: TimeRange[],
): TimeRange | undefined {
  return keepSegments.find(
    (segment) => time >= segment.start && time < segment.end,
  );
}

export function findSoundboardAtTime(
  clips: SoundboardClip[],
  time: number,
): SoundboardClip | undefined {
  return clips.find(
    (clip) =>
      !clip.usesSequenceTime && time >= clip.start && time < clip.end,
  );
}

export function findSoundboardAtSequenceTime(
  clips: SoundboardClip[],
  sequenceTime: number,
): SoundboardClip | undefined {
  return clips.find(
    (clip) =>
      clip.usesSequenceTime &&
      sequenceTime >= clip.start &&
      sequenceTime < clip.end,
  );
}

export function getActiveSoundboardsForPlayhead(
  clips: SoundboardClip[],
  sequenceTime: number,
  sourceTime: number,
): SoundboardClip[] {
  return clips.filter((clip) => {
    if (clip.usesSequenceTime) {
      return sequenceTime >= clip.start && sequenceTime < clip.end;
    }
    return sourceTime >= clip.start && sourceTime < clip.end;
  });
}

export function getActivePackedSoundboardsAtSequence(
  clips: SoundboardClip[],
  sequenceTime: number,
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[] = [],
): PackedSoundboardClip[] {
  return mapSoundboardsToSequence(clips, keepSegments, timelineVideos).filter(
    (clip) =>
      sequenceTime >= clip.sequenceStart && sequenceTime < clip.sequenceEnd,
  );
}

export function isPersistedSoundboardSrc(src: string): boolean {
  if (!src.trim()) return false;
  if (src.startsWith("blob:")) return false;
  return true;
}

export function sanitizeSoundboardClip(clip: SoundboardClip): SoundboardClip {
  return {
    ...clip,
    volume: clampSoundboardVolume(
      Number.isFinite(clip.volume) ? clip.volume : DEFAULT_SOUNDBOARD_VOLUME,
    ),
    label: createSoundboardLabel(clip.label),
  };
}

export function resolveSoundboardPlaybackVolume(
  clipVolume: number,
  previewVolume: number,
): number {
  const clip = clampSoundboardVolume(
    Number.isFinite(clipVolume) ? clipVolume : DEFAULT_SOUNDBOARD_VOLUME,
  );
  const preview = Math.max(
    0,
    Math.min(1, Number.isFinite(previewVolume) ? previewVolume : 0.5),
  );
  return Math.max(0, Math.min(1, clip * preview));
}

export function mapSoundboardsToSequence(
  clips: SoundboardClip[],
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[] = [],
): PackedSoundboardClip[] {
  if (keepSegments.length === 0) return [];

  return clips
    .filter((clip) =>
      clip.usesSequenceTime
        ? true
        : keepSegments.some(
            (segment) => clip.end > segment.start && clip.start < segment.end,
          ),
    )
    .map((clip) => ({
      ...clip,
      sequenceStart: storedTimeToActualSequence(
        clip.start,
        Boolean(clip.usesSequenceTime),
        keepSegments,
        timelineVideos,
      ),
      sequenceEnd: storedTimeToActualSequence(
        clip.end,
        Boolean(clip.usesSequenceTime),
        keepSegments,
        timelineVideos,
      ),
    }))
    .filter((clip) => clip.sequenceEnd > clip.sequenceStart + 0.05)
    .sort((a, b) => a.sequenceStart - b.sequenceStart);
}

export function createSoundboardAtTime(
  time: number,
  keepSegments: TimeRange[],
  src: string,
  label: string,
  durationSec = DEFAULT_SOUNDBOARD_DURATION,
  volume = DEFAULT_SOUNDBOARD_VOLUME,
): SoundboardClip | null {
  const segment = getKeepSegmentContainingTime(time, keepSegments);
  if (!segment) return null;

  const safeDuration = Math.max(MIN_SOUNDBOARD_DURATION, durationSec);
  const end = Math.min(time + safeDuration, segment.end);
  if (end - time < MIN_SOUNDBOARD_DURATION) return null;

  return {
    id: createSoundboardId(time),
    start: time,
    end,
    src,
    label: createSoundboardLabel(label),
    volume: clampSoundboardVolume(volume),
  };
}

export function createSoundboardAtSequenceTime(
  sequenceTime: number,
  timelineDuration: number,
  src: string,
  label: string,
  durationSec = DEFAULT_SOUNDBOARD_DURATION,
  volume = DEFAULT_SOUNDBOARD_VOLUME,
): SoundboardClip | null {
  const safeDuration = Math.max(MIN_SOUNDBOARD_DURATION, durationSec);
  const end = Math.min(sequenceTime + safeDuration, timelineDuration);
  if (end - sequenceTime < MIN_SOUNDBOARD_DURATION) return null;

  return {
    id: createSoundboardId(sequenceTime),
    start: sequenceTime,
    end,
    src,
    label: createSoundboardLabel(label),
    volume: clampSoundboardVolume(volume),
    usesSequenceTime: true,
  };
}

export function updateSoundboardBounds(
  clip: SoundboardClip,
  patch: Partial<Pick<SoundboardClip, "start" | "end">>,
  keepSegments: TimeRange[],
  timelineDuration?: number,
): SoundboardClip | null {
  const start = patch.start ?? clip.start;
  const end = patch.end ?? clip.end;
  if (end - start < MIN_SOUNDBOARD_DURATION) return null;

  if (clip.usesSequenceTime) {
    const maxDuration = timelineDuration ?? getEditedDuration(keepSegments);
    if (start < 0 || end > maxDuration + 0.01) return null;
    return { ...clip, start, end };
  }

  const overlaps = keepSegments.some(
    (segment) => end > segment.start && start < segment.end,
  );
  if (!overlaps) return null;

  return { ...clip, start, end };
}

export function moveSoundboardBySequenceOffset(
  clip: SoundboardClip,
  sequenceOffset: number,
  keepSegments: TimeRange[],
  initialSeqStart?: number,
  initialSeqEnd?: number,
  timelineDuration?: number,
): SoundboardClip | null {
  if (keepSegments.length === 0) return null;

  const editedDuration = getEditedDuration(keepSegments);
  const maxDuration = timelineDuration ?? editedDuration;
  const seqStart =
    initialSeqStart ??
    (clip.usesSequenceTime
      ? clip.start
      : sourceTimeToSequenceTime(clip.start, keepSegments));
  const seqEnd =
    initialSeqEnd ??
    (clip.usesSequenceTime
      ? clip.end
      : sourceTimeToSequenceTime(clip.end, keepSegments));
  const seqDuration = seqEnd - seqStart;

  let newSeqStart = seqStart + sequenceOffset;
  if (newSeqStart < 0) newSeqStart = 0;
  const maxStart = clip.usesSequenceTime ? maxDuration : editedDuration;
  if (newSeqStart + seqDuration > maxStart) {
    newSeqStart = Math.max(0, maxStart - seqDuration);
  }

  const newSeqEnd = newSeqStart + seqDuration;

  if (clip.usesSequenceTime) {
    return updateSoundboardBounds(
      clip,
      { start: newSeqStart, end: newSeqEnd },
      keepSegments,
      maxDuration,
    );
  }

  const newStart = sequenceTimeToSourceTime(newSeqStart, keepSegments);
  const newEnd = sequenceTimeToSourceTime(newSeqEnd, keepSegments);

  return updateSoundboardBounds(
    clip,
    { start: newStart, end: newEnd },
    keepSegments,
  );
}

export async function probeAudioDurationSec(src: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = src;

    const finish = (duration: number) => {
      audio.src = "";
      resolve(Math.max(MIN_SOUNDBOARD_DURATION, duration));
    };

    audio.addEventListener(
      "loadedmetadata",
      () => {
        finish(
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : DEFAULT_SOUNDBOARD_DURATION,
        );
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => finish(DEFAULT_SOUNDBOARD_DURATION),
      { once: true },
    );
  });
}
