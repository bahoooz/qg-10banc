import { useMemo, useRef } from "react";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import { clipDebug } from "../../lib/clipDebug";
import {
  getActiveZoomEffectAtTime,
  getEffectiveZoomRegion,
} from "../../lib/clipZoomEffects";
import { getImageOverlaysAtTime } from "../../lib/clipImageOverlays";
import { getTextOverlaysAtTime } from "../../lib/clipTextOverlays";
import { useClipVideoPlaybackSync } from "../../hooks/useClipVideoPlaybackSync";
import ClipEditorVerticalPreview from "./ClipEditorVerticalPreview";
import ClipZoomSourceSelector from "./ClipZoomSourceSelector";
import ClipImageOverlayLayer from "./ClipImageOverlayLayer";
import ClipTextOverlayLayer from "./ClipTextOverlayLayer";
import ClipEditorTextOverlaySidebar from "./ClipEditorTextOverlaySidebar";

export default function ClipEditorPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);

  const sourceUrl = useClipEditorStore((s) => s.sourceUrl);
  const sourceWidth = useClipEditorStore((s) => s.sourceWidth);
  const sourceHeight = useClipEditorStore((s) => s.sourceHeight);
  const layout = useClipEditorStore((s) => s.layout);
  const currentTime = useClipEditorStore((s) => s.currentTime);
  const isApplyingCut = useClipEditorStore((s) => s.isApplyingCut);
  const isExporting = useClipEditorStore((s) => s.isExporting);
  const sourceDuration = useClipEditorStore((s) => s.sourceDuration);
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

  const handlePreviewContainerSize = (size: { width: number; height: number }) => {
    if (size.width > 0) setPreviewContainerWidth(size.width);
  };

  const isBusy = isApplyingCut || isExporting;
  const videoW = sourceWidth || 16;
  const videoH = sourceHeight || 9;

  const activeZoomEffect = useMemo(
    () => getActiveZoomEffectAtTime(zoomEffects, currentTime),
    [zoomEffects, currentTime],
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

  const previewZoomEffect = editingZoomEffect ?? activeZoomEffect;

  const previewImageOverlays = useMemo(() => {
    const atTime = getImageOverlaysAtTime(imageOverlays, currentTime);

    if (!isImageToolActive || !selectedImageOverlayId) {
      return atTime;
    }

    const selected = imageOverlays.find(
      (overlay) => overlay.id === selectedImageOverlayId,
    );
    if (!selected) return atTime;
    if (atTime.some((overlay) => overlay.id === selected.id)) return atTime;

    return [...atTime, selected];
  }, [
    currentTime,
    imageOverlays,
    isImageToolActive,
    selectedImageOverlayId,
  ]);

  const previewTextOverlays = useMemo(() => {
    const atTime = getTextOverlaysAtTime(textOverlays, currentTime);

    if (!isTextToolActive || !selectedTextOverlayId) {
      return atTime;
    }

    const selected = textOverlays.find(
      (overlay) => overlay.id === selectedTextOverlayId,
    );
    if (!selected) return atTime;
    if (atTime.some((overlay) => overlay.id === selected.id)) return atTime;

    return [...atTime, selected];
  }, [
    currentTime,
    isTextToolActive,
    selectedTextOverlayId,
    textOverlays,
  ]);

  const bgVideoRegionOverride = useMemo(() => {
    if (!previewZoomEffect) return undefined;
    return getEffectiveZoomRegion(previewZoomEffect.zone);
  }, [previewZoomEffect]);

  const { bgVideoProps } = useClipVideoPlaybackSync({
    bgVideoRef,
    pipVideoRef,
    keepSegments,
    sourceUrl,
    logLabel: "preview",
    extraBgVideoProps: {
      onLoadedMetadata: (event) => {
        const videoDuration = event.currentTarget.duration;
        clipDebug.log("preview", "loadedmetadata", { videoDuration });
        if (Number.isFinite(videoDuration) && sourceDuration <= 0) {
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

  const imageOverlayLayer =
    previewImageOverlays.length > 0 ? (
      <ClipImageOverlayLayer
        overlays={previewImageOverlays}
        containerRef={containerRef}
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
        containerRef={containerRef}
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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {isBusy && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-sm">
          <p className="text-sm font-extrabold uppercase tracking-wide text-main-color">
            {isApplyingCut ? "Découpage en cours…" : "Export en cours…"}
          </p>
        </div>
      )}

      {sourceUrl ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {isTextToolActive && <ClipEditorTextOverlaySidebar />}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 p-4 lg:flex-row lg:items-stretch lg:justify-center lg:p-5">
            <div className="flex shrink-0 flex-col items-stretch gap-2">
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
                  isZoomToolActive || isImageToolActive || isTextToolActive
                    ? "relative mx-auto aspect-[9/16] h-full max-h-[min(58vh,640px)] w-auto overflow-hidden rounded-2xl border border-secondary-color/60 bg-black shadow-[0_0_60px_rgba(205,183,255,0.08)] lg:max-h-[min(62vh,680px)]"
                    : undefined
                }
                overlay={previewOverlay}
                onContainerSizeChange={handlePreviewContainerSize}
                bgVideoProps={bgVideoProps}
            />

            <div className="flex items-center justify-end px-1">
              <span className="rounded-lg border border-secondary-color/40 bg-background-secondary px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-main-color">
                9:16
              </span>
            </div>
          </div>

          {isZoomToolActive && editingZoomEffect && !isBusy && (
            <ClipZoomSourceSelector
              sourceUrl={sourceUrl}
              videoWidth={videoW}
              videoHeight={videoH}
              zone={editingZoomEffect.zone}
              currentTime={currentTime}
              onZoneChange={(zone) =>
                updateZoomEffectZone(editingZoomEffect.id, zone)
              }
            />
          )}

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
