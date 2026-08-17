import {
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useState,
} from "react";
import {
  camZoneToVideoRegion,
  getCamShapeClass,
  getVerticalCropRegion,
  getVideoRegionStyle,
  type ClipLayoutState,
  type NormalizedRegion,
} from "../../lib/clipLayout";
import { CLIP_SELECTION_FRAME_CLASS } from "../../lib/clipSelectionUi";
import type { SelectionResizeCorner } from "../../lib/clipSelectionUi";
import ClipSelectionResizeHandles from "./ClipSelectionResizeHandles";

export function useVerticalPreviewLayout(
  containerRef: RefObject<HTMLDivElement | null>,
  layout: ClipLayoutState,
  videoWidth: number,
  videoHeight: number,
) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef]);

  const cropRegion = getVerticalCropRegion(
    videoWidth,
    videoHeight,
    layout.verticalCropPan,
  );
  const bgVideoStyle = getVideoRegionStyle(cropRegion);
  const pipVideoStyle = getVideoRegionStyle(
    camZoneToVideoRegion(layout.sourceCam),
  );
  const shapeClass = getCamShapeClass(layout.camShape);

  const pipWidthPx = layout.verticalCamZone.width * containerSize.width;
  const pipHeightPx = layout.verticalCamZone.height * containerSize.height;
  const pipLeftPx =
    layout.verticalCam.x * containerSize.width - pipWidthPx / 2;
  const pipTopPx =
    layout.verticalCam.y * containerSize.height - pipHeightPx / 2;

  return {
    containerSize,
    bgVideoStyle,
    pipVideoStyle,
    shapeClass,
    pipWidthPx,
    pipHeightPx,
    pipLeftPx,
    pipTopPx,
  };
}

type ClipEditorVerticalPreviewProps = {
  sourceUrl: string;
  videoWidth: number;
  videoHeight: number;
  layout: ClipLayoutState;
  containerRef: RefObject<HTMLDivElement | null>;
  bgVideoRef: RefObject<HTMLVideoElement | null>;
  pipVideoRef: RefObject<HTMLVideoElement | null>;
  /** Force le rechargement vidéo quand l'instance timeline change (ex. même meme ×2). */
  bgVideoKey?: string;
  className?: string;
  showCropSnapGuide?: boolean;
  showPanHint?: boolean;
  pipInteractive?: boolean;
  onContainerPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPipMovePointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPipResizePointerDown?: (
    corner: SelectionResizeCorner,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  bgVideoProps?: ComponentPropsWithoutRef<"video">;
  pipVideoProps?: ComponentPropsWithoutRef<"video">;
  onContainerSizeChange?: (size: { width: number; height: number }) => void;
  overlay?: ReactNode;
  /** Volume preview 0–1 (n'affecte pas l'export). */
  volume?: number;
  showAspectBadge?: boolean;
  /** Remplace le crop layout pour le fond (ex. zoom montage). */
  bgVideoRegionOverride?: NormalizedRegion;
};

export default function ClipEditorVerticalPreview({
  sourceUrl,
  videoWidth,
  videoHeight,
  layout,
  containerRef,
  bgVideoRef,
  pipVideoRef,
  className = "relative mx-auto aspect-[9/16] h-full max-h-[min(58vh,640px)] w-auto overflow-hidden rounded-2xl border border-secondary-color/60 bg-black shadow-[0_0_60px_rgba(205,183,255,0.08)]",
  showCropSnapGuide = false,
  showPanHint = false,
  pipInteractive = false,
  onContainerPointerDown,
  onPipMovePointerDown,
  onPipResizePointerDown,
  bgVideoProps,
  pipVideoProps,
  onContainerSizeChange,
  overlay,
  volume = 0.5,
  showAspectBadge = true,
  bgVideoRegionOverride,
  bgVideoKey,
}: ClipEditorVerticalPreviewProps) {
  const clampedVolume = Math.max(0, Math.min(1, volume));

  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video) return;
    video.volume = clampedVolume;
    video.muted = clampedVolume <= 0;
  }, [bgVideoRef, clampedVolume]);
  const {
    containerSize,
    bgVideoStyle: defaultBgVideoStyle,
    pipVideoStyle,
    shapeClass,
    pipWidthPx,
    pipHeightPx,
    pipLeftPx,
    pipTopPx,
  } = useVerticalPreviewLayout(containerRef, layout, videoWidth, videoHeight);

  const bgVideoStyle = bgVideoRegionOverride
    ? getVideoRegionStyle(bgVideoRegionOverride)
    : defaultBgVideoStyle;

  const showPip = !bgVideoRegionOverride;

  useEffect(() => {
    if (containerSize.width > 0 || containerSize.height > 0) {
      onContainerSizeChange?.(containerSize);
    }
  }, [containerSize, onContainerSizeChange]);

  useEffect(() => {
    if (!showPip) return;

    const bgVideo = bgVideoRef.current;
    const pipVideo = pipVideoRef.current;
    if (!bgVideo || !pipVideo) return;

    if (Math.abs(pipVideo.currentTime - bgVideo.currentTime) > 0.05) {
      pipVideo.currentTime = bgVideo.currentTime;
    }

    if (!bgVideo.paused && pipVideo.paused) {
      void pipVideo.play().catch(() => undefined);
    }
  }, [showPip, bgVideoRef, pipVideoRef]);

  return (
    <div
      ref={containerRef}
      onPointerDown={onContainerPointerDown}
      className={`${className}${onContainerPointerDown ? " cursor-ew-resize touch-none" : ""}`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <video
          key={bgVideoKey}
          ref={bgVideoRef}
          src={sourceUrl}
          playsInline
          muted={clampedVolume <= 0}
          preload="auto"
          className="absolute left-0 top-0 max-w-none"
          style={bgVideoStyle}
          {...bgVideoProps}
        />
      </div>

      {showCropSnapGuide && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[5] w-0.5 -translate-x-1/2 bg-main-color shadow-[0_0_8px_rgba(205,183,255,0.8)]" />
      )}

      <div
        data-pip="true"
        aria-hidden={!showPip}
        className={`absolute z-10 ${pipInteractive ? "touch-none" : "pointer-events-none"} ${
          showPip ? "" : "invisible pointer-events-none"
        }`}
        style={{
          left: pipLeftPx,
          top: pipTopPx,
          width: pipWidthPx,
          height: pipHeightPx,
        }}
      >
        <div
          role={pipInteractive ? "presentation" : undefined}
          onPointerDown={onPipMovePointerDown}
          className={`absolute inset-0 overflow-hidden shadow-lg ${CLIP_SELECTION_FRAME_CLASS} ${shapeClass} ${
            pipInteractive ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          <video
            ref={pipVideoRef}
            src={sourceUrl}
            playsInline
            muted
            className="pointer-events-none absolute left-0 top-0 max-w-none"
            style={pipVideoStyle}
            {...pipVideoProps}
          />
        </div>
        {pipInteractive && onPipResizePointerDown && (
          <ClipSelectionResizeHandles
            dataAttribute="data-pip-resize"
            onResizePointerDown={onPipResizePointerDown}
          />
        )}
      </div>

      {overlay}

      {showPanHint && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded-lg bg-background/80 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white/50 backdrop-blur-sm">
            ← Glisser · snap au centre →
          </span>
        </div>
      )}

      {showAspectBadge && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-background/80 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-main-color backdrop-blur-sm">
          9:16
        </div>
      )}
    </div>
  );
}
