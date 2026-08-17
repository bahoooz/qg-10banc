import {
  useEffect,
  useRef,
  type RefObject,
  type VideoHTMLAttributes,
} from "react";
import {
  getPlaybackRateForSpeed,
  getSpeedAtSourceTime,
  resolvePlaybackTime,
  snapTimeToKeepSegments,
  sourceTimeToSequenceTime,
  type TimeRange,
} from "../lib/clipTime";
import {
  getActiveTimelineVideoAtSequence,
  getTimelineContinuationSequenceTime,
} from "../lib/clipTimelineVideos";
import {
  getActualBaseEndSequence,
  getTimelineInserts,
  sequenceTimeToSourceTimeWithInserts,
  sourceTimeToActualSequenceTime,
} from "../lib/clipTimelineInserts";
import { clipDebug } from "../lib/clipDebug";
import { useClipEditorStore } from "../stores/clipEditorStore";

type UseClipVideoPlaybackSyncOptions = {
  bgVideoRef: RefObject<HTMLVideoElement | null>;
  pipVideoRef: RefObject<HTMLVideoElement | null>;
  keepSegments: TimeRange[];
  sourceUrl: string | null;
  logLabel?: string;
  extraBgVideoProps?: Pick<
    VideoHTMLAttributes<HTMLVideoElement>,
    "onLoadedMetadata" | "onError"
  >;
};

function applyPlaybackRateToVideos(
  bgVideo: HTMLVideoElement,
  pipVideo: HTMLVideoElement | null,
  keepSegments: TimeRange[],
) {
  const rate = getPlaybackRateForSpeed(
    getSpeedAtSourceTime(bgVideo.currentTime, keepSegments),
  );
  bgVideo.playbackRate = rate;
  if (pipVideo) {
    pipVideo.playbackRate = rate;
  }
}

