import {
  EXPORT_CANVAS_HEIGHT,
  EXPORT_CANVAS_WIDTH,
} from "./constants.js";
import type {
  CompositionFrameState,
  ResolvedSubtitleRenderStyle,
  ResolvedTextOverlayRenderStyle,
  SequenceSubtitleWord,
  SubtitleFrameDrawState,
  SubtitleWordDrawCommand,
  TextOverlayDrawCommand,
  TextWidthMeasurer,
} from "./types.js";
import {
  layoutSubtitleWordsWithFit,
  resolveTextOverlayRenderStyle,
} from "./layout.js";
import { getVisibleWordsAtSequenceTime } from "./visibility.js";

export type TextOverlaySequenceItem = {
  sequenceStart: number;
  sequenceEnd: number;
  text: string;
  layout: { x: number; y: number; scale: number };
  style: ResolvedTextOverlayRenderStyle;
  animation?: "pop" | "bounce" | "fade" | "scale";
};

const ACTIVATION_SEARCH_STEP_SEC = 1 / 120;

/** Moment où un mot devient le mot actif (dernier visible) — comme le mount CSS. */
export function computeWordActivationTimes(
  words: SequenceSubtitleWord[],
): Map<string, number> {
  const activations = new Map<string, number>();

  for (const word of words) {
    let activation = word.sequenceStart;
    const searchStart = Math.max(0, word.sequenceStart - 0.35);

    for (
      let time = searchStart;
      time < word.sequenceEnd;
      time += ACTIVATION_SEARCH_STEP_SEC
    ) {
      const visible = getVisibleWordsAtSequenceTime(words, time);
      if (visible.length === 0) continue;
      if (visible[visible.length - 1]?.id !== word.id) continue;
      activation = time;
      break;
    }

    activations.set(word.id, activation);
  }

  return activations;
}

export function getSubtitleFrameDrawState(
  words: SequenceSubtitleWord[],
  style: ResolvedSubtitleRenderStyle,
  sequenceTime: number,
  measure?: TextWidthMeasurer,
  activationTimes?: Map<string, number>,
): SubtitleFrameDrawState | null {
  if (words.length === 0) return null;

  const activations = activationTimes ?? computeWordActivationTimes(words);

  // Même logique que ClipSubtitleOverlay en preview — pas de groupes artificiels.
  const visible = getVisibleWordsAtSequenceTime(words, sequenceTime);
  if (visible.length === 0) return null;

  const activeWord = visible[visible.length - 1];
  const { fontSize, positions } = layoutSubtitleWordsWithFit({
    visible,
    centerX: style.centerX,
    fontSize: style.fontSize,
    strokeWidth: style.strokeWidth,
    glowSpread: style.glowSpread,
    measure,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
  });

  const drawWords: SubtitleWordDrawCommand[] = visible.flatMap((word) => {
    const x = positions.get(word.id);
    if (x === undefined) return [];

    const isActive = word.id === activeWord.id;
    const activationTime =
      activations.get(word.id) ?? word.sequenceStart;
    const shouldAnimate = isActive && sequenceTime >= activationTime - 0.001;

    return [
      {
        id: word.id,
        text: word.text.toUpperCase(),
        x,
        y: style.centerY,
        isActive,
        shouldAnimate,
        animation: style.animation,
        animationElapsedSec: shouldAnimate
          ? Math.max(0, sequenceTime - activationTime)
          : 0,
        opacity: isActive ? 1 : 0.9,
      },
    ];
  });

  if (drawWords.length === 0) return null;

  return {
    words: drawWords,
    style: { ...style, fontSize },
  };
}

export function getTextOverlayDrawCommands(
  overlays: TextOverlaySequenceItem[],
  sequenceTime: number,
): TextOverlayDrawCommand[] {
  return overlays
    .filter(
      (overlay) =>
        sequenceTime >= overlay.sequenceStart &&
        sequenceTime < overlay.sequenceEnd,
    )
    .map((overlay) => ({
      text: overlay.text.toUpperCase(),
      x: Math.round(overlay.layout.x * EXPORT_CANVAS_WIDTH),
      y: Math.round(overlay.layout.y * EXPORT_CANVAS_HEIGHT),
      style: overlay.style,
      animation: overlay.animation ?? "pop",
      animationElapsedSec: Math.max(0, sequenceTime - overlay.sequenceStart),
    }));
}

export function buildCompositionFrameState(input: {
  sequenceWords: SequenceSubtitleWord[];
  subtitleStyle: ResolvedSubtitleRenderStyle | null;
  textOverlays: TextOverlaySequenceItem[];
  sequenceTime: number;
  measure?: TextWidthMeasurer;
  activationTimes?: Map<string, number>;
}): CompositionFrameState {
  const activationTimes =
    input.activationTimes ??
    (input.sequenceWords.length > 0
      ? computeWordActivationTimes(input.sequenceWords)
      : undefined);

  const subtitles =
    input.subtitleStyle && input.sequenceWords.length > 0
      ? getSubtitleFrameDrawState(
          input.sequenceWords,
          input.subtitleStyle,
          input.sequenceTime,
          input.measure,
          activationTimes,
        )
      : null;

  return {
    subtitles,
    textOverlays: getTextOverlayDrawCommands(
      input.textOverlays,
      input.sequenceTime,
    ),
  };
}

export function buildTextOverlaySequenceItems(
  overlays: Array<{
    sequenceStart: number;
    sequenceEnd: number;
    text: string;
    layout: { x: number; y: number; scale: number };
    style: {
      fontId?: string;
      fillColor: string;
      strokeColor: string;
      strokeWidth: number;
      glowColor?: string;
      glowIntensity?: number;
      glowSpread?: number;
      letterSpacing?: number;
      animation?: "pop" | "bounce" | "fade" | "scale";
    };
  }>,
  previewContainerWidth: number,
): TextOverlaySequenceItem[] {
  return overlays.map((overlay) => ({
      sequenceStart: overlay.sequenceStart,
      sequenceEnd: overlay.sequenceEnd,
      text: overlay.text,
      layout: overlay.layout,
      style: resolveTextOverlayRenderStyle(
        overlay.style,
        overlay.layout.scale,
        previewContainerWidth,
      ),
      animation: overlay.style.animation ?? "pop",
    }));
}
