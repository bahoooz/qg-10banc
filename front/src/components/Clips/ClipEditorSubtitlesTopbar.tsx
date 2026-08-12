import {
  FIXED_SUBTITLE_STYLE,
  SUBTITLE_ANIMATION_OPTIONS,
  SUBTITLE_FONT_OPTIONS,
  SUBTITLE_ANTICIPATION_RANGE,
  SUBTITLE_GLOW_INTENSITY_RANGE,
  SUBTITLE_GLOW_SPREAD_RANGE,
  SUBTITLE_SYNC_OFFSET_RANGE,
  getSubtitleFontCssStyle,
  type SubtitleAnimation,
  type SubtitleFontId,
  type SubtitleStyle,
} from "../../lib/clipSubtitles";
import { useClipEditorStore } from "../../stores/clipEditorStore";

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  signed = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  signed?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex w-[140px] shrink-0 flex-col gap-1">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
        {label}{" "}
        <span className="tabular-nums text-white/50">
          {signed && value > 0 ? "+" : ""}
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-main-color"
      />
    </label>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex shrink-0 flex-col gap-1">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
        {label}
      </span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-12 cursor-pointer rounded-lg border border-secondary-color/50 bg-background-secondary"
      />
    </label>
  );
}

export default function ClipEditorSubtitlesTopbar() {
  const subtitleWords = useClipEditorStore((s) => s.subtitleWords);
  const subtitleStyle = useClipEditorStore((s) => s.subtitleStyle);
  const subtitleTiming = useClipEditorStore((s) => s.subtitleTiming);
  const isTranscribing = useClipEditorStore((s) => s.isTranscribing);
  const setSubtitleStyle = useClipEditorStore((s) => s.setSubtitleStyle);
  const setSubtitleTiming = useClipEditorStore((s) => s.setSubtitleTiming);

  const updateStyle = (patch: Partial<SubtitleStyle>) => {
    setSubtitleStyle({ ...subtitleStyle, ...patch });
  };

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-secondary-color/40 pb-4">
      <p className="text-xs text-white/40">
        Sous-titres auto · max {FIXED_SUBTITLE_STYLE.maxWordsOnScreen} mots à
        l&apos;écran ·{" "}
        {isTranscribing ? (
          <span className="text-main-color">transcription…</span>
        ) : (
          <span className="tabular-nums text-white/50">
            {subtitleWords.length} mots
          </span>
        )}
      </p>

      <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-secondary-color/80 [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="flex min-w-max flex-nowrap items-end gap-x-4">
          <RangeControl
            label="Sync"
            value={subtitleTiming.syncOffsetMs}
            min={SUBTITLE_SYNC_OFFSET_RANGE.min}
            max={SUBTITLE_SYNC_OFFSET_RANGE.max}
            step={SUBTITLE_SYNC_OFFSET_RANGE.step}
            unit="ms"
            signed
            onChange={(syncOffsetMs) =>
              setSubtitleTiming({ ...subtitleTiming, syncOffsetMs })
            }
          />
          <RangeControl
            label="Anticipation"
            value={subtitleTiming.anticipationMs}
            min={SUBTITLE_ANTICIPATION_RANGE.min}
            max={SUBTITLE_ANTICIPATION_RANGE.max}
            step={SUBTITLE_ANTICIPATION_RANGE.step}
            unit="ms"
            onChange={(anticipationMs) =>
              setSubtitleTiming({ ...subtitleTiming, anticipationMs })
            }
          />

          <ColorControl
            label="Texte"
            value={subtitleStyle.fillColor}
            onChange={(fillColor) => updateStyle({ fillColor })}
          />
          <ColorControl
            label="Contour"
            value={subtitleStyle.strokeColor}
            onChange={(strokeColor) => updateStyle({ strokeColor })}
          />

          <RangeControl
            label="Épaisseur"
            value={subtitleStyle.strokeWidth}
            min={2}
            max={12}
            step={1}
            unit="px"
            onChange={(strokeWidth) => updateStyle({ strokeWidth })}
          />

          <label className="flex w-[148px] shrink-0 flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
              Police
            </span>
            <select
              value={subtitleStyle.fontId}
              onChange={(event) =>
                updateStyle({ fontId: event.target.value as SubtitleFontId })
              }
              className="rounded-lg border border-secondary-color/50 bg-background-secondary px-2 py-1.5 text-[10px] font-extrabold tracking-wide text-white/80"
              style={getSubtitleFontCssStyle(subtitleStyle.fontId)}
            >
              {SUBTITLE_FONT_OPTIONS.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  style={{
                    fontFamily: option.cssFamily,
                    fontWeight: option.fontWeight,
                  }}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex w-[120px] shrink-0 flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
              Animation
            </span>
            <select
              value={subtitleStyle.animation}
              onChange={(event) =>
                updateStyle({
                  animation: event.target.value as SubtitleAnimation,
                })
              }
              className="rounded-lg border border-secondary-color/50 bg-background-secondary px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white/80"
            >
              {SUBTITLE_ANIMATION_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mx-1 h-8 w-px shrink-0 bg-secondary-color/50" />

          <ColorControl
            label="Lueur"
            value={subtitleStyle.glowColor}
            onChange={(glowColor) => updateStyle({ glowColor })}
          />
          <RangeControl
            label="Intensité lueur"
            value={subtitleStyle.glowIntensity}
            min={SUBTITLE_GLOW_INTENSITY_RANGE.min}
            max={SUBTITLE_GLOW_INTENSITY_RANGE.max}
            step={SUBTITLE_GLOW_INTENSITY_RANGE.step}
            unit="%"
            onChange={(glowIntensity) => updateStyle({ glowIntensity })}
          />
          <RangeControl
            label="Portée lueur"
            value={subtitleStyle.glowSpread}
            min={SUBTITLE_GLOW_SPREAD_RANGE.min}
            max={SUBTITLE_GLOW_SPREAD_RANGE.max}
            step={SUBTITLE_GLOW_SPREAD_RANGE.step}
            unit="px"
            onChange={(glowSpread) => updateStyle({ glowSpread })}
          />
        </div>
      </div>
    </div>
  );
}
