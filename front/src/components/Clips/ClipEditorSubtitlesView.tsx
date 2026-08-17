import { useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import { remapTimedSubtitleWordsToSequence } from "@qg/subtitle-composition";
import {
  getActiveZoomEffectForPlayhead,
  getEffectiveZoomRegion,
} from "../../lib/clipZoomEffects";
import { getImageOverlaysForPlayhead } from "../../lib/clipImageOverlays";
import { getTextOverlaysForPlayhead } from "../../lib/clipTextOverlays";
import {
  getActiveTimelineVideoAtSequence,
  resolveTimelineVideoLayout,
} from "../../lib/clipTimelineVideos";
import { getVerticalCropRegion } from "../../lib/clipLayout";
import { sourceTimeToSequenceTime } from "../../lib/clipTime";
import {
  mapFullTimelineSubtitleWordsToSequence,
  usesFullTimelineSubtitles,
} from "../../lib/clipSubtitles";
import { useTranscribeClip } from "../../hooks/useTranscribeClip";
import { useClipVideoPlaybackSync } from "../../hooks/useClipVideoPlaybackSync";
import { useTimelineVideoPlayback } from "../../hooks/useTimelineVideoPlayback";
import ClipEditorSubtitlesTopbar from "./ClipEditorSubtitlesTopbar";
import ClipEditorSubtitlesWordList from "./ClipEditorSubtitlesWordList";
import ClipEditorVerticalPreview from "./ClipEditorVerticalPreview";
import ClipSubtitleOverlay from "./ClipSubtitleOverlay";
import ClipImageOverlayLayer from "./ClipImageOverlayLayer";
import ClipTextOverlayLayer from "./ClipTextOverlayLayer";
import ClipEditorSubtitlesTimeline from "./ClipEditorSubtitlesTimeline";

export default function ClipEditorSubtitlesView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const timelineVideoRef = useRef<HTMLVideoElement>(null);
  const timelinePipVideoRef = useRef<HTMLVideoElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const clipId = useClipEditorStore((s) => s.clipId);
  const sourceUrl = useClipEditorStore((s) => s.sourceUrl);
  const sourceWidth = useClipEditorStore((s) => s.sourceWidth);
  const sourceHeight = useClipEditorStore((s) => s.sourceHeight);
  const layout = useClipEditorStore((s) => s.layout);
  const currentTime = useClipEditorStore((s) => s.currentTime);
  const isPlaying = useClipEditorStore((s) => s.isPlaying);
  const isTranscribing = useClipEditorStore((s) => s.isTranscribing);
  const isExporting = useClipEditorStore((s) => s.isExporting);
  const keepSegments = useClipEditorStore((s) => s.keepSegments);
  const timelineVideos = useClipEditorStore((s) => s.timelineVideos);
  const sequencePlayhead = useClipEditorStore((s) => s.sequencePlayhead);
  const zoomEffects = useClipEditorStore((s) => s.zoomEffects);
  const imageOverlays = useClipEditorStore((s) => s.imageOverlays);
  const textOverlays = useClipEditorStore((s) => s.textOverlays);
  const subtitleWords = useClipEditorStore((s) => s.subtitleWords);
  const subtitleStyle = useClipEditorStore((s) => s.subtitleStyle);
  const subtitleTiming = useClipEditorStore((s) => s.subtitleTiming);
  const subtitleLayout = useClipEditorStore((s) => s.subtitleLayout);
  const setSubtitleLayout = useClipEditorStore((s) => s.setSubtitleLayout);
  const previewVolume = useClipEditorStore((s) => s.previewVolume);
  const setPreviewContainerWidth = useClipEditorStore(
    (s) => s.setPreviewContainerWidth,
  );

  const transcribe = useTranscribeClip();
  const usesFullTimeline = usesFullTimelineSubtitles(timelineVideos);

  const handlePreviewContainerSize = (size: { width: number; height: number }) => {
    if (size.width > 0) {
      setPreviewContainerWidth(size.width);
    }
  };

  const activeTimelineVideo = useMemo(
    () => getActiveTimelineVideoAtSequence(sequencePlayhead, timelineVideos),
    [sequencePlayhead, timelineVideos],
  );
  const showTimelineVideo = Boolean(activeTimelineVideo);

  const sequenceTime = useMemo(
    () =>
      usesFullTimeline
        ? sequencePlayhead
        : sourceTimeToSequenceTime(currentTime, keepSegments),
    [currentTime, keepSegments, sequencePlayhead, usesFullTimeline],
  );

  const sequenceWords = useMemo(
    () =>
      usesFullTimeline
        ? mapFullTimelineSubtitleWordsToSequence(subtitleWords, subtitleTiming)
        : remapTimedSubtitleWordsToSequence(
            subtitleWords,
            keepSegments,
            subtitleTiming,
          ),
    [keepSegments, subtitleTiming, subtitleWords, usesFullTimeline],
  );

  const activeZoomEffect = useMemo(
    () =>
      getActiveZoomEffectForPlayhead(
        zoomEffects,
        sequencePlayhead,
        currentTime,
      ),
    [zoomEffects, sequencePlayhead, currentTime],
  );

  const bgVideoRegionOverride = useMemo(() => {
    if (!activeZoomEffect || showTimelineVideo) return undefined;
    return getEffectiveZoomRegion(activeZoomEffect.zone);
  }, [activeZoomEffect, showTimelineVideo]);

  const previewImageOverlays = useMemo(
    () =>
      getImageOverlaysForPlayhead(
        imageOverlays,
        sequencePlayhead,
        currentTime,
      ),
    [imageOverlays, sequencePlayhead, currentTime],
  );

  const previewTextOverlays = useMemo(
    () =>
      getTextOverlaysForPlayhead(
        textOverlays,
        sequencePlayhead,
        currentTime,
      ),
    [textOverlays, sequencePlayhead, currentTime],
  );

  const videoW = showTimelineVideo
    ? activeTimelineVideo?.sourceWidth || 16
    : sourceWidth || 16;
  const videoH = showTimelineVideo
    ? activeTimelineVideo?.sourceHeight || 9
    : sourceHeight || 9;
  const previewLayout =
    showTimelineVideo && activeTimelineVideo
      ? resolveTimelineVideoLayout(activeTimelineVideo, layout)
      : layout;
  const timelineVideoRegionOverride =
    showTimelineVideo && activeTimelineVideo?.layoutMode === "center-crop"
      ? getVerticalCropRegion(videoW, videoH, 0.5)
      : undefined;
  const previewSourceUrl = showTimelineVideo
    ? activeTimelineVideo?.sourceUrl ?? ""
    : sourceUrl;

  const isBusy = isTranscribing || isExporting;

  const transcriptionKey = useMemo(
    () =>
      JSON.stringify({
        keepSegments,
        timelineVideos: timelineVideos.map((clip) => ({
          clipId: clip.clipId,
          sequenceStart: clip.sequenceStart,
          duration: clip.duration,
          sourceStart: clip.sourceStart,
        })),
      }),
    [keepSegments, timelineVideos],
  );

  useEffect(() => {
    if (!clipId) return;
    transcribe.mutate({
      clipId,
      silent: true,
      keepSegments,
      timelineVideos,
    });
  }, [clipId, transcriptionKey]);

  const { bgVideoProps } = useClipVideoPlaybackSync({
    bgVideoRef,
    pipVideoRef,
    keepSegments,
    sourceUrl: showTimelineVideo ? null : sourceUrl,
    logLabel: "subtitles",
  });

  const { videoProps: timelineVideoProps, pipVideoProps: timelinePipVideoProps } =
    useTimelineVideoPlayback({
      videoRef: timelineVideoRef,
      pipVideoRef: timelinePipVideoRef,
      timelineVideos,
      sequencePlayhead,
      keepSegments,
      isPlaying: showTimelineVideo ? isPlaying : false,
    });

  const subtitleOverlay =
    !isTranscribing && sequenceWords.length > 0 ? (
      <ClipSubtitleOverlay
        words={sequenceWords}
        sequenceTime={sequenceTime}
        style={subtitleStyle}
        layout={subtitleLayout}
        containerRef={
          showTimelineVideo ? timelineContainerRef : containerRef
        }
        interactive
        disabled={isBusy}
        onLayoutChange={setSubtitleLayout}
      />
    ) : null;

  const imageOverlay =
    previewImageOverlays.length > 0 ? (
      <ClipImageOverlayLayer
        overlays={previewImageOverlays}
        containerRef={containerRef}
        selectedOverlayId={null}
        interactive={false}
      />
    ) : null;

  const textOverlay =
    previewTextOverlays.length > 0 ? (
      <ClipTextOverlayLayer
        overlays={previewTextOverlays}
        containerRef={containerRef}
        selectedOverlayId={null}
        interactive={false}
      />
    ) : null;

  const previewOverlay =
    imageOverlay || textOverlay || subtitleOverlay ? (
      <>
        {imageOverlay}
        {textOverlay}
        {subtitleOverlay}
      </>
    ) : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 lg:px-5 lg:pt-5">
        <ClipEditorSubtitlesTopbar />
      </div>

      {isBusy && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/70 backdrop-blur-sm">
          <Loader2 className="size-8 animate-spin text-main-color" />
          <p className="text-sm font-extrabold uppercase tracking-wide text-main-color">
            {isTranscribing
              ? "Génération des sous-titres…"
              : "Export en cours…"}
          </p>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <ClipEditorSubtitlesWordList disabled={isBusy} />

        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-4 lg:p-5">
          {previewSourceUrl ? (
            showTimelineVideo && activeTimelineVideo ? (
              <ClipEditorVerticalPreview
                sourceUrl={activeTimelineVideo.sourceUrl}
                videoWidth={videoW}
                videoHeight={videoH}
                layout={previewLayout}
                containerRef={timelineContainerRef}
                bgVideoRef={timelineVideoRef}
                pipVideoRef={timelinePipVideoRef}
                bgVideoRegionOverride={timelineVideoRegionOverride}
                volume={previewVolume}
                onContainerSizeChange={handlePreviewContainerSize}
                overlay={subtitleOverlay ?? undefined}
                bgVideoProps={timelineVideoProps}
                pipVideoProps={timelinePipVideoProps}
              />
            ) : (
              <ClipEditorVerticalPreview
                sourceUrl={sourceUrl}
                videoWidth={videoW}
                videoHeight={videoH}
                layout={layout}
                containerRef={containerRef}
                bgVideoRef={bgVideoRef}
                pipVideoRef={pipVideoRef}
                bgVideoRegionOverride={bgVideoRegionOverride}
                volume={previewVolume}
                onContainerSizeChange={handlePreviewContainerSize}
                overlay={previewOverlay}
                bgVideoProps={bgVideoProps}
              />
            )
          ) : (
            <div className="flex aspect-[9/16] max-h-[min(58vh,640px)] items-center justify-center rounded-2xl border border-secondary-color/60 bg-black px-6 text-sm text-white/40">
              Source vidéo indisponible
            </div>
          )}
        </div>
      </div>

      <ClipEditorSubtitlesTimeline disabled={isBusy} />
    </div>
  );
}
