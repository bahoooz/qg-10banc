import {
  DEFAULT_SUBTITLE_LAYOUT,
  DEFAULT_SUBTITLE_STYLE,
  normalizeSubtitleLayout,
  type SubtitleLayout,
  type SubtitleStyle,
} from "./clipSubtitles";
import {
  getEditedDuration,
  sequenceTimeToSourceTime,
  sourceTimeToSequenceTime,
  type TimeRange,
} from "./clipTime";

export type TextOverlayStyle = Pick<
  SubtitleStyle,
  | "fontId"
  | "fillColor"
  | "strokeColor"
  | "strokeWidth"
  | "glowColor"
  | "glowIntensity"
  | "glowSpread"
> & {
  /** Interlettrage en pixels. */
  letterSpacing: number;
};

export type TextOverlay = {
  id: string;
  start: number;
  end: number;
  text: string;
  label: string;
  style: TextOverlayStyle;
  layout: SubtitleLayout;
  /** Timestamps exprimés en temps séquence (timeline étendue). */
  usesSequenceTime?: boolean;
};

export type PackedTextOverlay = TextOverlay & {
  sequenceStart: number;
  sequenceEnd: number;
};

export const DEFAULT_TEXT_OVERLAY_DURATION = 2;
export const MIN_TEXT_OVERLAY_DURATION = 0.35;
export const DEFAULT_TEXT_OVERLAY_TEXT = "Texte";
export const TEXT_OVERLAY_LETTER_SPACING_RANGE = {
  min: 0,
  max: 24,
  step: 1,
} as const;
export const DEFAULT_TEXT_OVERLAY_LETTER_SPACING = 2;

export function clampTextOverlayLetterSpacing(value: number): number {
  return Math.max(
    TEXT_OVERLAY_LETTER_SPACING_RANGE.min,
    Math.min(TEXT_OVERLAY_LETTER_SPACING_RANGE.max, value),
  );
}

export function createDefaultTextOverlayStyle(): TextOverlayStyle {
  const {
    fontId,
    fillColor,
    strokeColor,
    strokeWidth,
    glowColor,
    glowIntensity,
    glowSpread,
  } = DEFAULT_SUBTITLE_STYLE;

  return {
    fontId,
    fillColor,
    strokeColor,
    strokeWidth,
    glowColor,
    glowIntensity,
    glowSpread,
    letterSpacing: DEFAULT_TEXT_OVERLAY_LETTER_SPACING,
  };
}

export function toSubtitleStyleForRender(style: TextOverlayStyle): SubtitleStyle {
  const {
    letterSpacing: _letterSpacing,
    ...subtitleStyle
  } = style;
  return { ...subtitleStyle, animation: "pop" };
}

export function createTextOverlayLabel(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Texte";
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed;
}

