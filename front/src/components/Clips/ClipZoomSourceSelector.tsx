import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getVideoContentRect,
  pixelsToCamZone,
  camZoneToPixels,
} from "../../lib/clipLayout";
import type { CamZone } from "../../lib/clipLayout";
import { clampZoomZone, type ZoomEffectZone } from "../../lib/clipZoomEffects";
import {
  CLIP_SELECTION_FRAME_CLASS,
  getOutwardResizeDelta,
  resizePixelRect,
  type SelectionResizeCorner,
} from "../../lib/clipSelectionUi";
import ClipSelectionResizeHandles, {
  isSelectionResizeTarget,
} from "./ClipSelectionResizeHandles";

type ClipZoomSourceSelectorProps = {
  sourceUrl: string;
  videoWidth: number;
  videoHeight: number;
  zone: ZoomEffectZone;
  currentTime: number;
  onZoneChange: (zone: ZoomEffectZone) => void;
  embedded?: boolean;
};

type DragMode = "move" | "resize" | null;

const PORTRAIT_ASPECT = 9 / 16;

export default function ClipZoomSourceSelector({
  sourceUrl,
  videoWidth,
  videoHeight,
  zone,
  currentTime,
  onZoneChange,
  embedded = false,
}: ClipZoomSourceSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragModeRef = useRef<DragMode>(null);
  const resizeCornerRef = useRef<SelectionResizeCorner>("se");
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({
    x: 0,
    y: 0,
    widthPx: 0,
    heightPx: 0,
    clientX: 0,
    clientY: 0,
  });

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const contentRect = getVideoContentRect(
    containerSize.width,
    containerSize.height,
    videoWidth,
    videoHeight,
  );

  const zonePx = camZoneToPixels(zone, contentRect);

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
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - currentTime) > 0.08) {
      video.currentTime = currentTime;
    }
  }, [currentTime]);

  const applyZone = useCallback(
    (nextZone: CamZone) => {
      onZoneChange(clampZoomZone(nextZone, videoWidth, videoHeight));
    },
    [onZoneChange, videoHeight, videoWidth],
  );

  const handleMovePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isSelectionResizeTarget(event.target)) return;

    event.stopPropagation();
    event.preventDefault();
    dragModeRef.current = "move";
    dragOffsetRef.current = {
      x: event.clientX - zonePx.x,
      y: event.clientY - zonePx.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerDown = (
    corner: SelectionResizeCorner,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    dragModeRef.current = "resize";
    resizeCornerRef.current = corner;
    resizeStartRef.current = {
      x: zonePx.x,
      y: zonePx.y,
      widthPx: zonePx.width,
      heightPx: zonePx.height,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const mode = dragModeRef.current;
    if (!mode) return;

    if (mode === "move") {
      applyZone(
        pixelsToCamZone(
          event.clientX - dragOffsetRef.current.x,
          event.clientY - dragOffsetRef.current.y,
          zonePx.width,
          zonePx.height,
          contentRect,
        ),
      );
      return;
    }

    const deltaX = event.clientX - resizeStartRef.current.clientX;
    const deltaY = event.clientY - resizeStartRef.current.clientY;
    const corner = resizeCornerRef.current;
    const start = resizeStartRef.current;

    if (corner === "se") {
      const delta = getOutwardResizeDelta(corner, deltaX, deltaY);
      const newWidthPx = Math.max(24, start.widthPx + delta);
      const newHeightPx = newWidthPx / PORTRAIT_ASPECT;
      applyZone(
        pixelsToCamZone(start.x, start.y, newWidthPx, newHeightPx, contentRect),
      );
      return;
    }

    const nextRect = resizePixelRect(
      {
        x: start.x,
        y: start.y,
        width: start.widthPx,
        height: start.heightPx,
      },
      corner,
      deltaX,
      deltaY,
    );
    const widthFromHeight = nextRect.height * PORTRAIT_ASPECT;
    const heightFromWidth = nextRect.width / PORTRAIT_ASPECT;
    const useWidthLead = Math.abs(deltaX) >= Math.abs(deltaY);
    const finalWidth = useWidthLead ? nextRect.width : widthFromHeight;
    const finalHeight = useWidthLead ? heightFromWidth : nextRect.height;

    applyZone(
      pixelsToCamZone(
        nextRect.x,
        nextRect.y,
        Math.max(24, finalWidth),
        Math.max(24, finalHeight),
        contentRect,
      ),
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragModeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const selector = (
    <div
      ref={containerRef}
      className={`relative aspect-video w-full overflow-hidden rounded-2xl border border-secondary-color/60 bg-black ${
        embedded ? "" : "lg:max-w-none"
      }`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <video
        ref={videoRef}
        src={sourceUrl}
        playsInline
        muted
        className="size-full object-contain"
      />

      {contentRect.width > 0 && (
        <div
          className="absolute z-10 touch-none"
          style={{
            left: zonePx.x,
            top: zonePx.y,
            width: zonePx.width,
            height: zonePx.height,
          }}
        >
          <div
            role="presentation"
            onPointerDown={handleMovePointerDown}
            className={`absolute inset-0 cursor-grab overflow-hidden rounded-lg ${CLIP_SELECTION_FRAME_CLASS} active:cursor-grabbing`}
          >
            <span className="absolute -top-6 left-0 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#b8dcc8]">
              9:16
            </span>
          </div>
          <ClipSelectionResizeHandles onResizePointerDown={handleResizePointerDown} />
        </div>
      )}
    </div>
  );

  if (embedded) {
    return selector;
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[min(42%,420px)]">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-main-color">
          Zone de zoom 9:16
        </p>
        <p className="text-sm text-white/40">
          Plus la zone est petite, plus le zoom est fort
        </p>
      </div>
      {selector}
    </div>
  );
}
