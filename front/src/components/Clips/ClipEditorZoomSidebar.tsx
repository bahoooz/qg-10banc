import ClipZoomSourceSelector from "./ClipZoomSourceSelector";
import type { ZoomEffectZone } from "../../lib/clipZoomEffects";

type ClipEditorZoomSidebarProps = {
  sourceUrl: string;
  videoWidth: number;
  videoHeight: number;
  zone: ZoomEffectZone;
  currentTime: number;
  onZoneChange: (zone: ZoomEffectZone) => void;
};

export default function ClipEditorZoomSidebar({
  sourceUrl,
  videoWidth,
  videoHeight,
  zone,
  currentTime,
  onZoneChange,
}: ClipEditorZoomSidebarProps) {
  return (
    <aside
      data-clip-editor-panel
      className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-secondary-color/40 bg-background-secondary max-h-[min(42vh,360px)] lg:max-h-none lg:w-80 lg:self-stretch lg:border-b-0 lg:border-r"
    >
      <div className="shrink-0 border-b border-secondary-color/40 px-4 py-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-main-color">
          Zone de zoom 9:16
        </p>
        <p className="mt-1 text-[11px] text-white/35">
          Plus la zone est petite, plus le zoom est fort.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <ClipZoomSourceSelector
          sourceUrl={sourceUrl}
          videoWidth={videoWidth}
          videoHeight={videoHeight}
          zone={zone}
          currentTime={currentTime}
          onZoneChange={onZoneChange}
          embedded
        />
      </div>
    </aside>
  );
}