export function createTextOverlayId(start: number): string {
  return `txt-${start.toFixed(3)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneTextOverlays(overlays: TextOverlay[]): TextOverlay[] {
  return overlays.map((overlay) => ({
    ...overlay,
    style: { ...overlay.style },
    layout: { ...overlay.layout },
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

export function findTextOverlayAtTime(
  overlays: TextOverlay[],
  time: number,
): TextOverlay | undefined {
  return overlays.find(
    (overlay) =>
      !overlay.usesSequenceTime &&
      time >= overlay.start &&
      time < overlay.end,
  );
}

export function findTextOverlayAtSequenceTime(
  overlays: TextOverlay[],
  sequenceTime: number,
): TextOverlay | undefined {
  return overlays.find(
    (overlay) =>
      overlay.usesSequenceTime &&
      sequenceTime >= overlay.start &&
      sequenceTime < overlay.end,
  );
}

export function findTextOverlayForPlayhead(
  overlays: TextOverlay[],
  sequenceTime: number,
  sourceTime: number,
): TextOverlay | undefined {
  return overlays.find((overlay) => {
    if (overlay.usesSequenceTime) {
      return sequenceTime >= overlay.start && sequenceTime < overlay.end;
    }
    return sourceTime >= overlay.start && sourceTime < overlay.end;
  });
}

export function getTextOverlaysAtTime(
  overlays: TextOverlay[],
  time: number,
): TextOverlay[] {
  return overlays.filter(
    (overlay) =>
      !overlay.usesSequenceTime &&
      time >= overlay.start &&
      time < overlay.end,
  );
}

export function getTextOverlaysForPlayhead(
  overlays: TextOverlay[],
  sequenceTime: number,
  sourceTime: number,
): TextOverlay[] {
  return overlays.filter((overlay) => {
    if (overlay.usesSequenceTime) {
      return sequenceTime >= overlay.start && sequenceTime < overlay.end;
    }
    return sourceTime >= overlay.start && sourceTime < overlay.end;
  });
}

export function mapTextOverlaysToSequence(
  overlays: TextOverlay[],
  keepSegments: TimeRange[],
): PackedTextOverlay[] {
  if (keepSegments.length === 0) return [];

  return overlays
    .filter((overlay) =>
      overlay.usesSequenceTime
        ? true
        : keepSegments.some(
            (segment) => overlay.end > segment.start && overlay.start < segment.end,
          ),
    )
    .map((overlay) => ({
      ...overlay,
      sequenceStart: overlay.usesSequenceTime
        ? overlay.start
        : sourceTimeToSequenceTime(overlay.start, keepSegments),
      sequenceEnd: overlay.usesSequenceTime
        ? overlay.end
        : sourceTimeToSequenceTime(overlay.end, keepSegments),
    }))
    .filter((overlay) => overlay.sequenceEnd > overlay.sequenceStart + 0.05)
    .sort((a, b) => a.sequenceStart - b.sequenceStart);
}

export function createTextOverlayAtTime(
  time: number,
  keepSegments: TimeRange[],
  text = DEFAULT_TEXT_OVERLAY_TEXT,
): TextOverlay | null {
  const segment = getKeepSegmentContainingTime(time, keepSegments);
  if (!segment) return null;

  const end = Math.min(time + DEFAULT_TEXT_OVERLAY_DURATION, segment.end);
  if (end - time < MIN_TEXT_OVERLAY_DURATION) return null;

  return {
    id: createTextOverlayId(time),
    start: time,
    end,
    text,
    label: createTextOverlayLabel(text),
    style: createDefaultTextOverlayStyle(),
    layout: normalizeSubtitleLayout(DEFAULT_SUBTITLE_LAYOUT),
  };
}

export function createTextOverlayAtSequenceTime(
  sequenceTime: number,
  timelineDuration: number,
  text = DEFAULT_TEXT_OVERLAY_TEXT,
): TextOverlay | null {
  const end = Math.min(sequenceTime + DEFAULT_TEXT_OVERLAY_DURATION, timelineDuration);
  if (end - sequenceTime < MIN_TEXT_OVERLAY_DURATION) return null;

  return {
    id: createTextOverlayId(sequenceTime),
    start: sequenceTime,
    end,
    text,
    label: createTextOverlayLabel(text),
    style: createDefaultTextOverlayStyle(),
    layout: normalizeSubtitleLayout(DEFAULT_SUBTITLE_LAYOUT),
    usesSequenceTime: true,
  };
}

export function updateTextOverlayBounds(
  overlay: TextOverlay,
  patch: Partial<Pick<TextOverlay, "start" | "end">>,
  keepSegments: TimeRange[],
  timelineDuration?: number,
): TextOverlay | null {
  const start = patch.start ?? overlay.start;
  const end = patch.end ?? overlay.end;
  if (end - start < MIN_TEXT_OVERLAY_DURATION) return null;

  if (overlay.usesSequenceTime) {
    const maxDuration = timelineDuration ?? getEditedDuration(keepSegments);
    if (start < 0 || end > maxDuration + 0.01) return null;
    return { ...overlay, start, end };
  }

  const overlaps = keepSegments.some(
    (segment) => end > segment.start && start < segment.end,
  );
  if (!overlaps) return null;

  return { ...overlay, start, end };
}

export function moveTextOverlayBySequenceOffset(
  overlay: TextOverlay,
  sequenceOffset: number,
  keepSegments: TimeRange[],
  initialSeqStart?: number,
  initialSeqEnd?: number,
  timelineDuration?: number,
): TextOverlay | null {
  if (keepSegments.length === 0) return null;

  const editedDuration = getEditedDuration(keepSegments);
  const maxDuration = timelineDuration ?? editedDuration;
  const seqStart =
    initialSeqStart ??
    (overlay.usesSequenceTime
      ? overlay.start
      : sourceTimeToSequenceTime(overlay.start, keepSegments));
  const seqEnd =
    initialSeqEnd ??
    (overlay.usesSequenceTime
      ? overlay.end
      : sourceTimeToSequenceTime(overlay.end, keepSegments));
  const seqDuration = seqEnd - seqStart;

  let newSeqStart = seqStart + sequenceOffset;
  if (newSeqStart < 0) newSeqStart = 0;
  const maxStart = overlay.usesSequenceTime ? maxDuration : editedDuration;
  if (newSeqStart + seqDuration > maxStart) {
    newSeqStart = Math.max(0, maxStart - seqDuration);
  }

  const newSeqEnd = newSeqStart + seqDuration;

  if (overlay.usesSequenceTime) {
    return updateTextOverlayBounds(
      overlay,
      { start: newSeqStart, end: newSeqEnd },
      keepSegments,
      maxDuration,
    );
  }

  const newStart = sequenceTimeToSourceTime(newSeqStart, keepSegments);
  const newEnd = sequenceTimeToSourceTime(newSeqEnd, keepSegments);

  return updateTextOverlayBounds(
    overlay,
    { start: newStart, end: newEnd },
    keepSegments,
  );
}
