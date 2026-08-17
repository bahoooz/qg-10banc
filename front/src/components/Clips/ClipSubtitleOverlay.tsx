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
import { getVisibleWordsAtSequenceTime } from "@qg/subtitle-composition";
import {
  clampSubtitleScale,
  getSubtitleFontCssStyle,
  getSubtitleOuterGlowStyle,
  getSubtitlePreviewFontSizePx,
  normalizeSubtitleLayout,
  snapSubtitleLayoutX,
  snapSubtitleLayoutY,
  SUBTITLE_PREVIEW_REF_WIDTH,
  type SequenceSubtitleWord,
  type SubtitleAnimation,
  type SubtitleLayout,
  type SubtitleStyle,
} from "../../lib/clipSubtitles";
import {
  CLIP_SELECTION_RING_CLASS,
  getOutwardResizeDelta,
  type SelectionResizeCorner,
} from "../../lib/clipSelectionUi";
import ClipSelectionResizeHandles, {
  isSelectionResizeTarget,
} from "./ClipSelectionResizeHandles";
import PreviewCenterSnapGuides from "./PreviewCenterSnapGuides";

type ClipSubtitleOverlayProps = {
  words: SequenceSubtitleWord[];
  sequenceTime: number;
  style: SubtitleStyle;
  layout: SubtitleLayout;
  containerRef: RefObject<HTMLDivElement | null>;
  interactive?: boolean;
  disabled?: boolean;
  onLayoutChange?: (layout: SubtitleLayout) => void;
};

type DragMode = "move" | "resize" | null;

const ANIMATION_CLASS: Record<SubtitleAnimation, string> = {
  pop: "animate-subtitle-pop",
  bounce: "animate-subtitle-bounce",
  fade: "animate-subtitle-fade",
  scale: "animate-subtitle-scale",
};

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

function SubtitleWordChip({
  word,
  style,
  isActive,
  fontSizePx,
}: {
  word: SequenceSubtitleWord;
  style: SubtitleStyle;
  isActive: boolean;
  fontSizePx: number;
}) {
  const glowStyle = getSubtitleOuterGlowStyle(style);
  const fontStyle = getSubtitleFontCssStyle(style.fontId);

  return (
    <span className="relative inline-block px-1">
      {glowStyle.visible && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 inline-block select-none px-1 uppercase leading-none tracking-wide"
          style={{
            fontFamily: fontStyle.fontFamily,
            fontWeight: fontStyle.fontWeight,
            fontSize: `${fontSizePx}px`,
            color: glowStyle.color,
            WebkitTextFillColor: glowStyle.WebkitTextFillColor,
            WebkitTextStroke: glowStyle.WebkitTextStroke,
            paintOrder: glowStyle.paintOrder,
            opacity: glowStyle.opacity,
            filter: glowStyle.filter,
          }}
        >
          {word.text}
        </span>
      )}
      <span
        className={`relative inline-block px-1 uppercase leading-none tracking-wide ${
          isActive ? ANIMATION_CLASS[style.animation] : "opacity-90"
        }`}
        style={{
          fontFamily: fontStyle.fontFamily,
          fontWeight: fontStyle.fontWeight,
          fontSize: `${fontSizePx}px`,
          color: style.fillColor,
          WebkitTextStroke: `${style.strokeWidth}px ${style.strokeColor}`,
          paintOrder: "stroke fill",
          textShadow: "0 2px 8px rgba(0,0,0,0.45)",
        }}
      >
        {word.text}
      </span>
    </span>
  );
}

