import { useClipEditorStore } from "../../stores/clipEditorStore";

export default function ClipEditorPreviewVolumeSlider() {
  const previewVolume = useClipEditorStore((s) => s.previewVolume);
  const setPreviewVolume = useClipEditorStore((s) => s.setPreviewVolume);

  const percent = Math.round(previewVolume * 100);

  return (
    <label
      className="flex min-w-[148px] items-center gap-2"
      title="Volume preview uniquement"
    >
      <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-white/30">
        Volume {percent}%
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        onChange={(event) =>
          setPreviewVolume(Number(event.target.value) / 100)
        }
        className="w-full accent-main-color"
        aria-label="Volume de la preview"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      />
    </label>
  );
}
