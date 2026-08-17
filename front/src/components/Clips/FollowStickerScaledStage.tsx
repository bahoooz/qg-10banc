import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  computeFollowStickerRenderScale,
  measureFollowStickerNaturalSize,
  type FollowStickerNaturalSize,
} from "../../lib/followStickerMeasure";
import type { FollowStickerConfig } from "../../lib/followSticker";
import FollowStickerBadge from "./FollowStickerBadge";

type FollowStickerScaledStageProps = {
  config: FollowStickerConfig;
  /** Remplit le parent (preview). Mesure clientWidth/Height pour le scale. */
  fill?: boolean;
  /** Dimensions explicites (capture export). */
  zonePixelWidth?: number;
  zonePixelHeight?: number;
  containerRef?: RefObject<HTMLDivElement | null>;
  contentRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  onMeasured?: (measure: {
    zonePixelWidth: number;
    zonePixelHeight: number;
    natural: FollowStickerNaturalSize;
    renderScale: number;
  }) => void;
};

/**
 * Zone + badge scalé depuis le bas (identique preview / export).
 */
export function FollowStickerScaledStage({
  config,
  fill = false,
  zonePixelWidth = 0,
  zonePixelHeight = 0,
  containerRef,
  contentRef,
  className = "",
  onMeasured,
}: FollowStickerScaledStageProps) {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const internalContentRef = useRef<HTMLDivElement>(null);
  const [renderScale, setRenderScale] = useState(1);

  const resolvedContainerRef = containerRef ?? internalContainerRef;
  const resolvedContentRef = contentRef ?? internalContentRef;
  const onMeasuredRef = useRef(onMeasured);
  onMeasuredRef.current = onMeasured;

  useLayoutEffect(() => {
    const container = resolvedContainerRef.current;
    const content = resolvedContentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const measuredZoneW = fill
        ? container.clientWidth
        : zonePixelWidth;
      const measuredZoneH = fill
        ? container.clientHeight
        : zonePixelHeight;

      if (measuredZoneW <= 0 || measuredZoneH <= 0) return;

      const badgeRoot = content.querySelector(
        "[data-follow-sticker-root]",
      ) as HTMLElement | null;
      if (!badgeRoot) return;

      const natural = measureFollowStickerNaturalSize(badgeRoot);
      const nextScale = computeFollowStickerRenderScale(
        natural,
        measuredZoneW,
        measuredZoneH,
      );

      setRenderScale(nextScale);
      onMeasuredRef.current?.({
        zonePixelWidth: measuredZoneW,
        zonePixelHeight: measuredZoneH,
        natural,
        renderScale: nextScale,
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [
    config.platform,
    config.username,
    fill,
    resolvedContainerRef,
    resolvedContentRef,
    zonePixelHeight,
    zonePixelWidth,
  ]);

  return (
    <div
      ref={resolvedContainerRef}
      className={`flex items-end justify-center overflow-hidden ${className}`}
      style={
        fill
          ? undefined
          : {
              width: zonePixelWidth,
              height: zonePixelHeight,
            }
      }
    >
      <div
        ref={resolvedContentRef}
        style={{
          transform: `scale(${renderScale})`,
          transformOrigin: "bottom center",
        }}
      >
        <FollowStickerBadge config={config} />
      </div>
    </div>
  );
}
