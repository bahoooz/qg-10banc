import { type PointerEvent, useCallback, useRef, useState } from "react";
import {
  MONTAGE_DEFAULT_PREVIEW_SHARE,
  MONTAGE_MAX_PREVIEW_SHARE,
  MONTAGE_MIN_PREVIEW_SHARE,
} from "../../lib/clipEditorTimelineUi";
import ClipEditorPreview from "./ClipEditorPreview";
import ClipEditorTimeline from "./ClipEditorTimeline";

function clampPreviewShare(value: number): number {
  return Math.max(
    MONTAGE_MIN_PREVIEW_SHARE,
    Math.min(MONTAGE_MAX_PREVIEW_SHARE, value),
  );
}

export default function ClipEditorMontageSplit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [previewShare, setPreviewShare] = useState(
    MONTAGE_DEFAULT_PREVIEW_SHARE,
  );

  const updateShareFromClientY = useCallback((clientY: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.height <= 0) return;

    setPreviewShare(
      clampPreviewShare((clientY - rect.top) / rect.height),
    );
  }, []);

  const handleSeparatorPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    updateShareFromClientY(event.clientY);
  };

  const handleSeparatorPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateShareFromClientY(event.clientY);
  };

  const endDrag = () => {
    isDraggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const timelineShare = 1 - previewShare;

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div
        className="min-h-0 overflow-hidden"
        style={{ flex: `${previewShare * 1000} 1 0%` }}
      >
        <ClipEditorPreview fitContainer />
      </div>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={Math.round(previewShare * 100)}
        aria-valuemin={Math.round(MONTAGE_MIN_PREVIEW_SHARE * 100)}
        aria-valuemax={Math.round(MONTAGE_MAX_PREVIEW_SHARE * 100)}
        aria-label="Redimensionner la preview et la timeline"
        onPointerDown={handleSeparatorPointerDown}
        onPointerMove={handleSeparatorPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="group relative z-20 shrink-0 cursor-row-resize touch-none select-none border-t border-secondary-color/50 bg-background-secondary"
      >
        <div className="absolute inset-x-0 -top-2.5 -bottom-2.5" />
        <div className="relative flex h-3 items-center justify-center">
          <div className="h-1 w-12 rounded-full bg-secondary-color/70 transition-colors group-hover:bg-main-color/45 group-active:bg-main-color/65" />
        </div>
      </div>

      <div
        className="min-h-0 overflow-hidden"
        style={{ flex: `${timelineShare * 1000} 1 0%` }}
      >
        <ClipEditorTimeline />
      </div>
    </div>
  );
}
