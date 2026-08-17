import {
  sourceTimeToSequenceTime,
  getEditedDuration,
  sequenceTimeToSourceTime,
  type TimeRange,
} from "./clipTime";
import type { TimelineVideoClip } from "./clipTimelineVideos";
import { getTotalTimelineDuration, getTimelineVideoSequenceDuration } from "./clipTimelineVideos";
import {
  actualSequenceToNatural,
  getTimelineInserts,
  naturalToActualAfterInsert,
} from "./clipTimelineInserts";
import { getSubtitleExportFontSizePx } from "@qg/subtitle-composition";
import {
  DEFAULT_SUBTITLE_FONT_ID,
  getSubtitleFontOption,
} from "@qg/subtitle-composition";
import type { SubtitleFontId } from "./subtitleFonts";
import {
  OVERLAY_LAYOUT_CENTER,
  OVERLAY_LAYOUT_SNAP_THRESHOLD,
  snapNormalizedAxis,
} from "./clipOverlaySnap";

export type {
  SubtitleFontId,
  SubtitleFontOption,
} from "./subtitleFonts";
export {
  SUBTITLE_FONT_OPTIONS,
  getSubtitleFontCssStyle,
} from "./subtitleFonts";
export { DEFAULT_SUBTITLE_FONT_ID, getSubtitleFontOption };

export type SubtitleWord = {
  id: string;
  text: string;
  start: number;
  end: number;
};

export type SequenceSubtitleWord = SubtitleWord & {
  sequenceStart: number;
  sequenceEnd: number;
};

export type SubtitleAnimation = "pop" | "bounce" | "fade" | "scale";

export type SubtitleTiming = {
  /** Décalage global (+ = plus tard, − = plus tôt) */
  syncOffsetMs: number;
  /** Afficher les mots X ms avant le timestamp Whisper */
  anticipationMs: number;
};

export type SubtitleStyle = {
  fontId: SubtitleFontId;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  animation: SubtitleAnimation;
  glowColor: string;
  glowIntensity: number;
  glowSpread: number;
};

/** Position et échelle normalisées dans la preview 9:16. */
export type SubtitleLayout = {
  /** Centre horizontal (0–1) */
  x: number;
  /** Centre vertical (0–1) */
  y: number;
  scale: number;
};

/** Constantes de rendu non modifiables par l'utilisateur. */
export const FIXED_SUBTITLE_STYLE = {
  /** Référence ASS legacy — préférer getSubtitleExportFontSizePx pour l'export. */
  fontSize: 72,
  position: "lower" as const,
  maxWordsOnScreen: 2,
};

export const EXPORT_CANVAS_WIDTH = 1080;
export const EXPORT_CANVAS_HEIGHT = 1920;
/** Largeur preview 9:16 typique (max-h 640px → ~360px). */
export const SUBTITLE_PREVIEW_REF_WIDTH = 360;

const SUBTITLE_REM_PX = 16;
const SUBTITLE_MIN_REM = 1.25;
const SUBTITLE_MAX_REM = 2.25;
const SUBTITLE_FLUID_RATIO = 0.055;

/** Taille de base (px) — équivalent du clamp CSS preview pour une largeur conteneur donnée. */
export function getSubtitleBaseFontSizePx(containerWidth: number): number {
  const minPx = SUBTITLE_MIN_REM * SUBTITLE_REM_PX;
  const maxPx = SUBTITLE_MAX_REM * SUBTITLE_REM_PX;
  const fluidPx = containerWidth * SUBTITLE_FLUID_RATIO;
  return Math.min(maxPx, Math.max(minPx, fluidPx));
}

export function getSubtitlePreviewFontSizePx(
  containerWidth: number,
  layoutScale: number,
): number {
  return getSubtitleBaseFontSizePx(containerWidth) * layoutScale;
}

export {
  getSubtitleExportFontSizePx,
  getExportVisualScale,
  getExportStrokeWidth,
  getExportGlowSpread,
} from "@qg/subtitle-composition";

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontId: DEFAULT_SUBTITLE_FONT_ID,
  fillColor: "#FFFFFF",
  strokeColor: "#000000",
  strokeWidth: 6,
  animation: "pop",
  glowColor: "#CDB7FF",
  glowIntensity: 65,
  glowSpread: 18,
};

