import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { pointerToNormalizedPoint } from "../../lib/clipLayout";
import {
  clampSubtitleScale,
  getSubtitleFontCssStyle,
  getSubtitleOuterGlowStyle,
  getSubtitlePreviewFontSizePx,
  normalizeSubtitleLayout,
  SUBTITLE_PREVIEW_REF_WIDTH,
  type SubtitleLayout,
} from "../../lib/clipSubtitles";
import {
  toSubtitleStyleForRender,
  DEFAULT_TEXT_OVERLAY_LETTER_SPACING,
  type TextOverlay,
} from "../../lib/clipTextOverlays";

type ClipTextOverlayLayerProps = {
  overlays: TextOverlay[];
  containerRef: RefObject<HTMLDivElement | null>;
  selectedOverlayId: string | null;
  interactive: boolean;
  selectable?: boolean;
  disabled?: boolean;
  onSelect?: (id: string) => void;
  onLayoutChange?: (id: string, layout: SubtitleLayout) => void;
};

type DragMode = "move" | "resize" | null;

function usePreviewContainerWidth(
  containerRef: RefObject<HTMLDivElement | null>,
): number {
  const [width, setWidth] = useState(SUBTITLE_PREVIEW_REF_WIDTH);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      const nextWidth = node.getBoundingClientRect().width;
      if (nextWidth > 0) setWidth(nextWidth);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef]);

  return width;
}

function TextOverlayContent({
  overlay,
  isEditable,
  fontSizePx,
}: {
  overlay: TextOverlay;
  isEditable: boolean;
  fontSizePx: number;
}) {
  const renderStyle = toSubtitleStyleForRender(overlay.style);
  const glowStyle = getSubtitleOuterGlowStyle(renderStyle);
  const fontStyle = getSubtitleFontCssStyle(renderStyle.fontId);
  const letterSpacingPx =
    overlay.style.letterSpacing ?? DEFAULT_TEXT_OVERLAY_LETTER_SPACING;

  const textStyle = {
    fontFamily: fontStyle.fontFamily,
    fontWeight: fontStyle.fontWeight,
    fontSize: `${fontSizePx}px`,
    letterSpacing: `${letterSpacingPx}px`,
    whiteSpace: "pre" as const,
  };

  return (
    <div
      className={`relative inline-block max-w-none text-center ${
        isEditable
          ? "cursor-grab rounded-lg ring-1 ring-violet-300/50 active:cursor-grabbing"
          : ""
      }`}
    >
      {glowStyle.visible && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 select-none px-1 uppercase leading-snug"
          style={{
            ...textStyle,
            color: glowStyle.color,
            WebkitTextFillColor: glowStyle.WebkitTextFillColor,
            WebkitTextStroke: glowStyle.WebkitTextStroke,
            paintOrder: glowStyle.paintOrder,
            opacity: glowStyle.opacity,
            filter: glowStyle.filter,
          }}
        >
          {overlay.text}
        </span>
      )}
      <span
        className="relative block px-1 uppercase leading-snug"
        style={{
          ...textStyle,
          color: renderStyle.fillColor,
          WebkitTextStroke: `${renderStyle.strokeWidth}px ${renderStyle.strokeColor}`,
          paintOrder: "stroke fill",
        }}
      >
        {overlay.text}
      </span>
    </div>
  );
}

