import {
  sequenceTimeToSourceTime,
  sourceTimeToSequenceTime,
  type TimeRange,
} from "./clipTime";
import {
  getActiveTimelineVideoAtSequence,
  getTotalTimelineDuration,
  type TimelineVideoClip,
} from "./clipTimelineVideos";
import { getActualBaseEndSequence } from "./clipTimelineInserts";

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
  const sequenceTime =
    input.timelineVideos.length > 0
      ? input.sequencePlayhead
      : sourceTimeToSequenceTime(input.currentTime, input.keepSegments);
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

  return {
    mode: "source",
    sequenceTime,
    sourceTime: sequenceTimeToSourceTime(sequenceTime, input.keepSegments),
    timelineDuration,
  };
}