export const SUBTITLE_GLOW_INTENSITY_RANGE = { min: 0, max: 100, step: 5 };
export const SUBTITLE_GLOW_SPREAD_RANGE = { min: 0, max: 40, step: 2 };
export const SUBTITLE_SCALE_RANGE = { min: 0.4, max: 2.5 };

export const DEFAULT_SUBTITLE_LAYOUT: SubtitleLayout = {
  x: 0.5,
  y: 0.78,
  scale: 1,
};

export const DEFAULT_SUBTITLE_TIMING: SubtitleTiming = {
  syncOffsetMs: -150,
  anticipationMs: 300,
};

export const SUBTITLE_LAYOUT_CENTER = OVERLAY_LAYOUT_CENTER;
export const SUBTITLE_LAYOUT_SNAP_THRESHOLD = OVERLAY_LAYOUT_SNAP_THRESHOLD;

export function snapSubtitleLayoutX(x: number): {
  x: number;
  snapped: boolean;
} {
  const snapped = snapNormalizedAxis(x);
  return { x: snapped.value, snapped: snapped.snapped };
}

export function snapSubtitleLayoutY(y: number): {
  y: number;
  snapped: boolean;
} {
  const snapped = snapNormalizedAxis(y);
  return { y: snapped.value, snapped: snapped.snapped };
}

export const SUBTITLE_SYNC_OFFSET_RANGE = { min: -500, max: 500, step: 25 };
export const SUBTITLE_ANTICIPATION_RANGE = { min: 0, max: 300, step: 25 };

export const SUBTITLE_ANIMATION_OPTIONS: {
  id: SubtitleAnimation;
  label: string;
}[] = [
  { id: "pop", label: "Pop" },
  { id: "bounce", label: "Rebond" },
  { id: "fade", label: "Fondu" },
  { id: "scale", label: "Zoom" },
];

export function createSubtitleWordId(index: number, start: number): string {
  return `sub-${index}-${start.toFixed(3)}`;
}