export default function ClipTextOverlayLayer({
  overlays,
  containerRef,
  selectedOverlayId,
  interactive,
  selectable = false,
  disabled = false,
  onSelect,
  onLayoutChange,
}: ClipTextOverlayLayerProps) {
  const dragModeRef = useRef<DragMode>(null);
  const activeOverlayIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const moveStartLayoutRef = useRef<SubtitleLayout>({ x: 0.5, y: 0.75, scale: 1 });
  const resizeStartLayoutRef = useRef<SubtitleLayout>({
    x: 0.5,
    y: 0.75,
    scale: 1,
  });
  const resizeStartRef = useRef({
    scale: 1,
    clientX: 0,
    clientY: 0,
  });

  const canInteract = interactive && !disabled && Boolean(onLayoutChange);
  const canSelect = selectable && !disabled && Boolean(onSelect);
  const containerWidth = usePreviewContainerWidth(containerRef);

  const overlaysById = useMemo(
    () => new Map(overlays.map((overlay) => [overlay.id, overlay])),
    [overlays],
  );

  const handleMovePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    overlay: TextOverlay,
  ) => {
    if (!canInteract || !onLayoutChange) return;
    if ((event.target as HTMLElement).closest("[data-text-resize='true']")) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = pointerToNormalizedPoint(event.clientX, event.clientY, rect);
    const layout = normalizeSubtitleLayout(overlay.layout);
    dragModeRef.current = "move";
    activeOverlayIdRef.current = overlay.id;
    moveStartLayoutRef.current = layout;
    dragOffsetRef.current = {
      x: point.x - layout.x,
      y: point.y - layout.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    overlay: TextOverlay,
  ) => {
    if (!canInteract || !onLayoutChange) return;

    event.stopPropagation();
    event.preventDefault();

    const layout = normalizeSubtitleLayout(overlay.layout);
    dragModeRef.current = "resize";
    activeOverlayIdRef.current = overlay.id;
    resizeStartLayoutRef.current = layout;
    resizeStartRef.current = {
      scale: layout.scale,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleOverlayPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    overlay: TextOverlay,
  ) => {
    if ((event.target as HTMLElement).closest("[data-text-resize='true']")) {
      return;
    }

    event.stopPropagation();

    const isSelected = overlay.id === selectedOverlayId;

    if (!isSelected) {
      if (canSelect && onSelect) {
        onSelect(overlay.id);
      }
      return;
    }

    if (canInteract) {
      handleMovePointerDown(event, overlay);
    }
  };

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const mode = dragModeRef.current;
      const overlayId = activeOverlayIdRef.current;
      if (!mode || !overlayId || !onLayoutChange) return;

      const overlay = overlaysById.get(overlayId);
      if (!overlay) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (mode === "move") {
        const point = pointerToNormalizedPoint(
          event.clientX,
          event.clientY,
          rect,
        );
        onLayoutChange(
          overlayId,
          normalizeSubtitleLayout({
            ...moveStartLayoutRef.current,
            x: Math.max(0, Math.min(1, point.x - dragOffsetRef.current.x)),
            y: Math.max(0, Math.min(1, point.y - dragOffsetRef.current.y)),
          }),
        );
        return;
      }

      const deltaX = event.clientX - resizeStartRef.current.clientX;
      const deltaY = event.clientY - resizeStartRef.current.clientY;
      const delta = Math.max(deltaX, deltaY);
      const scaleDelta = delta / Math.max(rect.width, 1);
      onLayoutChange(
        overlayId,
        normalizeSubtitleLayout({
          ...resizeStartLayoutRef.current,
          scale: clampSubtitleScale(
            resizeStartRef.current.scale + scaleDelta * 2,
          ),
        }),
      );
    },
    [containerRef, onLayoutChange, overlaysById],
  );

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragModeRef.current = null;
    activeOverlayIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (overlays.length === 0) return null;

  return (
    <>
      {overlays.map((overlay) => {
        const layout = normalizeSubtitleLayout(overlay.layout);
        const fontSizePx = getSubtitlePreviewFontSizePx(containerWidth, layout.scale);
        const isSelected = overlay.id === selectedOverlayId;
        const isEditable = canInteract && isSelected;
        const isClickable = canSelect && !isEditable;

        return (
          <div
            key={overlay.id}
            className={`absolute z-[26] max-w-[92%] ${
              isEditable || isClickable ? "touch-none" : "pointer-events-none"
            }`}
            style={{
              left: `${layout.x * 100}%`,
              top: `${layout.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
            onPointerDown={
              isEditable || isClickable
                ? (event) => handleOverlayPointerDown(event, overlay)
                : undefined
            }
            onPointerMove={isEditable ? handlePointerMove : undefined}
            onPointerUp={isEditable ? handlePointerUp : undefined}
            onPointerCancel={isEditable ? handlePointerUp : undefined}
          >
            <div className="relative inline-block">
              <TextOverlayContent
                overlay={overlay}
                isEditable={isEditable}
                fontSizePx={fontSizePx}
              />

              {isEditable && (
                <div
                  role="presentation"
                  data-text-resize="true"
                  onPointerDown={(event) =>
                    handleResizePointerDown(event, overlay)
                  }
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="absolute -bottom-2 -right-2 z-20 size-4 cursor-nwse-resize rounded-sm border-2 border-background bg-violet-300 shadow-md"
                  aria-label="Redimensionner le texte"
                />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
