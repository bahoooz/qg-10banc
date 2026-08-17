import { Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  buildPackedSegments,
  DEFAULT_SEGMENT_SPEED,
  formatSpeedLabel,
  formatSpeedSliderValue,
  getSequenceSegmentDuration,
  getSourceSegmentDuration,
  MAX_SEGMENT_SPEED,
  MIN_SEGMENT_SPEED,
} from "../../lib/clipTime";
import {
  getTimelineVideoSequenceDuration,
  getTimelineVideoSpeed,
} from "../../lib/clipTimelineVideos";
import { useClipEditorStore } from "../../stores/clipEditorStore";

export default function ClipEditorSpeedSidebar() {
  const selectedSegmentId = useClipEditorStore((s) => s.selectedSegmentId);
  const selectedTimelineVideoId = useClipEditorStore(
    (s) => s.selectedTimelineVideoId,
  );
  const keepSegments = useClipEditorStore((s) => s.keepSegments);
  const timelineVideos = useClipEditorStore((s) => s.timelineVideos);
  const applySegmentSpeed = useClipEditorStore((s) => s.applySegmentSpeed);

  const selectedPacked = buildPackedSegments(keepSegments).find(
    (segment) => segment.id === selectedSegmentId,
  );
  const selectedTimelineVideo = timelineVideos.find(
    (clip) => clip.id === selectedTimelineVideoId,
  );

  const currentSpeed = selectedPacked
    ? selectedPacked.speed
    : selectedTimelineVideo
      ? getTimelineVideoSpeed(selectedTimelineVideo)
      : DEFAULT_SEGMENT_SPEED;

  const [draftSpeed, setDraftSpeed] = useState(currentSpeed);

  useEffect(() => {
    setDraftSpeed(currentSpeed);
  }, [currentSpeed, selectedSegmentId, selectedTimelineVideoId]);

  if (!selectedPacked && !selectedTimelineVideo) {
    return (
      <aside
        data-clip-editor-panel
        className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-secondary-color/50 bg-background-secondary max-h-[min(42vh,360px)] lg:max-h-none lg:w-72 lg:self-stretch lg:border-b-0 lg:border-r"
      >
        <header className="shrink-0 border-b border-secondary-color/40 px-4 py-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-main-color">
            Vitesse
          </p>
          <p className="mt-1 text-[10px] text-white/35">
            Sélectionnez un segment vidéo dans la timeline.
          </p>
        </header>
      </aside>
    );
  }

  const sourceDuration = selectedPacked
    ? getSourceSegmentDuration(selectedPacked)
    : selectedTimelineVideo?.duration ?? 0;

  const previewSequenceDuration = selectedPacked
    ? getSequenceSegmentDuration({
        start: selectedPacked.start,
        end: selectedPacked.end,
        speed: draftSpeed,
      })
    : selectedTimelineVideo
      ? getTimelineVideoSequenceDuration({
          ...selectedTimelineVideo,
          speed: draftSpeed,
        })
      : 0;

  const isDraftDefault = draftSpeed === DEFAULT_SEGMENT_SPEED;
  const isDraftUnchanged = draftSpeed === currentSpeed;

  const handleConfirm = () => {
    const applied = applySegmentSpeed(draftSpeed);
    if (!applied) {
      toast.error("Impossible d'appliquer la vitesse sur ce segment");
      return;
    }

    toast.success(
      isDraftDefault
        ? "Vitesse normale restaurée sur le segment"
        : `Vitesse ${formatSpeedLabel(draftSpeed)} appliquée`,
    );
  };

  return (
    <aside
      data-clip-editor-panel
      className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-secondary-color/50 bg-background-secondary max-h-[min(42vh,360px)] lg:max-h-none lg:w-72 lg:self-stretch lg:border-b-0 lg:border-r"
    >
      <header className="shrink-0 border-b border-secondary-color/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Gauge className="size-4 text-sky-300" />
          <p className="text-xs font-extrabold uppercase tracking-wide text-main-color">
            Vitesse segment
          </p>
        </div>
        <p className="mt-1 text-[10px] text-white/35">
          {selectedTimelineVideo
            ? `Vidéo importée — ${selectedTimelineVideo.label}`
            : "Segment vidéo de base"}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide text-white/40">
            <span>Ralenti / accéléré</span>
            <span className="tabular-nums text-main-color">
              {formatSpeedSliderValue(draftSpeed)}
            </span>
          </div>
          <input
            type="range"
            min={MIN_SEGMENT_SPEED}
            max={MAX_SEGMENT_SPEED}
            step={5}
            value={draftSpeed}
            onChange={(event) => setDraftSpeed(Number(event.target.value))}
            className="w-full accent-main-color"
          />
          <p className="mt-2 text-[10px] text-white/30">
            Aperçu durée timeline : {previewSequenceDuration.toFixed(1)} s
            (source {sourceDuration.toFixed(1)} s)
          </p>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isDraftUnchanged}
          className="rounded-xl border border-main-color/40 bg-main-color/10 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-main-color transition-all hover:border-main-color/60 disabled:opacity-40"
        >
          {isDraftDefault && !isDraftUnchanged
            ? "Restaurer vitesse normale"
            : "Appliquer"}
        </button>
      </div>
    </aside>
  );
}
