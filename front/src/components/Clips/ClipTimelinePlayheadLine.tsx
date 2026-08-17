import type { CSSProperties, PointerEvent } from "react";

type ClipTimelinePlayheadLineProps = {
  playheadPercent: number;
  motionStyle?: CSSProperties;
  interactive?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void;
  ariaLabel?: string;
  ariaValueMin?: number;
  ariaValueMax?: number;
  ariaValueNow?: number;
  tabIndex?: number;
};

export default function ClipTimelinePlayheadLine({
  playheadPercent,
  motionStyle,
  interactive = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  ariaLabel,
  ariaValueMin,
  ariaValueMax,
  ariaValueNow,
  tabIndex,
}: ClipTimelinePlayheadLineProps) {
  return (
    <div
      data-playhead={interactive ? "true" : undefined}
      role={interactive ? "slider" : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      aria-valuemin={interactive ? ariaValueMin : undefined}
      aria-valuemax={interactive ? ariaValueMax : undefined}
      aria-valuenow={interactive ? ariaValueNow : undefined}
      tabIndex={interactive ? tabIndex : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      className={`absolute inset-y-0 z-[35] flex -translate-x-1/2 items-stretch justify-center touch-none select-none ${
        interactive
          ? "pointer-events-auto w-6 cursor-grab active:cursor-grabbing"
          : "pointer-events-none w-[3px]"
      }`}
      style={{ left: `${playheadPercent}%`, ...motionStyle }}
    >
      <div className="h-full w-[3px] shrink-0 rounded-full bg-main-color shadow-[0_0_8px_rgba(205,183,255,0.6)]" />
    </div>
  );
}