export default function ClipSubtitleOverlay({
  words,
  sequenceTime,
  style,
  layout,
  containerRef,
  interactive = false,
  disabled = false,
  onLayoutChange,
}: ClipSubtitleOverlayProps) {
  const dragModeRef = useRef<DragMode>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({
    scale: 1,
    clientX: 0,
    clientY: 0,
    corner: "se" as SelectionResizeCorner,
  });
  const [showCenterSnapGuide, setShowCenterSnapGuide] = useState(false);
  const [showVerticalSnapGuide, setShowVerticalSnapGuide] = useState(false);

  const normalizedLayout = useMemo(
    () => normalizeSubtitleLayout(layout),
    [layout],
  );
  const containerWidth = usePreviewContainerWidth(containerRef);
  const fontSizePx = getSubtitlePreviewFontSizePx(
    containerWidth,
    normalizedLayout.scale,
  );

  const visibleWords = useMemo(
    () => getVisibleWordsAtSequenceTime(words, sequenceTime),
    [words, sequenceTime],
  );

  const handleMovePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || disabled || !onLayoutChange) return;
    if (isSelectionResizeTarget(event.target, "data-subtitle-resize")) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = pointerToNormalizedPoint(event.clientX, event.clientY, rect);
    dragModeRef.current = "move";
    dragOffsetRef.current = {
      x: point.x - normalizedLayout.x,
      y: point.y - normalizedLayout.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerDown = (
    corner: SelectionResizeCorner,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!interactive || disabled || !onLayoutChange) return;

    event.stopPropagation();
    event.preventDefault();

    dragModeRef.current = "resize";
    resizeStartRef.current = {
      scale: normalizedLayout.scale,
      clientX: event.clientX,
      clientY: event.clientY,
      corner,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const mode = dragModeRef.current;
      if (!mode || !onLayoutChange) return;

      if (mode === "move") {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const point = pointerToNormalizedPoint(
          event.clientX,
          event.clientY,
          rect,
        );
        const rawX = Math.max(
          0,
          Math.min(1, point.x - dragOffsetRef.current.x),
        );
        const snappedX = snapSubtitleLayoutX(rawX);
        const snappedY = snapSubtitleLayoutY(
          Math.max(
            0,
            Math.min(1, point.y - dragOffsetRef.current.y),
          ),
        );
        setShowCenterSnapGuide(snappedX.snapped);
        setShowVerticalSnapGuide(snappedY.snapped);

        onLayoutChange(
          normalizeSubtitleLayout({
            ...normalizedLayout,
            x: snappedX.x,
            y: snappedY.y,
          }),
        );
        return;
      }

      if (mode === "resize") {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const deltaX = event.clientX - resizeStartRef.current.clientX;
        const deltaY = event.clientY - resizeStartRef.current.clientY;
        const delta = getOutwardResizeDelta(
          resizeStartRef.current.corner,
          deltaX,
          deltaY,
        );
        const scaleDelta = delta / Math.max(rect.width, 1);
        onLayoutChange(
          normalizeSubtitleLayout({
            ...normalizedLayout,
            scale: clampSubtitleScale(
              resizeStartRef.current.scale + scaleDelta * 2,
            ),
          }),
        );
      }
    },
    [containerRef, normalizedLayout, onLayoutChange],
  );

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragModeRef.current = null;
    setShowCenterSnapGuide(false);
    setShowVerticalSnapGuide(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (visibleWords.length === 0) return null;

  const activeWord = visibleWords[visibleWords.length - 1];
  const canInteract = interactive && !disabled && Boolean(onLayoutChange);

  return (
    <>
      {showCenterSnapGuide || showVerticalSnapGuide ? (
        <PreviewCenterSnapGuides
          showVertical={showCenterSnapGuide}
          showHorizontal={showVerticalSnapGuide}
        />
      ) : null}

      <div
        className={`absolute z-30 max-w-[92%] ${canInteract ? "touch-none" : "pointer-events-none"}`}
        style={{
          left: `${normalizedLayout.x * 100}%`,
          top: `${normalizedLayout.y * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
        onPointerDown={canInteract ? handleMovePointerDown : undefined}
        onPointerMove={canInteract ? handlePointerMove : undefined}
        onPointerUp={canInteract ? handlePointerUp : undefined}
        onPointerCancel={canInteract ? handlePointerUp : undefined}
      >
        <div
          className={`relative flex flex-wrap items-end justify-center gap-x-2 gap-y-1 text-center ${
            canInteract
              ? `cursor-grab rounded-lg ${CLIP_SELECTION_RING_CLASS} active:cursor-grabbing`
              : ""
          }`}
        >
          {visibleWords.map((word) => (
            <SubtitleWordChip
              key={word.id}
              word={word}
              style={style}
              isActive={word.id === activeWord.id}
              fontSizePx={fontSizePx}
            />
          ))}

          {canInteract && (
            <ClipSelectionResizeHandles
              dataAttribute="data-subtitle-resize"
              onResizePointerDown={handleResizePointerDown}
            />
          )}
        </div>
      </div>
    </>
  );
}
