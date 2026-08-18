import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Pause, Play, ArrowRight } from "lucide-react";
import ClipEditorLayoutTopbar from "./ClipEditorLayoutTopbar";
import ClipEditorVerticalPreview from "./ClipEditorVerticalPreview";
import {
  camZoneToPixels,
  clampSourceCamZone,
  clampVerticalCamPoint,
  clampVerticalCamZone,
  getCamShapeClass,
  getVideoContentRect,
  isNearCropPanCenter,
  panFromContainerRatio,
  pixelsToCamZone,
  pointerToNormalizedPoint,
  snapCropPanToCenter,
  squareHeightFraction,
  type CamZone,
} from "../../lib/clipLayout";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import {
  CLIP_SELECTION_FRAME_CLASS,
  getOutwardResizeDelta,
  resizePixelRect,
  type SelectionResizeCorner,
} from "../../lib/clipSelectionUi";
import ClipSelectionResizeHandles, {
  isSelectionResizeTarget,
} from "./ClipSelectionResizeHandles";

type DragMode =
  | "source-cam-move"
  | "source-cam-resize"
  | "vertical-cam-move"
  | "vertical-cam-resize"
  | "vertical-pan"
  | null;

const PREVIEW_ASPECT = 9 / 16;

export default function ClipEditorLayoutView() {
  const sourceContainerRef = useRef<HTMLDivElement>(null);
  const verticalContainerRef = useRef<HTMLDivElement>(null);
  const layoutRootRef = useRef<HTMLDivElement>(null);
  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const verticalBgVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);

  const sourceUrl = useClipEditorStore((s) => s.sourceUrl);
  const sourceWidth = useClipEditorStore((s) => s.sourceWidth);
  const sourceHeight = useClipEditorStore((s) => s.sourceHeight);
  const isPlaying = useClipEditorStore((s) => s.isPlaying);
  const layout = useClipEditorStore((s) => s.layout);
  const setIsPlaying = useClipEditorStore((s) => s.setIsPlaying);
  const setSourceCam = useClipEditorStore((s) => s.setSourceCam);
  const setVerticalCam = useClipEditorStore((s) => s.setVerticalCam);
  const setVerticalCamLayout = useClipEditorStore((s) => s.setVerticalCamLayout);
  const setVerticalCropPan = useClipEditorStore((s) => s.setVerticalCropPan);
  const setEditorStep = useClipEditorStore((s) => s.setEditorStep);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showCropSnapGuide, setShowCropSnapGuide] = useState(false);

  const dragModeRef = useRef<DragMode>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const sourceResizeStartRef = useRef({
    x: 0,
    y: 0,
    widthPx: 0,
    heightPx: 0,
    clientX: 0,
    clientY: 0,
    corner: "se" as SelectionResizeCorner,
  });
  const pipResizeStartRef = useRef({
    pipLeftPx: 0,
    pipTopPx: 0,
    widthPx: 0,
    heightPx: 0,
    containerWidth: 0,
    containerHeight: 0,
    clientX: 0,
    clientY: 0,
    corner: "se" as SelectionResizeCorner,
  });

  const videoW = sourceWidth || 16;
  const videoH = sourceHeight || 9;
  const videoAspect = videoW / videoH;
  const shapeClass = getCamShapeClass(layout.camShape);
  const isFreeShape = layout.camShape === "free";

  const contentRect = getVideoContentRect(
    containerSize.width,
    containerSize.height,
    videoW,
    videoH,
  );

  const sourceCamPx = camZoneToPixels(layout.sourceCam, contentRect);

  useEffect(() => {
    const node = sourceContainerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sourceVideo = sourceVideoRef.current;
    const bgVideo = verticalBgVideoRef.current;
    const pipVideo = pipVideoRef.current;
    if (!sourceVideo) return;

    const syncSiblings = () => {
      if (bgVideo && Math.abs(bgVideo.currentTime - sourceVideo.currentTime) > 0.05) {
        bgVideo.currentTime = sourceVideo.currentTime;
      }
      if (pipVideo && Math.abs(pipVideo.currentTime - sourceVideo.currentTime) > 0.05) {
        pipVideo.currentTime = sourceVideo.currentTime;
      }
    };

    sourceVideo.addEventListener("timeupdate", syncSiblings);
    return () => sourceVideo.removeEventListener("timeupdate", syncSiblings);
  }, [sourceUrl]);

  useEffect(() => {
    const sourceVideo = sourceVideoRef.current;
    const bgVideo = verticalBgVideoRef.current;
    const pipVideo = pipVideoRef.current;
    if (!sourceVideo) return;

    if (isPlaying) {
      void sourceVideo.play().catch(() => setIsPlaying(false));
      void bgVideo?.play().catch(() => undefined);
      void pipVideo?.play().catch(() => undefined);
    } else {
      sourceVideo.pause();
      bgVideo?.pause();
      pipVideo?.pause();
    }
  }, [isPlaying, setIsPlaying, sourceUrl]);

  const applySourceCam = useCallback(
    (zone: Parameters<typeof clampSourceCamZone>[0]) => {
      setSourceCam(clampSourceCamZone(zone, videoW, videoH, layout.camShape));
    },
    [layout.camShape, setSourceCam, videoW, videoH],
  );

  const applyVerticalCamLayout = useCallback(
    (
      verticalCam: Parameters<typeof clampVerticalCamPoint>[0],
      zone: CamZone,
      options?: { clampCenter?: boolean },
    ) => {
      const clampedZone = clampVerticalCamZone(
        zone,
        layout.camShape,
        PREVIEW_ASPECT,
      );
      setVerticalCamLayout({
        verticalCam:
          options?.clampCenter === false
            ? verticalCam
            : clampVerticalCamPoint(
                verticalCam,
                clampedZone.width / 2,
                clampedZone.height / 2,
              ),
        verticalCamZone: clampedZone,
      });
    },
    [layout.camShape, setVerticalCamLayout],
  );

  const handleSourceCamMoveDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isSelectionResizeTarget(event.target, "data-source-cam-resize")) return;

    event.stopPropagation();
    event.preventDefault();
    dragModeRef.current = "source-cam-move";
    dragOffsetRef.current = {
      x: event.clientX - sourceCamPx.x,
      y: event.clientY - sourceCamPx.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSourceCamResizeDown = (
    corner: SelectionResizeCorner,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    dragModeRef.current = "source-cam-resize";
    sourceResizeStartRef.current = {
      x: sourceCamPx.x,
      y: sourceCamPx.y,
      widthPx: sourceCamPx.width,
      heightPx: sourceCamPx.height,
      clientX: event.clientX,
      clientY: event.clientY,
      corner,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleVerticalCamMoveDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isSelectionResizeTarget(event.target, "data-pip-resize")) return;

    event.stopPropagation();
    event.preventDefault();
    dragModeRef.current = "vertical-cam-move";
    const rect = verticalContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = pointerToNormalizedPoint(event.clientX, event.clientY, rect);
    dragOffsetRef.current = {
      x: point.x - layout.verticalCam.x,
      y: point.y - layout.verticalCam.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleVerticalCamResizeDown = (
    corner: SelectionResizeCorner,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    dragModeRef.current = "vertical-cam-resize";

    const container = verticalContainerRef.current?.getBoundingClientRect();
    const pipEl = verticalContainerRef.current?.querySelector(
      '[data-pip="true"]',
    ) as HTMLElement | null;
    const pipRect = pipEl?.getBoundingClientRect();

    if (!container || container.width <= 0 || container.height <= 0 || !pipRect) {
      return;
    }

    pipResizeStartRef.current = {
      pipLeftPx: pipRect.left - container.left,
      pipTopPx: pipRect.top - container.top,
      widthPx: pipRect.width,
      heightPx: pipRect.height,
      containerWidth: container.width,
      containerHeight: container.height,
      clientX: event.clientX,
      clientY: event.clientY,
      corner,
    };
    layoutRootRef.current?.setPointerCapture(event.pointerId);
  };

  const handleVerticalPanDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-pip='true']")) return;
    event.preventDefault();
    dragModeRef.current = "vertical-pan";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const mode = dragModeRef.current;
      if (!mode) return;

      if (mode === "source-cam-move") {
        applySourceCam(
          pixelsToCamZone(
            event.clientX - dragOffsetRef.current.x,
            event.clientY - dragOffsetRef.current.y,
            sourceCamPx.width,
            sourceCamPx.height,
            contentRect,
          ),
        );
        return;
      }

      if (mode === "source-cam-resize") {
        const deltaX = event.clientX - sourceResizeStartRef.current.clientX;
        const deltaY = event.clientY - sourceResizeStartRef.current.clientY;
        const start = sourceResizeStartRef.current;

        if (isFreeShape) {
          const nextRect = resizePixelRect(
            {
              x: start.x,
              y: start.y,
              width: start.widthPx,
              height: start.heightPx,
            },
            start.corner,
            deltaX,
            deltaY,
          );
          applySourceCam(
            pixelsToCamZone(
              nextRect.x,
              nextRect.y,
              nextRect.width,
              nextRect.height,
              contentRect,
            ),
          );
        } else {
          const delta = getOutwardResizeDelta(start.corner, deltaX, deltaY);
          const newWidthPx = Math.max(24, start.widthPx + delta);
          applySourceCam(
            pixelsToCamZone(
              start.corner.includes("e") ? start.x : start.x + (start.widthPx - newWidthPx),
              start.corner.includes("s") ? start.y : start.y + (start.heightPx - newWidthPx * videoAspect),
              newWidthPx,
              newWidthPx * videoAspect,
              contentRect,
            ),
          );
        }
        return;
      }

      if (mode === "vertical-cam-move") {
        const rect = verticalContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const point = pointerToNormalizedPoint(event.clientX, event.clientY, rect);
        setVerticalCam(
          clampVerticalCamPoint(
            {
              x: point.x - dragOffsetRef.current.x,
              y: point.y - dragOffsetRef.current.y,
            },
            layout.verticalCamZone.width / 2,
            layout.verticalCamZone.height / 2,
          ),
        );
        return;
      }

      if (mode === "vertical-cam-resize") {
        const deltaX = event.clientX - pipResizeStartRef.current.clientX;
        const deltaY = event.clientY - pipResizeStartRef.current.clientY;
        const start = pipResizeStartRef.current;
        const containerWidth = Math.max(start.containerWidth, 1);
        const containerHeight = Math.max(start.containerHeight, 1);

        if (isFreeShape) {
          const nextRect = resizePixelRect(
            {
              x: start.pipLeftPx,
              y: start.pipTopPx,
              width: start.widthPx,
              height: start.heightPx,
            },
            start.corner,
            deltaX,
            deltaY,
            32,
          );
          applyVerticalCamLayout(
            {
              x: (nextRect.x + nextRect.width / 2) / containerWidth,
              y: (nextRect.y + nextRect.height / 2) / containerHeight,
            },
            {
              x: 0,
              y: 0,
              width: nextRect.width / containerWidth,
              height: nextRect.height / containerHeight,
            },
            { clampCenter: false },
          );
        } else {
          const delta = getOutwardResizeDelta(start.corner, deltaX, deltaY);
          const newWidthPx = Math.max(32, start.widthPx + delta);
          const newHeightPx = newWidthPx;
          const nextLeft = start.corner.includes("e")
            ? start.pipLeftPx
            : start.pipLeftPx + (start.widthPx - newWidthPx);
          const nextTop = start.corner.includes("s")
            ? start.pipTopPx
            : start.pipTopPx + (start.heightPx - newHeightPx);
          const widthFraction = newWidthPx / containerWidth;
          const heightFraction = squareHeightFraction(
            widthFraction,
            PREVIEW_ASPECT,
          );

          applyVerticalCamLayout(
            {
              x: (nextLeft + newWidthPx / 2) / containerWidth,
              y: (nextTop + newHeightPx / 2) / containerHeight,
            },
            { x: 0, y: 0, width: widthFraction, height: heightFraction },
            { clampCenter: false },
          );
        }
        return;
      }

      if (mode === "vertical-pan") {
        const rect = verticalContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const ratio = (event.clientX - rect.left) / rect.width;
        const rawPan = panFromContainerRatio(ratio, videoW, videoH);
        const { pan, snapped } = snapCropPanToCenter(rawPan);
        setShowCropSnapGuide(snapped || isNearCropPanCenter(pan));
        setVerticalCropPan(pan);
      }
    },
    [
      applySourceCam,
      applyVerticalCamLayout,
      contentRect,
      isFreeShape,
      layout.verticalCamZone.height,
      layout.verticalCamZone.width,
      setVerticalCam,
      setVerticalCropPan,
      videoAspect,
      videoW,
      videoH,
    ],
  );

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const wasPipResize = dragModeRef.current === "vertical-cam-resize";
    dragModeRef.current = null;
    setShowCropSnapGuide(false);
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (wasPipResize) {
      const { layout: currentLayout } = useClipEditorStore.getState();
      const zone = clampVerticalCamZone(
        currentLayout.verticalCamZone,
        currentLayout.camShape,
        PREVIEW_ASPECT,
      );
      setVerticalCamLayout({
        verticalCam: clampVerticalCamPoint(
          currentLayout.verticalCam,
          zone.width / 2,
          zone.height / 2,
        ),
        verticalCamZone: zone,
      });
    }
  };

  if (!sourceUrl) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/40">
        Source vidéo indisponible
      </div>
    );
  }

  return (
    <div
      ref={layoutRootRef}
      className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:p-5"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <ClipEditorLayoutTopbar />

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex w-full shrink-0 flex-col lg:max-w-[min(100%,1150px)]">
          <div
            ref={sourceContainerRef}
            className="relative aspect-video w-full overflow-hidden rounded-2xl border border-secondary-color/60 bg-black"
          >
          <video
            ref={sourceVideoRef}
            src={sourceUrl}
            playsInline
            muted
            className="size-full object-contain"
          />

          {contentRect.width > 0 && (
            <div
              className="absolute z-10 touch-none"
              style={{
                left: sourceCamPx.x,
                top: sourceCamPx.y,
                width: sourceCamPx.width,
                height: sourceCamPx.height,
              }}
            >
              <div
                role="presentation"
                onPointerDown={handleSourceCamMoveDown}
                className={`absolute inset-0 cursor-grab overflow-hidden active:cursor-grabbing ${CLIP_SELECTION_FRAME_CLASS} ${shapeClass}`}
              >
                <span className="absolute -top-6 left-0 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#b8dcc8]">
                  Cam
                </span>
              </div>
              <ClipSelectionResizeHandles
                dataAttribute="data-source-cam-resize"
                onResizePointerDown={handleSourceCamResizeDown}
              />
            </div>
          )}
          </div>
        </div>

        <div className="flex min-h-0 w-full shrink-0 flex-col gap-3 lg:w-[min(38%,320px)]">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-main-color">
            Preview verticale
          </p>
          <p className="text-sm text-white/40">
            Glisse le fond · déplace ou redimensionne la cam
          </p>
        </div>

        <ClipEditorVerticalPreview
          sourceUrl={sourceUrl}
          videoWidth={videoW}
          videoHeight={videoH}
          layout={layout}
          containerRef={verticalContainerRef}
          bgVideoRef={verticalBgVideoRef}
          pipVideoRef={pipVideoRef}
          showCropSnapGuide={showCropSnapGuide}
          showPanHint
          pipInteractive
          onContainerPointerDown={handleVerticalPanDown}
          onPipMovePointerDown={handleVerticalCamMoveDown}
          onPipResizePointerDown={handleVerticalCamResizeDown}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex flex-[1] items-center justify-center rounded-xl border border-secondary-color/60 bg-background py-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
            aria-label={isPlaying ? "Pause" : "Lecture"}
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-main-color text-background">
              {isPlaying ? (
                <Pause className="size-4" />
              ) : (
                <Play className="ml-0.5 size-4" />
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setEditorStep("montage")}
            className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-main-color px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-background transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Passer au montage
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
