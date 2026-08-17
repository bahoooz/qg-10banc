import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { pointerToNormalizedPoint } from "../../lib/clipLayout";
import {
  clampImageOverlayZone,
  type ImageOverlay,
  type ImageOverlayZone,
} from "../../lib/clipImageOverlays";
import { snapImageOverlayZoneMove } from "../../lib/clipOverlaySnap";
import { getFollowStickerNormalizedAspect } from "../../lib/followSticker";
import { FollowStickerOverlay } from "./FollowStickerOverlay";
import {
  CLIP_SELECTION_RING_CLASS,
  resizeNormalizedRect,
  resizeNormalizedRectUniform,
  type SelectionResizeCorner,
} from "../../lib/clipSelectionUi";
import ClipSelectionResizeHandles, {
  isSelectionResizeTarget,
} from "./ClipSelectionResizeHandles";
import PreviewCenterSnapGuides from "./PreviewCenterSnapGuides";

type ClipImageOverlayLayerProps = {
  overlays: ImageOverlay[];
  containerRef: RefObject<HTMLDivElement | null>;
  selectedOverlayId: string | null;
  interactive: boolean;
  selectable?: boolean;
  disabled?: boolean;
  onSelect?: (id: string) => void;
  onZoneChange?: (id: string, zone: ImageOverlayZone) => void;
};

type DragMode = "move" | "resize" | null;

type ResizeStart = {
  zone: ImageOverlayZone;
  clientX: number;
  clientY: number;
  corner: SelectionResizeCorner;
};

export default function ClipImageOverlayLayer({
  overlays,
  containerRef,
  selectedOverlayId,
  interactive,
  selectable = false,
  disabled = false,
  onSelect,
  onZoneChange,
}: ClipImageOverlayLayerProps) {
  const dragModeRef = useRef<DragMode>(null);
  const activeOverlayIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const moveStartZoneRef = useRef<ImageOverlayZone>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const resizeStartRef = useRef<ResizeStart>({
    zone: { x: 0, y: 0, width: 0, height: 0 },
    clientX: 0,
    clientY: 0,
    corner: "se",
  });
  const [snapGuides, setSnapGuides] = useState({
    vertical: false,
    horizontal: false,
  });

  const canInteract = interactive && !disabled && Boolean(onZoneChange);
  const canSelect = selectable && !disabled && Boolean(onSelect);

  const handleOverlayPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    overlay: ImageOverlay,
  ) => {
    if (isSelectionResizeTarget(event.target, "data-image-resize")) {
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

  const handleMovePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    overlay: ImageOverlay,
  ) => {
    if (!canInteract || !onZoneChange) return;
    if (isSelectionResizeTarget(event.target, "data-image-resize")) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = pointerToNormalizedPoint(event.clientX, event.clientY, rect);
    dragModeRef.current = "move";
    activeOverlayIdRef.current = overlay.id;
    moveStartZoneRef.current = { ...overlay.zone };
    dragOffsetRef.current = {
      x: point.x - overlay.zone.x,
      y: point.y - overlay.zone.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerDown = (
    corner: SelectionResizeCorner,
    event: ReactPointerEvent<HTMLDivElement>,
    overlay: ImageOverlay,
  ) => {
    if (!canInteract || !onZoneChange) return;

    event.stopPropagation();
    event.preventDefault();

    dragModeRef.current = "resize";
    activeOverlayIdRef.current = overlay.id;
    resizeStartRef.current = {
      zone: { ...overlay.zone },
      clientX: event.clientX,
      clientY: event.clientY,
      corner,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const mode = dragModeRef.current;
      const overlayId = activeOverlayIdRef.current;
      if (!mode || !overlayId || !onZoneChange) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (mode === "move") {
        const point = pointerToNormalizedPoint(
          event.clientX,
          event.clientY,
          rect,
        );
        const rawZone = clampImageOverlayZone({
          ...moveStartZoneRef.current,
          x: point.x - dragOffsetRef.current.x,
          y: point.y - dragOffsetRef.current.y,
        });
        const snapped = snapImageOverlayZoneMove(rawZone);
        setSnapGuides({
          vertical: snapped.snappedX,
          horizontal: snapped.snappedY,
        });
        onZoneChange(overlayId, snapped.zone);
        return;
      }

      const deltaX =
        (event.clientX - resizeStartRef.current.clientX) / rect.width;
      const deltaY =
        (event.clientY - resizeStartRef.current.clientY) / rect.height;

      const activeOverlay = overlays.find((entry) => entry.id === overlayId);
      const startZone = resizeStartRef.current.zone;
      const corner = resizeStartRef.current.corner;

      if (activeOverlay?.sticker) {
        const normalizedAspect = getFollowStickerNormalizedAspect(
          activeOverlay.sticker.username,
        );
        onZoneChange(
          overlayId,
          clampImageOverlayZone(
            resizeNormalizedRectUniform(
              startZone,
              corner,
              deltaX,
              deltaY,
              normalizedAspect,
            ),
          ),
        );
        return;
      }

      onZoneChange(
        overlayId,
        clampImageOverlayZone(
          resizeNormalizedRect(startZone, corner, deltaX, deltaY),
        ),
      );
    },
    [containerRef, onZoneChange, overlays],
  );

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragModeRef.current = null;
    activeOverlayIdRef.current = null;
    setSnapGuides({ vertical: false, horizontal: false });
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (overlays.length === 0) return null;

  const showSnapGuides =
    canInteract && (snapGuides.vertical || snapGuides.horizontal);

  return (
    <>
      {showSnapGuides && (
        <PreviewCenterSnapGuides
          showVertical={snapGuides.vertical}
          showHorizontal={snapGuides.horizontal}
        />
      )}
      {overlays.map((overlay) => {
        const isSelected = overlay.id === selectedOverlayId;
        const isEditable = canInteract && isSelected;
        const isClickable = canSelect && !isEditable;

        return (
          <div
            key={overlay.id}
            className={`absolute z-[25] ${
              isEditable || isClickable ? "touch-none" : "pointer-events-none"
            }`}
            style={{
              left: `${overlay.zone.x * 100}%`,
              top: `${overlay.zone.y * 100}%`,
              width: `${overlay.zone.width * 100}%`,
              height: `${overlay.zone.height * 100}%`,
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
            <div
              className={`relative h-full w-full overflow-visible rounded-md ${
                isEditable
                  ? `cursor-grab ${CLIP_SELECTION_RING_CLASS} active:cursor-grabbing`
                  : isClickable
                    ? "cursor-pointer ring-1 ring-transparent transition-all hover:ring-[#b8dcc8]/40"
                    : isSelected
                      ? CLIP_SELECTION_RING_CLASS
                      : ""
              }`}
            >
              {overlay.sticker ? (
                <FollowStickerOverlay
                  config={overlay.sticker}
                  zone={overlay.zone}
                  containerRef={containerRef}
                  onZoneSync={
                    onZoneChange && !overlay.zoneLocked
                      ? (nextZone) => onZoneChange(overlay.id, nextZone)
                      : undefined
                  }
                />
              ) : (
                <img
                  src={overlay.src}
                  alt={overlay.label}
                  draggable={false}
                  className="h-full w-full object-contain"
                />
              )}
            </div>

            {isEditable && (
              <ClipSelectionResizeHandles
                dataAttribute="data-image-resize"
                onResizePointerDown={(corner, event) =>
                  handleResizePointerDown(corner, event, overlay)
                }
              />
            )}
          </div>
        );
      })}
    </>
  );
}
