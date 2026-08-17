import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import {
  getActiveTimelineVideoAtSequence,
  getTimelineContinuationSequenceTime,
  getTimelineVideoLocalTime,
  getTimelineVideoSequenceDuration,
  getTimelineVideoSpeed,
  getTotalTimelineDuration,
  type TimelineVideoClip,
} from "../lib/clipTimelineVideos";
import {
  getPlaybackRateForSpeed,
  getEditedDuration,
  sequenceTimeToSourceTime,
  type TimeRange,
} from "../lib/clipTime";
import { useClipEditorStore } from "../stores/clipEditorStore";

type UseTimelineVideoPlaybackOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  pipVideoRef?: RefObject<HTMLVideoElement | null>;
  timelineVideos: TimelineVideoClip[];
  sequencePlayhead: number;
  keepSegments: TimeRange[];
  isPlaying: boolean;
};

function syncPipVideoTime(
  bgVideo: HTMLVideoElement,
  pipVideo: HTMLVideoElement | null,
) {
  if (!pipVideo) return;
  if (Math.abs(pipVideo.currentTime - bgVideo.currentTime) > 0.03) {
    pipVideo.currentTime = bgVideo.currentTime;
  }
}

function playTimelineVideos(
  video: HTMLVideoElement,
  pipVideo: HTMLVideoElement | null,
) {
  void video.play().catch(() => undefined);
  void pipVideo?.play().catch(() => undefined);
}

export function useTimelineVideoPlayback({
  videoRef,
  pipVideoRef,
  timelineVideos,
  sequencePlayhead,
  keepSegments,
  isPlaying,
}: UseTimelineVideoPlaybackOptions) {
  const setSequencePlayhead = useClipEditorStore((s) => s.setSequencePlayhead);
  const setCurrentTime = useClipEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useClipEditorStore((s) => s.setIsPlaying);
  const isSeekingRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const activeClip = getActiveTimelineVideoAtSequence(
    sequencePlayhead,
    timelineVideos,
  );
  const localTime = activeClip
    ? getTimelineVideoLocalTime(sequencePlayhead, activeClip)
    : 0;

  useEffect(() => {
    if (!activeClip) {
      isSeekingRef.current = false;
      return;
    }

    const video = videoRef.current;
    const pipVideo = pipVideoRef?.current ?? null;
    if (!video) return;

    const targetTime = activeClip.sourceStart + localTime;
    if (Math.abs(video.currentTime - targetTime) > 0.08) {
      isSeekingRef.current = true;
      video.currentTime = targetTime;
      if (pipVideo) {
        pipVideo.currentTime = targetTime;
      }
    }
  }, [activeClip, localTime, pipVideoRef, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const pipVideo = pipVideoRef?.current ?? null;
    if (!video || !activeClip || !isPlaying) return;

    const rate = getPlaybackRateForSpeed(getTimelineVideoSpeed(activeClip));
    video.playbackRate = rate;
    if (pipVideo) pipVideo.playbackRate = rate;

    const startPlayback = () => {
      if (!isPlayingRef.current) return;
      playTimelineVideos(video, pipVideo);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startPlayback();
      return;
    }

    video.addEventListener("canplay", startPlayback, { once: true });
    return () => video.removeEventListener("canplay", startPlayback);
  }, [activeClip, isPlaying, pipVideoRef, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    const pipVideo = pipVideoRef?.current ?? null;
    if (!video || !activeClip) return;

    if (!isPlaying) {
      video.pause();
      pipVideo?.pause();
    }
  }, [activeClip, isPlaying, pipVideoRef, videoRef]);

  useEffect(() => {
    if (!isPlaying || !activeClip) return;

    let rafId = 0;

    const tick = () => {
      const video = videoRef.current;
      const pipVideo = pipVideoRef?.current ?? null;
      const state = useClipEditorStore.getState();
      const clip = getActiveTimelineVideoAtSequence(
        state.sequencePlayhead,
        state.timelineVideos,
      );

      if (!video || !clip) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (isSeekingRef.current) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (video.paused && isPlayingRef.current) {
        playTimelineVideos(video, pipVideo);
      }

      syncPipVideoTime(video, pipVideo);

      const rate = getPlaybackRateForSpeed(getTimelineVideoSpeed(clip));
      const nextSequenceTime =
        clip.sequenceStart + (video.currentTime - clip.sourceStart) / rate;
      const totalDuration = getTotalTimelineDuration(
        keepSegments,
        state.timelineVideos,
      );
      const sequenceDuration = getTimelineVideoSequenceDuration(clip);

      if (
        video.currentTime >= clip.sourceStart + clip.duration - 0.05 ||
        nextSequenceTime >= clip.sequenceStart + sequenceDuration - 0.05
      ) {
        const clipEndSequenceTime = clip.sequenceStart + sequenceDuration;

        if (clipEndSequenceTime >= totalDuration - 0.05) {
          setIsPlaying(false);
          return;
        }

        const continuation = getTimelineContinuationSequenceTime(
          clipEndSequenceTime,
          keepSegments,
          state.timelineVideos,
        );

        if (continuation !== null) {
          setSequencePlayhead(continuation);
          if (clip.importKind === "meme" && clip.naturalInsertStart !== undefined) {
            const sourceAtPart2 = sequenceTimeToSourceTime(
              clip.naturalInsertStart,
              keepSegments,
            );
            setCurrentTime(sourceAtPart2);
          }
          return;
        }

        setSequencePlayhead(Math.min(totalDuration, clipEndSequenceTime));
        setIsPlaying(false);
        return;
      }

      setSequencePlayhead(nextSequenceTime);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    activeClip,
    isPlaying,
    keepSegments,
    setCurrentTime,
    setIsPlaying,
    setSequencePlayhead,
    pipVideoRef,
    videoRef,
  ]);

  const handleSeeked = () => {
    isSeekingRef.current = false;
    const video = videoRef.current;
    const pipVideo = pipVideoRef?.current ?? null;
    if (video && pipVideo) {
      syncPipVideoTime(video, pipVideo);
    }
    if (video && isPlayingRef.current) {
      playTimelineVideos(video, pipVideo);
    }
  };

  return {
    activeClip,
    localTime,
    videoProps: {
      onSeeked: handleSeeked,
    },
    pipVideoProps: {
      onSeeked: handleSeeked,
    },
  };
}

export function shouldShowTimelineVideoPreview(
  sequencePlayhead: number,
  timelineVideos: TimelineVideoClip[],
): boolean {
  return Boolean(
    getActiveTimelineVideoAtSequence(sequencePlayhead, timelineVideos),
  );
}

export function getMainPreviewSequenceTime(
  sequencePlayhead: number,
  keepSegments: TimeRange[],
): number {
  const baseDuration = getEditedDuration(keepSegments);
  return Math.min(sequencePlayhead, baseDuration);
}
