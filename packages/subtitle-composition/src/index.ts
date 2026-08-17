export * from "./types.js";
export * from "./constants.js";
export * from "./fonts/index.js";
export * from "./segmentSpeed.js";
export * from "./timing.js";
export * from "./remap.js";
export * from "./visibility.js";
export * from "./layout.js";
export * from "./frameState.js";

export {
  EXPORT_CANVAS_WIDTH,
  EXPORT_CANVAS_HEIGHT,
  SUBTITLE_PREVIEW_REF_WIDTH,
  MAX_WORDS_ON_SCREEN,
  SUBTITLE_CONTAINER_MAX_WIDTH_RATIO,
  EXPORT_FONT_METRICS_ADJUST,
  SUBTITLE_FONT_OPTIONS,
  DEFAULT_SUBTITLE_FONT_ID,
  SUBTITLE_ANIMATION_DURATIONS_SEC,
  getSubtitleFontOption,
} from "./constants.js";

export {
  clampSubtitleScale,
  normalizeSubtitleLayout,
  getSubtitleBaseFontSizePx,
  getSubtitlePreviewFontSizePx,
  getSubtitleExportFontSizePx,
  getExportVisualScale,
  getExportStrokeWidth,
  getExportGlowSpread,
  resolveSubtitleRenderStyleFromEditor,
  resolveSubtitleRenderStyleFromExportPayload,
  layoutSubtitleWordsWithFit,
  getSubtitleContainerMaxWidthPx,
} from "./layout.js";

export {
  applySubtitleTimingToWord,
  applySubtitleTimingToWords,
} from "./timing.js";

export {
  remapSubtitleWordsToSequence,
  remapTimedSubtitleWordsToSequence,
  mapSourceTimeToSequenceTime,
} from "./remap.js";

export { getVisibleWordsAtSequenceTime } from "./visibility.js";

export {
  buildCompositionFrameState,
  buildTextOverlaySequenceItems,
  computeWordActivationTimes,
  getSubtitleFrameDrawState,
  getTextOverlayDrawCommands,
} from "./frameState.js";

export {
  getSubtitleAnimationTransform,
  isSubtitleAnimationFinished,
} from "./animations.js";

export type { TextOverlaySequenceItem } from "./frameState.js";
export type { AnimationTransform } from "./animations.js";
