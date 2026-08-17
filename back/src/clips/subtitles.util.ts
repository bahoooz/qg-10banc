import {
  clampSegmentSpeed,
  getSequenceDurationForSourceDuration,
  sourceOffsetToSequenceOffset,
} from "./segmentSpeed.util.js";
import { getAssFontName } from "@qg/subtitle-composition";
import type { TimeSegment } from "./ffmpeg.service.js";
import type { SubtitleStylePayload, SubtitleWordPayload } from "./subtitles.types.js";
import type { TextOverlayExportPayload } from "./export.types.js";

export type SubtitleTimingPayload = {
  syncOffsetMs: number;
  anticipationMs: number;
};

export type SequenceSubtitleWord = SubtitleWordPayload & {
  sequenceStart: number;
  sequenceEnd: number;
};

export type GroupedAssDialogue = {
  sequenceStart: number;
  sequenceEnd: number;
  text: string;
};

const MAX_WORDS_ON_SCREEN = 2;

function applySubtitleTimingToWord(
  word: SubtitleWordPayload,
  timing: SubtitleTimingPayload,
): SubtitleWordPayload {
  const offsetSec = timing.syncOffsetMs / 1000;
  const leadSec = timing.anticipationMs / 1000;
  const start = Math.max(0, word.start - leadSec + offsetSec);
  const end = Math.max(start + 0.05, word.end + offsetSec);
  return { ...word, start, end };
}

function isWordInsideKeepSegments(
  word: SubtitleWordPayload,
  keepSegments: TimeSegment[],
): boolean {
  return keepSegments.some(
    (segment) => word.end > segment.start && word.start < segment.end,
  );
}