export function createSubtitleWordIdUnique(start: number): string {
  return `sub-${start.toFixed(3)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const MIN_SUBTITLE_WORD_DURATION = 0.08;
export const DEFAULT_NEW_SUBTITLE_WORD_DURATION = 0.45;

export function sortSubtitleWords(words: SubtitleWord[]): SubtitleWord[] {
  return [...words].sort((a, b) => a.start - b.start || a.end - b.end);
}

export function getKeepSegmentContainingSourceTime(
  time: number,
  keepSegments: TimeRange[],
): TimeRange | undefined {
  return keepSegments.find(
    (segment) => time >= segment.start && time < segment.end,
  );
}

export function createSubtitleWordAtSourceTime(
  sourceTime: number,
  keepSegments: TimeRange[],
): SubtitleWord | null {
  const segment = getKeepSegmentContainingSourceTime(sourceTime, keepSegments);
  if (!segment) return null;

  const end = Math.min(
    sourceTime + DEFAULT_NEW_SUBTITLE_WORD_DURATION,
    segment.end,
  );
  if (end - sourceTime < MIN_SUBTITLE_WORD_DURATION) return null;

  return {
    id: createSubtitleWordIdUnique(sourceTime),
    text: "Mot",
    start: sourceTime,
    end,
  };
}

export function sourceWordBoundsFromSequenceBounds(
  sequenceStart: number,
  sequenceEnd: number,
  keepSegments: TimeRange[],
  timing: SubtitleTiming,
): { start: number; end: number } | null {
  if (keepSegments.length === 0) return null;

  const seqStart = Math.min(sequenceStart, sequenceEnd);
  const seqEnd = Math.max(sequenceStart, sequenceEnd);
  if (seqEnd - seqStart < MIN_SUBTITLE_WORD_DURATION) return null;

  const displayedStart = sequenceTimeToSourceTime(seqStart, keepSegments);
  const displayedEnd = sequenceTimeToSourceTime(seqEnd, keepSegments);
  if (displayedEnd - displayedStart < MIN_SUBTITLE_WORD_DURATION) return null;

  const offsetSec = timing.syncOffsetMs / 1000;
  const leadSec = timing.anticipationMs / 1000;
  const start = Math.max(0, displayedStart + leadSec - offsetSec);
  const end = Math.max(start + MIN_SUBTITLE_WORD_DURATION, displayedEnd - offsetSec);

  if (!isWordInsideKeepSegments({ id: "", text: "", start, end }, keepSegments)) {
    return null;
  }

  return { start, end };
}

export function resizeSubtitleWordAtSequenceEdge(
  word: SubtitleWord,
  edge: "start" | "end",
  sequenceTime: number,
  fixedSequenceBound: number,
  keepSegments: TimeRange[],
  timing: SubtitleTiming,
  editedDuration: number,
): { start: number; end: number } | null {
  const minDuration = MIN_SUBTITLE_WORD_DURATION;

  let seqStart: number;
  let seqEnd: number;

  if (edge === "start") {
    seqEnd = fixedSequenceBound;
    seqStart = Math.max(0, Math.min(sequenceTime, seqEnd - minDuration));
  } else {
    seqStart = fixedSequenceBound;
    seqEnd = Math.min(
      editedDuration,
      Math.max(sequenceTime, seqStart + minDuration),
    );
  }

  const bounds = sourceWordBoundsFromSequenceBounds(
    seqStart,
    seqEnd,
    keepSegments,
    timing,
  );
  if (!bounds) return null;

  return updateSubtitleWordBounds(word, bounds, keepSegments);
}

export function updateSubtitleWordBounds(
  word: SubtitleWord,
  patch: Partial<Pick<SubtitleWord, "start" | "end">>,
  keepSegments: TimeRange[],
): SubtitleWord | null {
  const start = patch.start ?? word.start;
  const end = patch.end ?? word.end;
  if (end - start < MIN_SUBTITLE_WORD_DURATION) return null;

  if (!isWordInsideKeepSegments({ ...word, start, end }, keepSegments)) {
    return null;
  }

  return { ...word, start, end };
}

export function moveSubtitleWordBySequenceOffset(
  word: SubtitleWord,
  sequenceOffset: number,
  keepSegments: TimeRange[],
  timing: SubtitleTiming,
  initialSeqStart: number,
  initialSeqEnd: number,
): SubtitleWord | null {
  const editedDuration = getEditedDuration(keepSegments);
  const seqDuration = initialSeqEnd - initialSeqStart;

  let newSeqStart = initialSeqStart + sequenceOffset;
  if (newSeqStart < 0) newSeqStart = 0;
  if (newSeqStart + seqDuration > editedDuration) {
    newSeqStart = Math.max(0, editedDuration - seqDuration);
  }

  const bounds = sourceWordBoundsFromSequenceBounds(
    newSeqStart,
    newSeqStart + seqDuration,
    keepSegments,
    timing,
  );
  if (!bounds) return null;

  return updateSubtitleWordBounds(word, bounds, keepSegments);
}

export function hasMemeTimelineInserts(
  timelineVideos: TimelineVideoClip[],
): boolean {
  return timelineVideos.some((clip) => clip.importKind === "meme");
}

/** Timeline étendue (memes ou clips append) — le playhead suit le temps séquence réel. */
export function usesExtendedTimelineSubtitles(
  timelineVideos: TimelineVideoClip[],
): boolean {
  return timelineVideos.length > 0;
}

/** @deprecated Utiliser usesExtendedTimelineSubtitles */
export function usesFullTimelineSubtitles(
  timelineVideos: TimelineVideoClip[],
): boolean {
  return usesExtendedTimelineSubtitles(timelineVideos);
}

function actualSequenceBoundsToSourceBounds(
  actualSeqStart: number,
  actualSeqEnd: number,
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
  timing: SubtitleTiming,
): { start: number; end: number } | null {
  const inserts = getTimelineInserts(timelineVideos);
  const naturalStart = actualSequenceToNatural(actualSeqStart, inserts);
  const naturalEnd = actualSequenceToNatural(actualSeqEnd, inserts);
  if (naturalStart === null || naturalEnd === null) return null;

  return sourceWordBoundsFromSequenceBounds(
    naturalStart,
    naturalEnd,
    keepSegments,
    timing,
  );
}

function subtractMemeRangesFromInterval(
  start: number,
  end: number,
  memeRanges: SequenceRange[],
): SequenceRange[] {
  if (end - start < MIN_SUBTITLE_WORD_DURATION) return [];

  let intervals: SequenceRange[] = [{ start, end }];
  const sortedMemeRanges = [...memeRanges].sort((a, b) => a.start - b.start);

  for (const memeRange of sortedMemeRanges) {
    intervals = intervals.flatMap((interval) => {
      if (
        interval.end <= memeRange.start + 0.001 ||
        interval.start >= memeRange.end - 0.001
      ) {
        return [interval];
      }

      const pieces: SequenceRange[] = [];
      if (interval.start < memeRange.start - 0.001) {
        pieces.push({ start: interval.start, end: memeRange.start });
      }
      if (interval.end > memeRange.end + 0.001) {
        pieces.push({ start: memeRange.end, end: interval.end });
      }
      return pieces;
    });
  }

  return intervals.filter(
    (interval) => interval.end - interval.start >= MIN_SUBTITLE_WORD_DURATION,
  );
}

export function mapSubtitleWordsToDisplaySequence(
  words: SubtitleWord[],
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
  timing: SubtitleTiming,
): SequenceSubtitleWord[] {
  const inserts = getTimelineInserts(timelineVideos);
  const memeRanges = getMemeSequenceRanges(timelineVideos);
  const timedWords = applySubtitleTimingToWords(words, timing);
  const editedDuration = getEditedDuration(keepSegments);

  return timedWords
    .flatMap((word) => {
      const isTimelineClipWord =
        memeRanges.length > 0 &&
        editedDuration > 0 &&
        word.start >= editedDuration - 0.05;

      if (isTimelineClipWord) {
        const sequenceStart = word.start;
        const sequenceEnd = word.end;
        const visibleIntervals = subtractMemeRangesFromInterval(
          sequenceStart,
          sequenceEnd,
          memeRanges,
        );

        return visibleIntervals.map((interval, index) => ({
          ...word,
          id:
            visibleIntervals.length > 1
              ? `${word.id}-part${index}`
              : word.id,
          sequenceStart: interval.start,
          sequenceEnd: interval.end,
        }));
      }

      const naturalStart = sourceTimeToSequenceTime(word.start, keepSegments);
      const naturalEnd = sourceTimeToSequenceTime(word.end, keepSegments);
      const actualStart = naturalToActualAfterInsert(naturalStart, inserts);
      const actualEnd = naturalToActualAfterInsert(naturalEnd, inserts);
      const visibleIntervals = subtractMemeRangesFromInterval(
        actualStart,
        actualEnd,
        memeRanges,
      );

      return visibleIntervals.map((interval, index) => ({
        ...word,
        id:
          visibleIntervals.length > 1 ? `${word.id}-part${index}` : word.id,
        sequenceStart: interval.start,
        sequenceEnd: interval.end,
      }));
    })
    .filter((word) => word.sequenceEnd > word.sequenceStart)
    .sort(
      (a, b) =>
        a.sequenceStart - b.sequenceStart || a.sequenceEnd - b.sequenceEnd,
    );
}

/** @deprecated Utiliser mapSubtitleWordsToDisplaySequence */
export function mapFullTimelineSubtitleWordsToSequence(
  words: SubtitleWord[],
  timing: SubtitleTiming,
  keepSegments: TimeRange[] = [],
  timelineVideos: TimelineVideoClip[] = [],
): SequenceSubtitleWord[] {
  if (keepSegments.length === 0 && timelineVideos.length === 0) {
    return words
      .map((word) => applySubtitleTimingToWord(word, timing))
      .map((word) => ({
        ...word,
        sequenceStart: word.start,
        sequenceEnd: word.end,
      }))
      .filter((word) => word.sequenceEnd > word.sequenceStart)
      .sort(
        (a, b) =>
          a.sequenceStart - b.sequenceStart || a.sequenceEnd - b.sequenceEnd,
      );
  }

  return mapSubtitleWordsToDisplaySequence(
    words,
    keepSegments,
    timelineVideos,
    timing,
  );
}

export function createSubtitleWordAtSequenceTime(
  sequenceTime: number,
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
  totalDuration: number,
  timing: SubtitleTiming,
): SubtitleWord | null {
  const displayedEnd = Math.min(
    sequenceTime + DEFAULT_NEW_SUBTITLE_WORD_DURATION,
    totalDuration,
  );
  if (displayedEnd - sequenceTime < MIN_SUBTITLE_WORD_DURATION) return null;

  const bounds = actualSequenceBoundsToSourceBounds(
    sequenceTime,
    displayedEnd,
    keepSegments,
    timelineVideos,
    timing,
  );
  if (!bounds) return null;

  return {
    id: createSubtitleWordIdUnique(bounds.start),
    text: "Mot",
    start: bounds.start,
    end: bounds.end,
  };
}

export function resizeFullTimelineSubtitleWordAtSequenceEdge(
  _word: SubtitleWord,
  edge: "start" | "end",
  sequenceTime: number,
  fixedSequenceBound: number,
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
  timing: SubtitleTiming,
  totalDuration: number,
): { start: number; end: number } | null {
  const minDuration = MIN_SUBTITLE_WORD_DURATION;
  let seqStart: number;
  let seqEnd: number;

  if (edge === "start") {
    seqEnd = fixedSequenceBound;
    seqStart = Math.max(0, Math.min(sequenceTime, seqEnd - minDuration));
  } else {
    seqStart = fixedSequenceBound;
    seqEnd = Math.min(totalDuration, Math.max(sequenceTime, seqStart + minDuration));
  }

  return actualSequenceBoundsToSourceBounds(
    seqStart,
    seqEnd,
    keepSegments,
    timelineVideos,
    timing,
  );
}

export function moveFullTimelineSubtitleWord(
  word: SubtitleWord,
  sequenceOffset: number,
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
  timing: SubtitleTiming,
  initialSeqStart: number,
  initialSeqEnd: number,
  totalDuration: number,
): SubtitleWord | null {
  const seqDuration = initialSeqEnd - initialSeqStart;
  let newSeqStart = initialSeqStart + sequenceOffset;
  if (newSeqStart < 0) newSeqStart = 0;
  if (newSeqStart + seqDuration > totalDuration) {
    newSeqStart = Math.max(0, totalDuration - seqDuration);
  }

  const bounds = actualSequenceBoundsToSourceBounds(
    newSeqStart,
    newSeqStart + seqDuration,
    keepSegments,
    timelineVideos,
    timing,
  );
  if (!bounds) return null;

  return { ...word, start: bounds.start, end: bounds.end };
}

export function getSubtitleTimelineDuration(
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): number {
  return getTotalTimelineDuration(keepSegments, timelineVideos);
}

export function formatSubtitleWordTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const whole = Math.floor(safe);
  const decimal = Math.floor((safe % 1) * 10);
  return `${whole}.${decimal}s`;
}

export function normalizeTranscribedWords(
  rawWords: { text: string; start: number; end: number }[],
): SubtitleWord[] {
  return rawWords
    .filter((word) => word.text.trim().length > 0)
    .map((word, index) => ({
      id: createSubtitleWordId(index, word.start),
      text: word.text.trim(),
      start: word.start,
      end: Math.max(word.end, word.start + 0.05),
    }));
}

type SequenceRange = {
  start: number;
  end: number;
};

function getMemeSequenceRanges(
  timelineVideos: TimelineVideoClip[],
): SequenceRange[] {
  return timelineVideos
    .filter((clip) => clip.importKind === "meme")
    .map((clip) => ({
      start: clip.sequenceStart,
      end: clip.sequenceStart + getTimelineVideoSequenceDuration(clip),
    }));
}

/** Retire les mots entièrement contenus dans un passage meme (temps séquence réel). */
export function filterSubtitleWordsOutsideMemeRanges(
  words: SubtitleWord[],
  timelineVideos: TimelineVideoClip[],
  keepSegments: TimeRange[],
): SubtitleWord[] {
  const memeRanges = getMemeSequenceRanges(timelineVideos);
  if (memeRanges.length === 0) return words;

  const inserts = getTimelineInserts(timelineVideos);
  const editedDuration = getEditedDuration(keepSegments);

  return words.filter((word) => {
    const isTimelineClipWord =
      editedDuration > 0 && word.start >= editedDuration - 0.05;

    const actualStart = isTimelineClipWord
      ? word.start
      : naturalToActualAfterInsert(
          sourceTimeToSequenceTime(word.start, keepSegments),
          inserts,
        );
    const actualEnd = isTimelineClipWord
      ? word.end
      : naturalToActualAfterInsert(
          sourceTimeToSequenceTime(word.end, keepSegments),
          inserts,
        );

    const mid = (actualStart + actualEnd) / 2;
    return !memeRanges.some(
      (range) => mid >= range.start && mid < range.end,
    );
  });
}

/** Applique anticipation + décalage sync sur les timestamps source. */
export function applySubtitleTimingToWord(
  word: SubtitleWord,
  timing: SubtitleTiming,
): SubtitleWord {
  const offsetSec = timing.syncOffsetMs / 1000;
  const leadSec = timing.anticipationMs / 1000;
  const start = Math.max(0, word.start - leadSec + offsetSec);
  const end = Math.max(start + 0.05, word.end + offsetSec);
  return { ...word, start, end };
}

export function applySubtitleTimingToWords(
  words: SubtitleWord[],
  timing: SubtitleTiming,
): SubtitleWord[] {
  return words.map((word) => applySubtitleTimingToWord(word, timing));
}

export function remapTimedSubtitleWordsToSequence(
  words: SubtitleWord[],
  keepSegments: TimeRange[],
  timing: SubtitleTiming,
): SequenceSubtitleWord[] {
  return remapSubtitleWordsToSequence(
    applySubtitleTimingToWords(words, timing),
    keepSegments,
  );
}

export function isWordInsideKeepSegments(
  word: SubtitleWord,
  keepSegments: TimeRange[],
): boolean {
  return keepSegments.some(
    (segment) => word.end > segment.start && word.start < segment.end,
  );
}

/** Filtre et remappe les mots (temps source) vers la timeline compactée. */
export function remapSubtitleWordsToSequence(
  words: SubtitleWord[],
  keepSegments: TimeRange[],
): SequenceSubtitleWord[] {
  if (keepSegments.length === 0) return [];

  return words
    .filter((word) => isWordInsideKeepSegments(word, keepSegments))
    .map((word) => ({
      ...word,
      sequenceStart: sourceTimeToSequenceTime(word.start, keepSegments),
      sequenceEnd: sourceTimeToSequenceTime(word.end, keepSegments),
    }))
    .filter((word) => word.sequenceEnd > word.sequenceStart)
    .sort((a, b) => a.sequenceStart - b.sequenceStart);
}

/** Retourne jusqu'à 2 mots visibles à un instant (temps séquence). */
export { getVisibleWordsAtSequenceTime } from "@qg/subtitle-composition";

export function clampSubtitleScale(scale: number): number {
  return Math.max(
    SUBTITLE_SCALE_RANGE.min,
    Math.min(SUBTITLE_SCALE_RANGE.max, scale),
  );
}

export function normalizeSubtitleLayout(
  layout: Partial<SubtitleLayout>,
): SubtitleLayout {
  return {
    ...DEFAULT_SUBTITLE_LAYOUT,
    ...layout,
    scale: clampSubtitleScale(layout.scale ?? DEFAULT_SUBTITLE_LAYOUT.scale),
  };
}

function assAlphaFromIntensity(intensity: number): string {
  const clamped = Math.max(0, Math.min(100, intensity));
  const transparent = Math.round((1 - clamped / 100) * 255);
  return transparent.toString(16).toUpperCase().padStart(2, "0");
}

/** Styles CSS pour la couche de lueur externe (derrière le texte). */
export function getSubtitleOuterGlowStyle(style: SubtitleStyle): {
  visible: boolean;
  color: string;
  WebkitTextFillColor: string;
  WebkitTextStroke: string;
  paintOrder: "stroke fill";
  opacity: number;
  filter: string;
} {
  const visible = style.glowIntensity > 0 && style.glowSpread > 0;
  const outerStroke = style.strokeWidth + style.glowSpread;

  return {
    visible,
    color: "transparent",
    WebkitTextFillColor: "transparent",
    WebkitTextStroke: `${outerStroke}px ${style.glowColor}`,
    paintOrder: "stroke fill",
    opacity: style.glowIntensity / 100,
    filter: `blur(${Math.max(1, style.glowSpread * 0.35)}px)`,
  };
}

function buildAssPositionTags(style: AssSubtitleStyle): string {
  const x = Math.round(style.layoutX * 1080);
  const y = Math.round(style.layoutY * 1920);
  return `{\\an5\\pos(${x},${y})\\fs${Math.round(style.fontSize)}}`;
}

function buildAssMainTags(style: AssSubtitleStyle): string {
  const fill = assColorFromHex(style.fillColor);
  const outline = assColorFromHex(style.strokeColor);
  return `${buildAssPositionTags(style)}\\1c${fill}\\3c${outline}\\bord${style.strokeWidth}`;
}

function buildAssOuterGlowTags(style: AssSubtitleStyle): string {
  if (style.glowIntensity <= 0 || style.glowSpread <= 0) return "";

  const glowColor = assColorFromHex(style.glowColor);
  const blur = Math.max(1, Math.round(style.glowSpread * 0.65));
  const outerBorder = style.strokeWidth + Math.max(1, Math.round(style.glowSpread));
  const outlineAlpha = assAlphaFromIntensity(style.glowIntensity);

  return `${buildAssPositionTags(style)}\\1a&HFF&\\3c${glowColor}\\3a&H${outlineAlpha}&\\blur${blur}\\bord${outerBorder}`;
}

export function toExportSubtitleStyle(
  style: SubtitleStyle,
  layout: SubtitleLayout,
  previewContainerWidth: number = SUBTITLE_PREVIEW_REF_WIDTH,
) {
  const normalizedLayout = normalizeSubtitleLayout(layout);
  const font = getSubtitleFontOption(style.fontId);
  return {
    preset: "word-pop" as const,
    fontId: style.fontId,
    fontFamily: font.assFontName,
    fontSize: getSubtitleExportFontSizePx(
      normalizedLayout.scale,
      previewContainerWidth,
    ),
    fillColor: style.fillColor,
    strokeColor: style.strokeColor,
    strokeWidth: style.strokeWidth,
    position: FIXED_SUBTITLE_STYLE.position,
    animation: style.animation,
    glowColor: style.glowColor,
    glowIntensity: style.glowIntensity,
    glowSpread: style.glowSpread,
    layoutX: normalizedLayout.x,
    layoutY: normalizedLayout.y,
    previewContainerWidth,
  };
}

export function formatAssTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const centis = Math.floor((safe % 1) * 100);
  return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${centis.toString().padStart(2, "0")}`;
}

