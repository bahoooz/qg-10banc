import type { SubtitleFontId } from "./fonts/types.js";
import {
  DEFAULT_SUBTITLE_FONT_ID,
  getActiveSubtitleFonts,
  getSubtitleFontOption,
} from "./fonts/index.js";

export const EXPORT_CANVAS_WIDTH = 1080;
export const EXPORT_CANVAS_HEIGHT = 1920;
export const SUBTITLE_PREVIEW_REF_WIDTH = 360;
export const MAX_WORDS_ON_SCREEN = 2;
/** Même contrainte que la preview (`max-w-[92%]`). */
export const SUBTITLE_CONTAINER_MAX_WIDTH_RATIO = 0.92;
/** Canvas mesure légèrement plus large que CSS à taille égale. */
export const EXPORT_FONT_METRICS_ADJUST = 0.94;

export const SUBTITLE_REM_PX = 16;
export const SUBTITLE_MIN_REM = 1.25;
export const SUBTITLE_MAX_REM = 2.25;
export const SUBTITLE_FLUID_RATIO = 0.055;

export const SUBTITLE_SCALE_RANGE = { min: 0.4, max: 2.5 };

export { DEFAULT_SUBTITLE_FONT_ID };

export const SUBTITLE_ANIMATION_DURATIONS_SEC: Record<
  "pop" | "bounce" | "fade" | "scale",
  number
> = {
  pop: 0.22,
  bounce: 0.28,
  fade: 0.2,
  scale: 0.24,
};

/** Polices actives (builtin + custom si registre initialisé). */
export const SUBTITLE_FONT_OPTIONS = getActiveSubtitleFonts();

export { getSubtitleFontOption };

export type { SubtitleFontId };
