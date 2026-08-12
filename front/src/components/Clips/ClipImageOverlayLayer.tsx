import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { pointerToNormalizedPoint } from "../../lib/clipLayout";
import {
  clampImageOverlayZone,
  type ImageOverlay,
  type ImageOverlayZone,
} from "../../lib/clipImageOverlays";

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
  });

  const canInteract = interactive && !disabled && Boolean(onZoneChange);
  const canSelect = selectable && !disabled && Boolean(onSelect);

  const handleOverlayPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    overlay: ImageOverlay,
  ) => {
    if ((event.target as HTMLElement).closest("[data-image-resize='true']")) {
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
    if ((event.target as HTMLElement).closest("[data-image-resize='true']")) {
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
        onZoneChange(
          overlayId,
          clampImageOverlayZone({
            ...moveStartZoneRef.current,
            x: point.x - dragOffsetRef.current.x,
            y: point.y - dragOffsetRef.current.y,
          }),
        );
        return;
      }

      const deltaX =
        (event.clientX - resizeStartRef.current.clientX) / rect.width;
      const deltaY =
        (event.clientY - resizeStartRef.current.clientY) / rect.height;
      const delta = Math.max(deltaX, deltaY);

      onZoneChange(
        overlayId,
        clampImageOverlayZone({
          ...resizeStartRef.current.zone,
          width: resizeStartRef.current.zone.width + delta,
          height: resizeStartRef.current.zone.height + delta,
        }),
      );
    },
    [containerRef, onZoneChange],
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
              className={`relative h-full w-full overflow-hidden rounded-md ${
                isEditable
                  ? "cursor-grab ring-2 ring-cyan-300/70 active:cursor-grabbing"
                  : isClickable
                    ? "cursor-pointer ring-1 ring-transparent transition-all hover:ring-cyan-300/40"
                    : isSelected
                      ? "ring-2 ring-cyan-300/50"
                      : ""
              }`}
            >
              <img
                src={overlay.src}
                alt={overlay.label}
                draggable={false}
                className="h-full w-full object-contain"
              />
            </div>

            {isEditable && (
              <div
                role="presentation"
                data-image-resize="true"
                onPointerDown={(event) =>
                  handleResizePointerDown(event, overlay)
                }
                className="absolute -bottom-1.5 -right-1.5 z-30 size-4 cursor-nwse-resize rounded-sm border-2 border-background bg-cyan-300 shadow-md"
                aria-label="Redimensionner l'image"
              />
            )}
          </div>
        );
      })}
    </>
  );
}