function assColorFromHex(hex: string): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "&H00FFFFFF";
  const r = normalized.slice(0, 2);
  const g = normalized.slice(2, 4);
  const b = normalized.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

/** Style complet pour export ASS (base fixe + personnalisation user). */
export type AssSubtitleStyle = SubtitleStyle & {
  fontFamily: string;
  fontSize: number;
  position: "center" | "lower";
  layoutX: number;
  layoutY: number;
};

export function buildAssSubtitleStyle(
  style: SubtitleStyle,
  layout: SubtitleLayout,
): AssSubtitleStyle {
  const normalizedLayout = normalizeSubtitleLayout(layout);
  const font = getSubtitleFontOption(style.fontId);
  return {
    ...style,
    fontFamily: font.assFontName,
    fontSize: Math.round(
      FIXED_SUBTITLE_STYLE.fontSize * normalizedLayout.scale,
    ),
    position: FIXED_SUBTITLE_STYLE.position,
    layoutX: normalizedLayout.x,
    layoutY: normalizedLayout.y,
  };
}

/** Génère un fichier ASS pour burn-in FFmpeg (1080×1920). */
export function generateAssContent(
  words: SequenceSubtitleWord[],
  style: AssSubtitleStyle,
): string {
  const primary = assColorFromHex(style.fillColor);
  const outline = assColorFromHex(style.strokeColor);
  const alignment = style.position === "center" ? 5 : 2;
  const marginV = style.position === "center" ? 960 : 280;

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: WordPop,${style.fontFamily},${style.fontSize},${primary},${primary},${outline},&H00000000,-1,0,0,0,100,100,0,0,1,${style.strokeWidth},0,${alignment},40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const dialogues = words
    .flatMap((word) => {
      const text = word.text.toUpperCase().replace(/\n/g, " ");
      const glowTags = buildAssOuterGlowTags(style);
      const mainTags = buildAssMainTags(style);
      const lines = [`Dialogue: 0,${formatAssTime(word.sequenceStart)},${formatAssTime(word.sequenceEnd)},WordPop,,0,0,0,,${mainTags}${text}`];
      if (glowTags) {
        lines.unshift(
          `Dialogue: 0,${formatAssTime(word.sequenceStart)},${formatAssTime(word.sequenceEnd)},WordPop,,0,0,0,,${glowTags}${text}`,
        );
      }
      return lines;
    })
    .join("\n");

  return `${header}${dialogues}\n`;
}
