import { useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import {
  sourceTimeToSequenceTime,
} from "../../lib/clipTime";
import { remapTimedSubtitleWordsToSequence } from "../../lib/clipSubtitles";
import {
  getActiveZoomEffectAtTime,
  getEffectiveZoomRegion,
} from "../../lib/clipZoomEffects";
import { getImageOverlaysAtTime } from "../../lib/clipImageOverlays";
import { getTextOverlaysAtTime } from "../../lib/clipTextOverlays";
import { useTranscribeClip } from "../../hooks/useTranscribeClip";
import { useClipVideoPlaybackSync } from "../../hooks/useClipVideoPlaybackSync";
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

  const clipId = useClipEditorStore((s) => s.clipId);
  const sourceUrl = useClipEditorStore((s) => s.sourceUrl);
  const sourceWidth = useClipEditorStore((s) => s.sourceWidth);
  const sourceHeight = useClipEditorStore((s) => s.sourceHeight);
  const layout = useClipEditorStore((s) => s.layout);
  const currentTime = useClipEditorStore((s) => s.currentTime);
  const isTranscribing = useClipEditorStore((s) => s.isTranscribing);
  const isExporting = useClipEditorStore((s) => s.isExporting);
  const keepSegments = useClipEditorStore((s) => s.keepSegments);
  const zoomEffects = useClipEditorStore((s) => s.zoomEffects);
  const imageOverlays = useClipEditorStore((s) => s.imageOverlays);
  const textOverlays = useClipEditorStore((s) => s.textOverlays);
  const subtitleWords = useClipEditorStore((s) => s.subtitleWords);
  const subtitleStyle = useClipEditorStore((s) => s.subtitleStyle);
  const subtitleTiming = useClipEditorStore((s) => s.subtitleTiming);
  const subtitleLayout = useClipEditorStore((s) => s.subtitleLayout);
  const setSubtitleLayout = useClipEditorStore((s) => s.setSubtitleLayout);
  const previewVolume = useClipEditorStore((s) => s.previewVolume);
  const setPreviewContainerWidth = useClipEditorStore((s) => s.setPreviewContainerWidth);

  const transcribe = useTranscribeClip();

  const handlePreviewContainerSize = (size: { width: number; height: number }) => {
    if (size.width > 0) {
      setPreviewContainerWidth(size.width);
    }
  };

  const sequenceTime = useMemo(
    () => sourceTimeToSequenceTime(currentTime, keepSegments),
    [currentTime, keepSegments],
  );
  const sequenceWords = useMemo(
    () =>
      remapTimedSubtitleWordsToSequence(
        subtitleWords,
        keepSegments,
        subtitleTiming,
      ),
    [subtitleWords, keepSegments, subtitleTiming],
  );

  const activeZoomEffect = useMemo(
    () => getActiveZoomEffectAtTime(zoomEffects, currentTime),
    [zoomEffects, currentTime],
  );

  const bgVideoRegionOverride = useMemo(() => {
    if (!activeZoomEffect) return undefined;
    return getEffectiveZoomRegion(activeZoomEffect.zone);
  }, [activeZoomEffect]);

  const previewImageOverlays = useMemo(
    () => getImageOverlaysAtTime(imageOverlays, currentTime),
    [imageOverlays, currentTime],
  );

  const previewTextOverlays = useMemo(
    () => getTextOverlaysAtTime(textOverlays, currentTime),
    [textOverlays, currentTime],
  );

  const videoW = sourceWidth || 16;
  const videoH = sourceHeight || 9;
  const isBusy = isTranscribing || isExporting;

  useEffect(() => {
    if (!clipId) return;
    transcribe.mutate({ clipId, silent: true });
  }, [clipId]);

  const { bgVideoProps } = useClipVideoPlaybackSync({
    bgVideoRef,
    pipVideoRef,
    keepSegments,
    sourceUrl,
    logLabel: "subtitles",
  });

  const subtitleOverlay =
    !isTranscribing && sequenceWords.length > 0 ? (
      <ClipSubtitleOverlay
        words={sequenceWords}
        sequenceTime={sequenceTime}
        style={subtitleStyle}
        layout={subtitleLayout}
        containerRef={containerRef}
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
          {sourceUrl ? (
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
