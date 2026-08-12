import {
  useEffect,
  useRef,
  type RefObject,
  type VideoHTMLAttributes,
} from "react";
import { resolvePlaybackTime, type TimeRange } from "../lib/clipTime";
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

export function useClipVideoPlaybackSync({
  bgVideoRef,
  pipVideoRef,
  keepSegments,
  sourceUrl,
  logLabel = "preview",
  extraBgVideoProps,
}: UseClipVideoPlaybackSyncOptions) {
  const currentTime = useClipEditorStore((s) => s.currentTime);
  const isPlaying = useClipEditorStore((s) => s.isPlaying);
  const setCurrentTime = useClipEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useClipEditorStore((s) => s.setIsPlaying);

  const isSeekingRef = useRef(false);
  const keepSegmentsRef = useRef(keepSegments);
  keepSegmentsRef.current = keepSegments;

  useEffect(() => {
    const bgVideo = bgVideoRef.current;
    const pipVideo = pipVideoRef.current;
    if (!bgVideo) return;

    if (isPlaying) {
      void bgVideo.play().catch((error) => {
        clipDebug.warn(logLabel, "lecture impossible", error);
        setIsPlaying(false);
      });
      void pipVideo?.play().catch(() => undefined);
    } else {
      bgVideo.pause();
      pipVideo?.pause();
    }
  }, [bgVideoRef, isPlaying, logLabel, pipVideoRef, setIsPlaying, sourceUrl]);

  useEffect(() => {
    const bgVideo = bgVideoRef.current;
    const pipVideo = pipVideoRef.current;
    if (!bgVideo || isSeekingRef.current || !sourceUrl) return;

    if (Math.abs(bgVideo.currentTime - currentTime) > 0.08) {
      isSeekingRef.current = true;
      bgVideo.currentTime = currentTime;
      if (pipVideo) {
        pipVideo.currentTime = currentTime;
      }
    }
  }, [bgVideoRef, currentTime, pipVideoRef, sourceUrl]);

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

      const resolved = resolvePlaybackTime(
        bgVideo.currentTime,
        keepSegmentsRef.current,
      );

      if (resolved === "ended") {
        setIsPlaying(false);
        return;
      }

      if (Math.abs(resolved - bgVideo.currentTime) > 0.05) {
        isSeekingRef.current = true;
        bgVideo.currentTime = resolved;
        if (pipVideo) {
          pipVideo.currentTime = resolved;
        }
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
    pipVideoRef,
    setCurrentTime,
    setIsPlaying,
    sourceUrl,
  ]);

  const bgVideoProps: VideoHTMLAttributes<HTMLVideoElement> = {
    ...extraBgVideoProps,
    onSeeked: () => {
      isSeekingRef.current = false;
    },
    onEnded: () => setIsPlaying(false),
  };

  return { isSeekingRef, bgVideoProps };
}
