import { useMemo, useRef } from "react";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import { clipDebug } from "../../lib/clipDebug";
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
import { useClipVideoPlaybackSync } from "../../hooks/useClipVideoPlaybackSync";
import { useTimelineVideoPlayback } from "../../hooks/useTimelineVideoPlayback";
import ClipEditorVerticalPreview from "./ClipEditorVerticalPreview";
import ClipImageOverlayLayer from "./ClipImageOverlayLayer";
import ClipTextOverlayLayer from "./ClipTextOverlayLayer";
import ClipEditorTextOverlaySidebar from "./ClipEditorTextOverlaySidebar";
import ClipEditorSoundboardSidebar from "./ClipEditorSoundboardSidebar";
import ClipEditorSpeedSidebar from "./ClipEditorSpeedSidebar";
import ClipEditorZoomSidebar from "./ClipEditorZoomSidebar";
import { useClipSoundboardPlayback } from "../../hooks/useClipSoundboardPlayback";

const PREVIEW_FIT_CLASSNAME =
  "relative mx-auto aspect-[9/16] h-full max-h-full w-auto overflow-hidden rounded-2xl border border-secondary-color/60 bg-black shadow-[0_0_60px_rgba(205,183,255,0.08)]";

type ClipEditorPreviewProps = {
  fitContainer?: boolean;
};

