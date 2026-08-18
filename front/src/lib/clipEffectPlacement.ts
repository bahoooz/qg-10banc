import { sequenceTimeToSourceTime, type TimeRange } from "./clipTime";
import {
  getActiveTimelineVideoAtSequence,
  getTotalTimelineDuration,
  type TimelineVideoClip,
} from "./clipTimelineVideos";
import {
  getActualBaseEndSequence,
  sequenceTimeToSourceTimeWithInserts,
  storedTimeToActualSequence,
} from "./clipTimelineInserts";
import type { ImageOverlay } from "./clipImageOverlays";
import { imageOverlayUsesSequenceTime } from "./clipImageOverlays";
import type { TextOverlay } from "./clipTextOverlays";
import type { SoundboardClip } from "./clipSoundboards";
import type { ZoomEffect } from "./clipZoomEffects";

export type EffectPlacementContext =
  | {
      mode: "source";
      sequenceTime: number;
      sourceTime: number;
      timelineDuration: number;
    }
  | {
      mode: "sequence";
      sequenceTime: number;
      timelineDuration: number;
    };

export function resolveEffectPlacementContext(input: {
  sequencePlayhead: number;
  currentTime: number;
  keepSegments: TimeRange[];
  timelineVideos: TimelineVideoClip[];
}): EffectPlacementContext {
  const sequenceTime = input.sequencePlayhead;
  const timelineDuration = getTotalTimelineDuration(
    input.keepSegments,
    input.timelineVideos,
  );
  const actualBaseEnd = getActualBaseEndSequence(
    input.keepSegments,
    input.timelineVideos,
  );
  const onTimelineVideo = Boolean(
    getActiveTimelineVideoAtSequence(sequenceTime, input.timelineVideos),
  );
  const onExtendedTimeline =
    input.timelineVideos.length > 0 &&
    (sequenceTime > actualBaseEnd + 0.01 || onTimelineVideo);

  if (onExtendedTimeline) {
    return {
      mode: "sequence",
      sequenceTime,
      timelineDuration,
    };
  }

  const sourceTime =
    sequenceTimeToSourceTimeWithInserts(
      sequenceTime,
      input.keepSegments,
      input.timelineVideos,
    ) ??
    sequenceTimeToSourceTime(sequenceTime, input.keepSegments);

  return {
    mode: "source",
    sequenceTime,
    sourceTime,
    timelineDuration,
  };
}

export function normalizeZoomEffectsForTimeline(
  effects: ZoomEffect[],
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): ZoomEffect[] {
  return effects.map((effect) => {
    if (effect.usesSequenceTime) return effect;
    return {
      ...effect,
      start: storedTimeToActualSequence(
        effect.start,
        false,
        keepSegments,
        timelineVideos,
      ),
      end: storedTimeToActualSequence(
        effect.end,
        false,
        keepSegments,
        timelineVideos,
      ),
      usesSequenceTime: true,
    };
  });
}

export function normalizeTextOverlaysForTimeline(
  overlays: TextOverlay[],
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): TextOverlay[] {
  return overlays.map((overlay) => {
    if (overlay.usesSequenceTime) return overlay;
    return {
      ...overlay,
      start: storedTimeToActualSequence(
        overlay.start,
        false,
        keepSegments,
        timelineVideos,
      ),
      end: storedTimeToActualSequence(
        overlay.end,
        false,
        keepSegments,
        timelineVideos,
      ),
      usesSequenceTime: true,
    };
  });
}

export function normalizeImageOverlaysForTimeline(
  overlays: ImageOverlay[],
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): ImageOverlay[] {
  return overlays.map((overlay) => {
    if (imageOverlayUsesSequenceTime(overlay)) return overlay;
    return {
      ...overlay,
      start: storedTimeToActualSequence(
        overlay.start,
        false,
        keepSegments,
        timelineVideos,
      ),
      end: storedTimeToActualSequence(
        overlay.end,
        false,
        keepSegments,
        timelineVideos,
      ),
      usesSequenceTime: true,
    };
  });
}

export function normalizeSoundboardsForTimeline(
  clips: SoundboardClip[],
  keepSegments: TimeRange[],
  timelineVideos: TimelineVideoClip[],
): SoundboardClip[] {
  return clips.map((clip) => {
    if (clip.usesSequenceTime) return clip;
    return {
      ...clip,
      start: storedTimeToActualSequence(
        clip.start,
        false,
        keepSegments,
        timelineVideos,
      ),
      end: storedTimeToActualSequence(
        clip.end,
        false,
        keepSegments,
        timelineVideos,
      ),
      usesSequenceTime: true,
    };
  });
}
