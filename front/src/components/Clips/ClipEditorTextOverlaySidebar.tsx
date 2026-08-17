import {
  SUBTITLE_FONT_OPTIONS,
  SUBTITLE_GLOW_INTENSITY_RANGE,
  SUBTITLE_GLOW_SPREAD_RANGE,
  getSubtitleFontCssStyle,
  type SubtitleFontId,
} from "../../lib/clipSubtitles";
import {
  TEXT_OVERLAY_LETTER_SPACING_RANGE,
  type TextOverlayStyle,
} from "../../lib/clipTextOverlays";
import { useClipEditorStore } from "../../stores/clipEditorStore";

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
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
        {label}
      </span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full cursor-pointer rounded-lg border border-secondary-color/50 bg-background"
      />
    </label>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
        {label}{" "}
        <span className="tabular-nums text-white/50">
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

export default function ClipEditorTextOverlaySidebar() {
  const textOverlays = useClipEditorStore((s) => s.textOverlays);
  const selectedTextOverlayId = useClipEditorStore(
    (s) => s.selectedTextOverlayId,
  );
  const updateTextOverlay = useClipEditorStore((s) => s.updateTextOverlay);
  const updateTextOverlayStyle = useClipEditorStore(
    (s) => s.updateTextOverlayStyle,
  );

  const selectedOverlay = textOverlays.find(
    (overlay) => overlay.id === selectedTextOverlayId,
  );

  if (!selectedOverlay) {
    return (
      <aside
        data-clip-editor-panel
        className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-secondary-color/40 bg-background-secondary max-h-[min(42vh,360px)] lg:max-h-none lg:w-72 lg:self-stretch lg:border-b-0 lg:border-r"
      >
        <div className="shrink-0 border-b border-secondary-color/40 px-4 py-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-main-color">
            Texte
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            Sélectionnez un texte dans la preview ou la timeline.
          </p>
        </div>
      </aside>
    );
  }

  const updateStyle = (patch: Partial<TextOverlayStyle>) => {
    updateTextOverlayStyle(selectedOverlay.id, patch);
  };

  return (
    <aside
      data-clip-editor-panel
      className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-secondary-color/40 bg-background-secondary max-h-[min(42vh,360px)] lg:max-h-none lg:w-72 lg:self-stretch lg:border-b-0 lg:border-r"
    >
      <div className="shrink-0 border-b border-secondary-color/40 px-4 py-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-main-color">
          Texte
        </p>
        <p className="mt-1 text-[11px] text-white/35">
          {textOverlays.length} calque{textOverlays.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-scroll overscroll-contain p-4 [scrollbar-gutter:stable]">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
              Contenu
            </span>
            <textarea
              value={selectedOverlay.text}
              onChange={(event) =>
                updateTextOverlay(selectedOverlay.id, {
                  text: event.target.value,
                })
              }
              rows={3}
              className="resize-none rounded-xl border border-secondary-color/50 bg-background px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-300/60 focus:outline-none"
              placeholder="Votre texte…"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
              Police
            </span>
            <select
              value={selectedOverlay.style.fontId}
              onChange={(event) =>
                updateStyle({ fontId: event.target.value as SubtitleFontId })
              }
              className="rounded-lg border border-secondary-color/50 bg-background px-2 py-2 text-[11px] font-extrabold tracking-wide text-white/80"
              style={getSubtitleFontCssStyle(selectedOverlay.style.fontId)}
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

          <ColorControl
            label="Couleur"
            value={selectedOverlay.style.fillColor}
            onChange={(fillColor) => updateStyle({ fillColor })}
          />

          <ColorControl
            label="Contour"
            value={selectedOverlay.style.strokeColor}
            onChange={(strokeColor) => updateStyle({ strokeColor })}
          />

          <RangeControl
            label="Épaisseur contour"
            value={selectedOverlay.style.strokeWidth}
            min={2}
            max={12}
            step={1}
            unit="px"
            onChange={(strokeWidth) => updateStyle({ strokeWidth })}
          />

          <RangeControl
            label="Interlettrage"
            value={selectedOverlay.style.letterSpacing}
            min={TEXT_OVERLAY_LETTER_SPACING_RANGE.min}
            max={TEXT_OVERLAY_LETTER_SPACING_RANGE.max}
            step={TEXT_OVERLAY_LETTER_SPACING_RANGE.step}
            unit="px"
            onChange={(letterSpacing) => updateStyle({ letterSpacing })}
          />

          <div className="h-px bg-secondary-color/50" />

          <ColorControl
            label="Lueur"
            value={selectedOverlay.style.glowColor}
            onChange={(glowColor) => updateStyle({ glowColor })}
          />

          <RangeControl
            label="Intensité lueur"
            value={selectedOverlay.style.glowIntensity}
            min={SUBTITLE_GLOW_INTENSITY_RANGE.min}
            max={SUBTITLE_GLOW_INTENSITY_RANGE.max}
            step={SUBTITLE_GLOW_INTENSITY_RANGE.step}
            unit="%"
            onChange={(glowIntensity) => updateStyle({ glowIntensity })}
          />

          <RangeControl
            label="Portée lueur"
            value={selectedOverlay.style.glowSpread}
            min={SUBTITLE_GLOW_SPREAD_RANGE.min}
            max={SUBTITLE_GLOW_SPREAD_RANGE.max}
            step={SUBTITLE_GLOW_SPREAD_RANGE.step}
            unit="px"
            onChange={(glowSpread) => updateStyle({ glowSpread })}
          />
        </div>
      </div>
    </aside>
  );
}
