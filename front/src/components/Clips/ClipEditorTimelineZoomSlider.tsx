import { useClipEditorStore } from "../../stores/clipEditorStore";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

function zoomToSliderValue(zoom: number): number {
  return Math.round(((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100);
}

function sliderValueToZoom(value: number): number {
  return MIN_ZOOM + (value / 100) * (MAX_ZOOM - MIN_ZOOM);
}

export default function ClipEditorTimelineZoomSlider() {
  const timelineZoom = useClipEditorStore((s) => s.timelineZoom);
  const setTimelineZoom = useClipEditorStore((s) => s.setTimelineZoom);

  const sliderValue = zoomToSliderValue(timelineZoom);
  const zoomPercent = Math.round(timelineZoom * 100);

  return (
    <label
      className="flex shrink-0 items-center gap-1.5"
      title="Zoom horizontal de la timeline"
    >
      <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-wide text-white/30">
        Zoom {zoomPercent}%
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={sliderValue}
        onChange={(event) =>
          setTimelineZoom(sliderValueToZoom(Number(event.target.value)))
        }
        className="w-[72px] shrink-0 accent-main-color"
        aria-label="Zoom de la timeline"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={sliderValue}
      />
    </label>
  );
}