export function useClipVideoPlaybackSync({
  bgVideoRef,
  pipVideoRef,
  keepSegments,
  sourceUrl,
  logLabel = "preview",
  extraBgVideoProps,
}: UseClipVideoPlaybackSyncOptions) {
  const currentTime = useClipEditorStore((s) => s.currentTime);
  const sequencePlayhead = useClipEditorStore((s) => s.sequencePlayhead);
  const timelineVideos = useClipEditorStore((s) => s.timelineVideos);
  const isPlaying = useClipEditorStore((s) => s.isPlaying);
  const setCurrentTime = useClipEditorStore((s) => s.setCurrentTime);
  const setSequencePlayhead = useClipEditorStore((s) => s.setSequencePlayhead);
  const setIsPlaying = useClipEditorStore((s) => s.setIsPlaying);

  const isSeekingRef = useRef(false);
  const keepSegmentsRef = useRef(keepSegments);
  keepSegmentsRef.current = keepSegments;

  const tryContinueOnTimelineVideos = (sequenceTime: number): boolean => {
    const state = useClipEditorStore.getState();
    const continuation = getTimelineContinuationSequenceTime(
      sequenceTime,
      state.keepSegments,
      state.timelineVideos,
    );

    if (continuation === null) return false;

    setSequencePlayhead(continuation);
    return true;
  };

  useEffect(() => {
    if (sourceUrl) {
      isSeekingRef.current = false;
    }
  }, [sourceUrl]);

  useEffect(() => {
    const bgVideo = bgVideoRef.current;
    const pipVideo = pipVideoRef.current;
    if (!bgVideo || !sourceUrl) return;

    applyPlaybackRateToVideos(bgVideo, pipVideo, keepSegmentsRef.current);

    if (!isPlaying) {
      bgVideo.pause();
      pipVideo?.pause();
      return;
    }

    const state = useClipEditorStore.getState();
    if (
      !getActiveTimelineVideoAtSequence(state.sequencePlayhead, state.timelineVideos) &&
      Math.abs(bgVideo.currentTime - state.currentTime) > 0.05
    ) {
      isSeekingRef.current = true;
      bgVideo.currentTime = state.currentTime;
      if (pipVideo) {
        pipVideo.currentTime = state.currentTime;
      }
    }

    const startPlayback = () => {
      if (!useClipEditorStore.getState().isPlaying) return;
      applyPlaybackRateToVideos(bgVideo, pipVideo, keepSegmentsRef.current);
      void bgVideo.play().catch((error) => {
        clipDebug.warn(logLabel, "lecture impossible", error);
      });
      void pipVideo?.play().catch(() => undefined);
    };

    if (bgVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startPlayback();
      return;
    }

    bgVideo.addEventListener("canplay", startPlayback, { once: true });
    return () => bgVideo.removeEventListener("canplay", startPlayback);
  }, [bgVideoRef, isPlaying, keepSegments, logLabel, pipVideoRef, sourceUrl]);

  useEffect(() => {
    const bgVideo = bgVideoRef.current;
    const pipVideo = pipVideoRef.current;
    if (!bgVideo || !sourceUrl || isPlaying || isSeekingRef.current) return;

    const activeClip = getActiveTimelineVideoAtSequence(
      sequencePlayhead,
      timelineVideos,
    );
    if (activeClip) return;

    const sourceTime = sequenceTimeToSourceTimeWithInserts(
      sequencePlayhead,
      keepSegmentsRef.current,
      timelineVideos,
    );
    if (sourceTime === null) return;

    const snapped = snapTimeToKeepSegments(sourceTime, keepSegmentsRef.current);
    if (Math.abs(bgVideo.currentTime - snapped) > 0.05) {
      isSeekingRef.current = true;
      bgVideo.currentTime = snapped;
      if (pipVideo) {
        pipVideo.currentTime = snapped;
      }
    }
  }, [
    bgVideoRef,
    isPlaying,
    pipVideoRef,
    sequencePlayhead,
    sourceUrl,
    timelineVideos,
  ]);

  useEffect(() => {
    const bgVideo = bgVideoRef.current;
    const pipVideo = pipVideoRef.current;
    if (!bgVideo || isSeekingRef.current || !sourceUrl) return;

    applyPlaybackRateToVideos(bgVideo, pipVideo, keepSegmentsRef.current);

    if (Math.abs(bgVideo.currentTime - currentTime) > 0.08) {
      isSeekingRef.current = true;
      bgVideo.currentTime = currentTime;
      if (pipVideo) {
        pipVideo.currentTime = currentTime;
      }
    }
  }, [bgVideoRef, currentTime, keepSegments, pipVideoRef, sourceUrl]);

  useEffect(() => {
    if (!isPlaying || !sourceUrl) return;

    let rafId = 0;

    const tick = () => {
      const bgVideo = bgVideoRef.current;
      const pipVideo = pipVideoRef.current;

      if (!bgVideo) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (isSeekingRef.current) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (bgVideo.paused && useClipEditorStore.getState().isPlaying) {
        void bgVideo.play().catch(() => undefined);
        void pipVideo?.play().catch(() => undefined);
      }

      applyPlaybackRateToVideos(bgVideo, pipVideo, keepSegmentsRef.current);

      const resolved = resolvePlaybackTime(
        bgVideo.currentTime,
        keepSegmentsRef.current,
      );

      if (resolved === "ended") {
        const state = useClipEditorStore.getState();
        const actualBaseEnd = getActualBaseEndSequence(
          state.keepSegments,
          state.timelineVideos,
        );
        if (tryContinueOnTimelineVideos(actualBaseEnd)) {
          return;
        }
        setIsPlaying(false);
        return;
      }

      const state = useClipEditorStore.getState();
      const natural = sourceTimeToSequenceTime(
        resolved,
        keepSegmentsRef.current,
      );
      const inserts = getTimelineInserts(state.timelineVideos);

      for (const insert of inserts) {
        if (
          natural >= insert.naturalStart - 0.05 &&
          state.sequencePlayhead < insert.actualStart + 0.01
        ) {
          setSequencePlayhead(insert.actualStart);
          if (state.isPlaying) {
            const bgVideo = bgVideoRef.current;
            bgVideo?.pause();
          }
          return;
        }
      }

      if (Math.abs(resolved - bgVideo.currentTime) > 0.05) {
        isSeekingRef.current = true;
        bgVideo.currentTime = resolved;
        if (pipVideo) {
          pipVideo.currentTime = resolved;
        }
        applyPlaybackRateToVideos(bgVideo, pipVideo, keepSegmentsRef.current);
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (
        pipVideo &&
        Math.abs(pipVideo.currentTime - bgVideo.currentTime) > 0.03
      ) {
        pipVideo.currentTime = bgVideo.currentTime;
      }

      setCurrentTime(resolved);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    bgVideoRef,
    isPlaying,
    keepSegments,
    pipVideoRef,
    setCurrentTime,
    setIsPlaying,
    setSequencePlayhead,
    sourceUrl,
  ]);

  const bgVideoProps: VideoHTMLAttributes<HTMLVideoElement> = {
    ...extraBgVideoProps,
    onSeeked: () => {
      isSeekingRef.current = false;
      const bgVideo = bgVideoRef.current;
      const pipVideo = pipVideoRef.current;
      if (useClipEditorStore.getState().isPlaying && bgVideo && sourceUrl) {
        void bgVideo.play().catch(() => undefined);
        void pipVideo?.play().catch(() => undefined);
      }
    },
    onEnded: () => {
      const state = useClipEditorStore.getState();
      const sequenceTime = sourceTimeToActualSequenceTime(
        state.currentTime,
        state.keepSegments,
        state.timelineVideos,
      );
      if (tryContinueOnTimelineVideos(sequenceTime)) {
        return;
      }
      setIsPlaying(false);
    },
  };

  return { isSeekingRef, bgVideoProps };
}