export default function ClipEditorPreview({
  fitContainer = false,
}: ClipEditorPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const timelineVideoRef = useRef<HTMLVideoElement>(null);
  const timelinePipVideoRef = useRef<HTMLVideoElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const sourceUrl = useClipEditorStore((s) => s.sourceUrl);
  const sourceWidth = useClipEditorStore((s) => s.sourceWidth);
  const sourceHeight = useClipEditorStore((s) => s.sourceHeight);
  const layout = useClipEditorStore((s) => s.layout);
  const currentTime = useClipEditorStore((s) => s.currentTime);
  const isApplyingCut = useClipEditorStore((s) => s.isApplyingCut);
  const isExporting = useClipEditorStore((s) => s.isExporting);
  const keepSegments = useClipEditorStore((s) => s.keepSegments);
  const zoomEffects = useClipEditorStore((s) => s.zoomEffects);
  const selectedZoomEffectId = useClipEditorStore((s) => s.selectedZoomEffectId);
  const isZoomToolActive = useClipEditorStore((s) => s.isZoomToolActive);
  const imageOverlays = useClipEditorStore((s) => s.imageOverlays);
  const selectedImageOverlayId = useClipEditorStore(
    (s) => s.selectedImageOverlayId,
  );
  const isImageToolActive = useClipEditorStore((s) => s.isImageToolActive);
  const textOverlays = useClipEditorStore((s) => s.textOverlays);
  const selectedTextOverlayId = useClipEditorStore(
    (s) => s.selectedTextOverlayId,
  );
  const isTextToolActive = useClipEditorStore((s) => s.isTextToolActive);
  const soundboards = useClipEditorStore((s) => s.soundboards);
  const isSoundboardToolActive = useClipEditorStore(
    (s) => s.isSoundboardToolActive,
  );
  const isSpeedToolActive = useClipEditorStore((s) => s.isSpeedToolActive);
  const timelineVideos = useClipEditorStore((s) => s.timelineVideos);
  const sequencePlayhead = useClipEditorStore((s) => s.sequencePlayhead);
  const isPlaying = useClipEditorStore((s) => s.isPlaying);
  const setSourceDuration = useClipEditorStore((s) => s.setSourceDuration);
  const updateZoomEffectZone = useClipEditorStore((s) => s.updateZoomEffectZone);
  const updateImageOverlayZone = useClipEditorStore(
    (s) => s.updateImageOverlayZone,
  );
  const setSelectedImageOverlayId = useClipEditorStore(
    (s) => s.setSelectedImageOverlayId,
  );
  const setSelectedTextOverlayId = useClipEditorStore(
    (s) => s.setSelectedTextOverlayId,
  );
  const updateTextOverlayLayout = useClipEditorStore(
    (s) => s.updateTextOverlayLayout,
  );
  const previewVolume = useClipEditorStore((s) => s.previewVolume);
  const setPreviewContainerWidth = useClipEditorStore((s) => s.setPreviewContainerWidth);

  useClipSoundboardPlayback({
    clips: soundboards,
    sequenceTime: sequencePlayhead,
    sourceTime: currentTime,
    isPlaying,
    previewVolume,
  });

  const handlePreviewContainerSize = (size: { width: number; height: number }) => {
    if (size.width > 0) setPreviewContainerWidth(size.width);
  };

  const isBusy = isApplyingCut || isExporting;
  const activeTimelineVideo = useMemo(
    () => getActiveTimelineVideoAtSequence(sequencePlayhead, timelineVideos),
    [sequencePlayhead, timelineVideos],
  );
  const showTimelineVideo = Boolean(activeTimelineVideo);
  const videoW = showTimelineVideo
    ? activeTimelineVideo?.sourceWidth || 16
    : sourceWidth || 16;
  const videoH = showTimelineVideo
    ? activeTimelineVideo?.sourceHeight || 9
    : sourceHeight || 9;
  const previewSourceUrl = showTimelineVideo
    ? activeTimelineVideo?.sourceUrl ?? ""
    : sourceUrl;
  const previewLayout = showTimelineVideo && activeTimelineVideo
    ? resolveTimelineVideoLayout(activeTimelineVideo, layout)
    : layout;
  const timelineVideoRegionOverride =
    showTimelineVideo && activeTimelineVideo?.layoutMode === "center-crop"
      ? getVerticalCropRegion(videoW, videoH, 0.5)
      : undefined;

  const activeZoomEffect = useMemo(
    () =>
      getActiveZoomEffectForPlayhead(
        zoomEffects,
        sequencePlayhead,
        currentTime,
      ),
    [zoomEffects, sequencePlayhead, currentTime],
  );

  const editingZoomEffect = useMemo(() => {
    if (!isZoomToolActive) return null;
    if (selectedZoomEffectId) {
      return zoomEffects.find((effect) => effect.id === selectedZoomEffectId) ?? null;
    }
    return activeZoomEffect;
  }, [
    activeZoomEffect,
    isZoomToolActive,
    selectedZoomEffectId,
    zoomEffects,
  ]);

  const previewImageOverlays = useMemo(
    () =>
      getImageOverlaysForPlayhead(
        imageOverlays,
        sequencePlayhead,
        currentTime,
      ),
    [currentTime, imageOverlays, sequencePlayhead],
  );

  const previewTextOverlays = useMemo(
    () =>
      getTextOverlaysForPlayhead(
        textOverlays,
        sequencePlayhead,
        currentTime,
      ),
    [currentTime, sequencePlayhead, textOverlays],
  );

  const bgVideoRegionOverride = useMemo(() => {
    if (!activeZoomEffect) return undefined;
    return getEffectiveZoomRegion(activeZoomEffect.zone);
  }, [activeZoomEffect]);

  const previewContainerRef = showTimelineVideo
    ? timelineContainerRef
    : containerRef;

  const activeBgVideoRegionOverride = useMemo(() => {
    if (bgVideoRegionOverride) return bgVideoRegionOverride;
    return timelineVideoRegionOverride;
  }, [bgVideoRegionOverride, timelineVideoRegionOverride]);

  const zoomSelectorSourceUrl =
    showTimelineVideo && activeTimelineVideo
      ? activeTimelineVideo.sourceUrl
      : sourceUrl;

  const { bgVideoProps } = useClipVideoPlaybackSync({
    bgVideoRef,
    pipVideoRef,
    keepSegments,
    sourceUrl: showTimelineVideo ? null : sourceUrl,
    logLabel: "preview",
    extraBgVideoProps: {
      onLoadedMetadata: (event) => {
        const videoDuration = event.currentTarget.duration;
        clipDebug.log("preview", "loadedmetadata", { videoDuration });
        if (Number.isFinite(videoDuration)) {
          setSourceDuration(videoDuration);
        }
      },
      onError: (event) => {
        const mediaError = event.currentTarget.error;
        clipDebug.error("preview", "erreur chargement vidéo", {
          sourceUrl,
          code: mediaError?.code,
          message: mediaError?.message,
        });
      },
    },
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

  const imageOverlayLayer =
    previewImageOverlays.length > 0 ? (
      <ClipImageOverlayLayer
        overlays={previewImageOverlays}
        containerRef={previewContainerRef}
        selectedOverlayId={selectedImageOverlayId}
        selectable={!isBusy && !isTextToolActive}
        onSelect={setSelectedImageOverlayId}
        interactive={isImageToolActive && !isBusy}
        disabled={isBusy}
        onZoneChange={updateImageOverlayZone}
      />
    ) : null;

  const textOverlayLayer =
    previewTextOverlays.length > 0 ? (
      <ClipTextOverlayLayer
        overlays={previewTextOverlays}
        containerRef={previewContainerRef}
        selectedOverlayId={selectedTextOverlayId}
        selectable={!isBusy}
        onSelect={setSelectedTextOverlayId}
        interactive={isTextToolActive && !isBusy}
        disabled={isBusy}
        onLayoutChange={updateTextOverlayLayout}
      />
    ) : null;

  const previewOverlay =
    imageOverlayLayer || textOverlayLayer ? (
      <>
        {imageOverlayLayer}
        {textOverlayLayer}
      </>
    ) : undefined;

  const previewFrameClassName = fitContainer
    ? PREVIEW_FIT_CLASSNAME
    : "relative mx-auto aspect-[9/16] h-full max-h-[min(58vh,640px)] w-auto overflow-hidden rounded-2xl border border-secondary-color/60 bg-black shadow-[0_0_60px_rgba(205,183,255,0.08)] lg:max-h-[min(62vh,680px)]";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {isBusy && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-sm">
          <p className="text-sm font-extrabold uppercase tracking-wide text-main-color">
            {isApplyingCut ? "Découpage en cours…" : "Export en cours…"}
          </p>
        </div>
      )}

      {previewSourceUrl ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {isZoomToolActive && editingZoomEffect && !isBusy && (
            <ClipEditorZoomSidebar
              sourceUrl={zoomSelectorSourceUrl}
              videoWidth={videoW}
              videoHeight={videoH}
              zone={editingZoomEffect.zone}
              currentTime={showTimelineVideo ? sequencePlayhead : currentTime}
              onZoneChange={(zone) =>
                updateZoomEffectZone(editingZoomEffect.id, zone)
              }
            />
          )}
          {isTextToolActive && <ClipEditorTextOverlaySidebar />}
          {isSoundboardToolActive && <ClipEditorSoundboardSidebar />}
          {isSpeedToolActive && <ClipEditorSpeedSidebar />}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 p-4 lg:flex-row lg:items-stretch lg:justify-center lg:p-5">
            <div className="flex shrink-0 flex-col items-stretch gap-2">
              {showTimelineVideo && activeTimelineVideo ? (
                <ClipEditorVerticalPreview
                  key={activeTimelineVideo.id}
                  sourceUrl={activeTimelineVideo.sourceUrl}
                  bgVideoKey={`${activeTimelineVideo.id}-${activeTimelineVideo.clipId}`}
                  videoWidth={videoW}
                  videoHeight={videoH}
                  layout={previewLayout}
                  containerRef={timelineContainerRef}
                  bgVideoRef={timelineVideoRef}
                  pipVideoRef={timelinePipVideoRef}
                  bgVideoRegionOverride={activeBgVideoRegionOverride}
                  volume={previewVolume}
                  showAspectBadge={false}
                  overlay={previewOverlay}
                  onContainerSizeChange={handlePreviewContainerSize}
                  bgVideoProps={timelineVideoProps}
                  pipVideoProps={timelinePipVideoProps}
                  className={
                    isZoomToolActive ||
                    isImageToolActive ||
                    isTextToolActive ||
                    isSoundboardToolActive ||
                    isSpeedToolActive
                      ? previewFrameClassName
                      : fitContainer
                        ? previewFrameClassName
                        : undefined
                  }
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
                  showAspectBadge={false}
                  className={
                    isZoomToolActive ||
                    isImageToolActive ||
                    isTextToolActive ||
                    isSoundboardToolActive ||
                    isSpeedToolActive
                      ? previewFrameClassName
                      : fitContainer
                        ? previewFrameClassName
                        : undefined
                  }
                  overlay={previewOverlay}
                  onContainerSizeChange={handlePreviewContainerSize}
                  bgVideoProps={bgVideoProps}
                />
              )}

            <div className="flex items-center justify-end px-1">
              <span className="rounded-lg border border-secondary-color/40 bg-background-secondary px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-main-color">
                9:16
              </span>
            </div>
          </div>

          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4 lg:p-5">
          <div className="flex aspect-[9/16] max-h-[min(58vh,640px)] items-center justify-center rounded-2xl border border-secondary-color/60 bg-black px-6 text-sm text-white/40">
            Source vidéo indisponible
          </div>
        </div>
      )}
    </div>
  );
}
