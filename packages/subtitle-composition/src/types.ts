export type TimeRange = {
  start: number;
  end: number;
  speed?: number;
};

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

import type { SubtitleFontId } from "./fonts/types.js";

export type { SubtitleFontId } from "./fonts/types.js";

export type SubtitleTiming = {
  syncOffsetMs: number;
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

export type SubtitleLayout = {
  x: number;
  y: number;
  scale: number;
};

export type { SubtitleFontDefinition as SubtitleFontOption } from "./fonts/types.js";

export type TextWidthMeasurer = (
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
) => number;

export type SubtitleWordDrawCommand = {
  id: string;
  text: string;
  x: number;
  y: number;
  isActive: boolean;
  shouldAnimate: boolean;
  animation: SubtitleAnimation;
  animationElapsedSec: number;
  opacity: number;
};

export type SubtitleFrameDrawState = {
  words: SubtitleWordDrawCommand[];
  style: ResolvedSubtitleRenderStyle;
};

export type ResolvedSubtitleRenderStyle = {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  glowColor: string;
  glowIntensity: number;
  glowSpread: number;
  animation: SubtitleAnimation;
  centerX: number;
  centerY: number;
};

export type TextOverlayDrawCommand = {
  text: string;
  x: number;
  y: number;
  style: ResolvedTextOverlayRenderStyle;
  animation: SubtitleAnimation;
  animationElapsedSec: number;
};

export type ResolvedTextOverlayRenderStyle = {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  glowColor: string;
  glowIntensity: number;
  glowSpread: number;
  letterSpacing: number;
};

export type CompositionFrameState = {
  subtitles: SubtitleFrameDrawState | null;
  textOverlays: TextOverlayDrawCommand[];
};
