import {
  clampSegmentSpeed,
  getSequenceDurationForSourceDuration,
  sourceOffsetToSequenceOffset,
} from "./segmentSpeed.js";
import type {
  SequenceSubtitleWord,
  SubtitleTiming,
  SubtitleWord,
  TimeRange,
} from "./types.js";
import { applySubtitleTimingToWord } from "./timing.js";

function buildPackedOffsets(segments: TimeRange[]): {
  segment: TimeRange;
  sequenceStart: number;
  sequenceEnd: number;
}[] {
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  let offset = 0;

  return sorted.map((segment) => {
    const duration = getSequenceDurationForSourceDuration(
      segment.end - segment.start,
      clampSegmentSpeed(segment.speed),
    );
    const packed = {
      segment,
      sequenceStart: offset,
      sequenceEnd: offset + duration,
    };
    offset += duration;
    return packed;
  });
}

function sourceTimeToSequenceTime(
  sourceTime: number,
  segments: TimeRange[],
  mode: "start" | "end" = "start",
): number {
  const packed = buildPackedOffsets(segments);
  if (packed.length === 0) return 0;

  for (const entry of packed) {
    const inSegment =
      mode === "start"
        ? sourceTime >= entry.segment.start && sourceTime < entry.segment.end
        : sourceTime > entry.segment.start && sourceTime <= entry.segment.end;

    if (inSegment) {
      const speed = clampSegmentSpeed(entry.segment.speed);
      const sourceOffset = sourceTime - entry.segment.start;
      const sequenceOffset = sourceOffsetToSequenceOffset(sourceOffset, speed);
      return entry.sequenceStart + sequenceOffset;
    }
  }

  for (const entry of packed) {
    if (sourceTime >= entry.segment.start && sourceTime <= entry.segment.end) {
      const clampedTime = Math.min(sourceTime, entry.segment.end);
      const speed = clampSegmentSpeed(entry.segment.speed);
      const sourceOffset = clampedTime - entry.segment.start;
      const sequenceOffset = sourceOffsetToSequenceOffset(sourceOffset, speed);
      return entry.sequenceStart + sequenceOffset;
    }
  }

  const last = packed[packed.length - 1];
  if (sourceTime >= last.segment.end) return last.sequenceEnd;

  const first = packed[0];
  if (sourceTime < first.segment.start) return first.sequenceStart;

  return 0;
}

/** Temps source (lecture vidéo) → temps séquence (timeline montée). */
export function mapSourceTimeToSequenceTime(
  sourceTime: number,
  segments: TimeRange[],
): number {
  return sourceTimeToSequenceTime(sourceTime, segments, "start");
}

function isWordInsideKeepSegments(
  word: SubtitleWord,
  keepSegments: TimeRange[],
): boolean {
  return keepSegments.some(
    (segment) => word.end > segment.start && word.start < segment.end,
  );
}

export function remapSubtitleWordsToSequence(
  words: SubtitleWord[],
  keepSegments: TimeRange[],
  timing?: SubtitleTiming,
): SequenceSubtitleWord[] {
  if (keepSegments.length === 0) return [];

  const timedWords = timing
    ? words.map((word) => applySubtitleTimingToWord(word, timing))
    : words;

  return timedWords
    .filter((word) => isWordInsideKeepSegments(word, keepSegments))
    .map((word) => ({
      ...word,
      sequenceStart: sourceTimeToSequenceTime(word.start, keepSegments, "start"),
      sequenceEnd: sourceTimeToSequenceTime(word.end, keepSegments, "end"),
    }))
    .filter((word) => word.sequenceEnd > word.sequenceStart)
    .sort((a, b) => a.sequenceStart - b.sequenceStart);
}

export function remapTimedSubtitleWordsToSequence(
  words: SubtitleWord[],
  keepSegments: TimeRange[],
  timing: SubtitleTiming,
): SequenceSubtitleWord[] {
  return remapSubtitleWordsToSequence(words, keepSegments, timing);
}