function buildPackedOffsets(segments: TimeSegment[]): {
  segment: TimeSegment;
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
  segments: TimeSegment[],
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

export function remapFullTimelineSubtitleWords(
  words: SubtitleWordPayload[],
  timing?: SubtitleTimingPayload,
): SequenceSubtitleWord[] {
  const timedWords = timing
    ? words.map((word) => applySubtitleTimingToWord(word, timing))
    : words;

  return timedWords
    .map((word) => ({
      ...word,
      sequenceStart: word.start,
      sequenceEnd: word.end,
    }))
    .filter((word) => word.sequenceEnd > word.sequenceStart)
    .sort((a, b) => a.sequenceStart - b.sequenceStart);
}

export function remapSubtitleWordsToSequence(
  words: SubtitleWordPayload[],
  keepSegments: TimeSegment[],
  timing?: SubtitleTimingPayload,
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

function getVisibleWordsAtSequenceTime(
  words: SequenceSubtitleWord[],
  sequenceTime: number,
  maxWords: number = MAX_WORDS_ON_SCREEN,
): SequenceSubtitleWord[] {
  if (words.length === 0) return [];

  const activeIndex = words.findIndex(
    (word) =>
      sequenceTime >= word.sequenceStart && sequenceTime < word.sequenceEnd,
  );

  if (activeIndex >= 0) {
    const start = Math.max(0, activeIndex - maxWords + 1);
    return words.slice(start, activeIndex + 1);
  }

  const nextIndex = words.findIndex((word) => word.sequenceStart > sequenceTime);
  if (nextIndex === -1) {
    return words.slice(-maxWords);
  }

  if (nextIndex === 0) return words.slice(0, 1);

  const gap = words[nextIndex].sequenceStart - sequenceTime;
  if (gap < 0.35) {
    const start = Math.max(0, nextIndex - maxWords + 1);
    return words.slice(start, nextIndex + 1);
  }

  return [];
}

/** Regroupe les mots comme la preview (max 2 à l'écran). */
export function buildGroupedSubtitleDialogues(
  words: SequenceSubtitleWord[],
): GroupedAssDialogue[] {
  if (words.length === 0) return [];

  const dialogues: GroupedAssDialogue[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    const visible = getVisibleWordsAtSequenceTime(
      words,
      word.sequenceStart,
      MAX_WORDS_ON_SCREEN,
    );
    if (visible.length === 0) continue;

    const sequenceStart = visible[0].sequenceStart;
    const sequenceEnd = visible[visible.length - 1].sequenceEnd;
    const text = visible.map((entry) => entry.text.toUpperCase()).join(" ");
    const key = `${sequenceStart.toFixed(3)}-${sequenceEnd.toFixed(3)}-${text}`;

    if (seen.has(key)) continue;
    seen.add(key);

    dialogues.push({ sequenceStart, sequenceEnd, text });
  }

  return dialogues;
}

const EXPORT_CANVAS_WIDTH = 1080;
const SUBTITLE_PREVIEW_REF_WIDTH = 360;

function getSubtitleExportFontSizePx(
  layoutScale: number,
  previewContainerWidth: number,
): number {
  const minPx = 1.25 * 16;
  const maxPx = 2.25 * 16;
  const fluidPx = previewContainerWidth * 0.055;
  const base = Math.min(maxPx, Math.max(minPx, fluidPx));
  const previewFont = base * layoutScale;
  return Math.round(previewFont * (EXPORT_CANVAS_WIDTH / previewContainerWidth));
}

function getExportResolutionScale(previewContainerWidth: number): number {
  return EXPORT_CANVAS_WIDTH / previewContainerWidth;
}

type PreviewMatchedDialogue = {
  sequenceStart: number;
  sequenceEnd: number;
  text: string;
  x: number;
  y: number;
  animate: boolean;
  inactive: boolean;
};

function estimateSubtitleWordWidthPx(text: string, fontSize: number): number {
  const upper = text.toUpperCase();
  // Largeur approx. uppercase bold + padding horizontal (px-1) comme la preview.
  return upper.length * fontSize * 0.52 + fontSize * 0.35;
}

function layoutSubtitleWordsHorizontally(
  visible: SequenceSubtitleWord[],
  centerX: number,
  fontSize: number,
): Map<string, number> {
  const gapPx = Math.round(fontSize * 0.22);
  const widths = visible.map((word) =>
    estimateSubtitleWordWidthPx(word.text, fontSize),
  );
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) +
    gapPx * Math.max(0, visible.length - 1);

  let cursor = centerX - totalWidth / 2;
  const positions = new Map<string, number>();

  visible.forEach((word, index) => {
    const width = widths[index];
    positions.set(word.id, Math.round(cursor + width / 2));
    cursor += width + (index < visible.length - 1 ? gapPx : 0);
  });

  return positions;
}

/** Intervalles alignés preview : groupes visibles (max 2), un dialogue par mot centré. */
function buildPreviewMatchedDialogues(
  words: SequenceSubtitleWord[],
  centerX: number,
  centerY: number,
  fontSize: number,
): PreviewMatchedDialogue[] {
  if (words.length === 0) return [];

  const dialogues: PreviewMatchedDialogue[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const triggerWord = words[index];
    const visible = getVisibleWordsAtSequenceTime(
      words,
      triggerWord.sequenceStart + 0.001,
    );
    if (visible.length === 0) continue;

    const sequenceStart = triggerWord.sequenceStart;
    const visibleEnd = visible[visible.length - 1].sequenceEnd;
    const nextStart =
      index + 1 < words.length ? words[index + 1].sequenceStart : visibleEnd;
    const sequenceEnd = Math.min(nextStart, visibleEnd);

    if (sequenceEnd - sequenceStart < 0.02) continue;

    const activeWord = visible[visible.length - 1];
    const positions = layoutSubtitleWordsHorizontally(visible, centerX, fontSize);

    for (const word of visible) {
      const x = positions.get(word.id);
      if (x === undefined) continue;

      dialogues.push({
        sequenceStart,
        sequenceEnd,
        text: word.text.toUpperCase(),
        x,
        y: centerY,
        animate: word.id === activeWord.id && triggerWord.id === activeWord.id,
        inactive: word.id !== activeWord.id,
      });
    }
  }

  return dialogues;
}

function formatAssTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const centis = Math.floor((safe % 1) * 100);
  return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${centis.toString().padStart(2, "0")}`;
}

function assColorFromHex(hex: string): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "&H00FFFFFF&";
  const r = normalized.slice(0, 2);
  const g = normalized.slice(2, 4);
  const b = normalized.slice(4, 6);
  return `&H00${b}${g}${r}&`;
}

function assAlphaFromIntensity(intensity: number): string {
  const clamped = Math.max(0, Math.min(100, intensity));
  const transparent = Math.round((1 - clamped / 100) * 255);
  return transparent.toString(16).toUpperCase().padStart(2, "0");
}

function buildAssAnimationTags(
  animation: SubtitleStylePayload["animation"] | undefined,
  x: number,
  y: number,
): string {
  switch (animation) {
    case "pop":
      return `\\fscx75\\fscy75\\1a&HFF&\\t(0,132,\\fscx112\\fscy112\\1a&H00&)\\t(132,220,\\fscx100\\fscy100)`;
    case "bounce":
      return `\\1a&HFF&\\pos(${x},${y + 12})\\t(0,154,\\pos(${x},${y - 4})\\1a&H00&)\\t(154,280,\\pos(${x},${y}))`;
    case "fade":
      return "\\fad(200,0)";
    case "scale":
      return "\\fscx50\\fscy50\\1a&HFF&\\t(0,240,\\fscx100\\fscy100\\1a&H00&)";
    default:
      return "";
  }
}

function buildAssInactiveOpacityTag(): string {
  return "\\1a&H19&";
}

type AssTagStyle = {
  fontFamily: string;
  fontSize: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  layoutX: number;
  layoutY: number;
  animation?: SubtitleStylePayload["animation"];
  glowColor?: string;
  glowIntensity?: number;
  glowSpread?: number;
  letterSpacing?: number;
};

function resolveAssFontName(fontId?: string, fallback = "Arial Black"): string {
  if (!fontId) return fallback;
  return getAssFontName(fontId);
}

function buildAssPositionTagsAt(
  x: number,
  y: number,
  style: AssTagStyle,
): string {
  const spacing =
    style.letterSpacing && style.letterSpacing > 0
      ? `\\fsp${Math.round(style.letterSpacing)}`
      : "";
  return `\\an5\\pos(${x},${y})\\fs${Math.round(style.fontSize)}\\fn${style.fontFamily}${spacing}`;
}

function wrapAssTags(innerTags: string): string {
  return `{${innerTags}}`;
}

function buildAssMainTagsAt(
  x: number,
  y: number,
  style: AssTagStyle,
  options: { animate: boolean; inactive: boolean },
): string {
  const fill = assColorFromHex(style.fillColor);
  const outline = assColorFromHex(style.strokeColor);
  const animation =
    options.animate && !options.inactive
      ? buildAssAnimationTags(style.animation, x, y)
      : "";
  const opacity = options.inactive ? buildAssInactiveOpacityTag() : "";
  const shadow = "\\shad2\\4c&H000000&\\4a&HB0&";
  return wrapAssTags(
    `${buildAssPositionTagsAt(x, y, style)}\\1c${fill}\\3c${outline}\\bord${style.strokeWidth}${opacity}${shadow}${animation}`,
  );
}

function buildAssOuterGlowTagsAt(
  x: number,
  y: number,
  style: AssTagStyle,
): string {
  const intensity = style.glowIntensity ?? 0;
  const spread = style.glowSpread ?? 0;
  if (intensity <= 0 || spread <= 0 || !style.glowColor) return "";

  const glowColor = assColorFromHex(style.glowColor);
  const blur = Math.max(1, Math.round(spread * 0.35));
  const outerBorder = style.strokeWidth + Math.max(1, Math.round(spread));
  const outlineAlpha = assAlphaFromIntensity(intensity);

  return wrapAssTags(
    `${buildAssPositionTagsAt(x, y, style)}\\1a&HFF&\\3c${glowColor}\\3a&H${outlineAlpha}&\\blur${blur}\\bord${outerBorder}`,
  );
}

function buildAssDialogueLinesAt(
  sequenceStart: number,
  sequenceEnd: number,
  text: string,
  x: number,
  y: number,
  style: AssTagStyle,
  options: { animate: boolean; inactive: boolean },
  assStyleName = "WordPop",
): string[] {
  const safeText = text.toUpperCase().replace(/\n/g, " ");
  const glowTags = buildAssOuterGlowTagsAt(x, y, style);
  const mainTags = buildAssMainTagsAt(x, y, style, options);
  const lines = [
    `Dialogue: 0,${formatAssTime(sequenceStart)},${formatAssTime(sequenceEnd)},${assStyleName},,0,0,0,,${mainTags}${safeText}`,
  ];

  if (glowTags) {
    lines.unshift(
      `Dialogue: 0,${formatAssTime(sequenceStart)},${formatAssTime(sequenceEnd)},${assStyleName},,0,0,0,,${glowTags}${safeText}`,
    );
  }

  return lines;
}

export function generateAssContent(
  words: SequenceSubtitleWord[],
  style: SubtitleStylePayload,
  textOverlays: TextOverlayExportPayload[] = [],
  previewContainerWidth: number = style.previewContainerWidth ??
    SUBTITLE_PREVIEW_REF_WIDTH,
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
Style: WordPop,${style.fontFamily},${style.fontSize},${primary},${primary},${outline},&H00000000,-1,0,0,0,100,100,0,0,1,0,0,${alignment},40,40,${marginV},1
Style: TextOverlay,${style.fontFamily},${Math.round(style.fontSize * 0.85)},${primary},${primary},${outline},&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,40,40,960,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const resolutionScale = getExportResolutionScale(previewContainerWidth);

  const subtitleStyle: AssTagStyle = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fillColor: style.fillColor,
    strokeColor: style.strokeColor,
    strokeWidth: Math.max(1, Math.round(style.strokeWidth * resolutionScale)),
    layoutX: style.layoutX ?? 0.5,
    layoutY: style.layoutY ?? 0.78,
    animation: style.animation,
    glowColor: style.glowColor,
    glowIntensity: style.glowIntensity,
    glowSpread: style.glowSpread
      ? Math.max(0, Math.round(style.glowSpread * resolutionScale))
      : undefined,
  };

  const centerX = Math.round(subtitleStyle.layoutX * 1080);
  const centerY = Math.round(subtitleStyle.layoutY * 1920);

  const subtitleDialogues = buildPreviewMatchedDialogues(
    words,
    centerX,
    centerY,
    subtitleStyle.fontSize,
  )
    .flatMap((dialogue) =>
      buildAssDialogueLinesAt(
        dialogue.sequenceStart,
        dialogue.sequenceEnd,
        dialogue.text,
        dialogue.x,
        dialogue.y,
        subtitleStyle,
        { animate: dialogue.animate, inactive: dialogue.inactive },
        "WordPop",
      ),
    )
    .join("\n");

  const overlayDialogues = textOverlays
    .flatMap((overlay) => {
      const overlayStyle: AssTagStyle = {
        fontFamily: resolveAssFontName(overlay.style.fontId, style.fontFamily),
        fontSize: getSubtitleExportFontSizePx(
          overlay.layout.scale,
          previewContainerWidth,
        ),
        fillColor: overlay.style.fillColor,
        strokeColor: overlay.style.strokeColor,
        strokeWidth: Math.max(
          1,
          Math.round(overlay.style.strokeWidth * resolutionScale),
        ),
        layoutX: overlay.layout.x,
        layoutY: overlay.layout.y,
        animation: overlay.style.animation ?? "pop",
        glowColor: overlay.style.glowColor,
        glowIntensity: overlay.style.glowIntensity,
        glowSpread: overlay.style.glowSpread
          ? Math.max(0, Math.round(overlay.style.glowSpread * resolutionScale))
          : undefined,
        letterSpacing: overlay.style.letterSpacing,
      };

      const x = Math.round(overlay.layout.x * 1080);
      const y = Math.round(overlay.layout.y * 1920);

      return buildAssDialogueLinesAt(
        overlay.sequenceStart,
        overlay.sequenceEnd,
        overlay.text,
        x,
        y,
        overlayStyle,
        { animate: true, inactive: false },
        "TextOverlay",
      );
    })
    .join("\n");

  const dialogues = [subtitleDialogues, overlayDialogues].filter(Boolean).join("\n");

  return `${header}${dialogues}\n`;
}
