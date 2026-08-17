import { SUBTITLE_ANIMATION_DURATIONS_SEC } from "./constants.js";
import type { SubtitleAnimation } from "./types.js";

export type AnimationTransform = {
  scale: number;
  translateX: number;
  translateY: number;
  opacity: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Interpolation calquée sur les @keyframes CSS de la preview. */
export function getSubtitleAnimationTransform(
  animation: SubtitleAnimation,
  elapsedSec: number,
): AnimationTransform {
  const duration =
    SUBTITLE_ANIMATION_DURATIONS_SEC[animation] ??
    SUBTITLE_ANIMATION_DURATIONS_SEC.pop;
  const progress = clamp01(elapsedSec / duration);

  switch (animation) {
    case "pop": {
      if (progress <= 0.6) {
        const local = progress / 0.6;
        return {
          scale: lerp(0.75, 1.12, local),
          translateX: 0,
          translateY: 0,
          opacity: lerp(0, 1, local),
        };
      }
      const local = (progress - 0.6) / 0.4;
      return {
        scale: lerp(1.12, 1, local),
        translateX: 0,
        translateY: 0,
        opacity: 1,
      };
    }
    case "bounce": {
      if (progress <= 0.55) {
        const local = progress / 0.55;
        return {
          scale: 1,
          translateX: 0,
          translateY: lerp(12, -4, local),
          opacity: lerp(0, 1, local),
        };
      }
      const local = (progress - 0.55) / 0.45;
      return {
        scale: 1,
        translateX: 0,
        translateY: lerp(-4, 0, local),
        opacity: 1,
      };
    }
    case "fade":
      return {
        scale: 1,
        translateX: 0,
        translateY: 0,
        opacity: progress,
      };
    case "scale":
      return {
        scale: lerp(0.5, 1, progress),
        translateX: 0,
        translateY: 0,
        opacity: progress,
      };
    default:
      return { scale: 1, translateX: 0, translateY: 0, opacity: 1 };
  }
}

export function isSubtitleAnimationFinished(
  animation: SubtitleAnimation,
  elapsedSec: number,
): boolean {
  const duration =
    SUBTITLE_ANIMATION_DURATIONS_SEC[animation] ??
    SUBTITLE_ANIMATION_DURATIONS_SEC.pop;
  return elapsedSec >= duration;
}
