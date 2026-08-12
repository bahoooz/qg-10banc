import { Circle, RectangleHorizontal, Square } from "lucide-react";
import type { CamShape } from "../../lib/clipLayout";
import { useClipEditorStore } from "../../stores/clipEditorStore";

type ShapeOption = {
  id: CamShape;
  label: string;
  icon: typeof Square;
};

const CAM_SHAPES: ShapeOption[] = [
  { id: "rounded", label: "Arrondi", icon: Square },
  { id: "circle", label: "Rond", icon: Circle },
  { id: "free", label: "Libre", icon: RectangleHorizontal },
];

export default function ClipEditorLayoutTopbar() {
  const camShape = useClipEditorStore((s) => s.layout.camShape);
  const setCamShape = useClipEditorStore((s) => s.setCamShape);

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-secondary-color/40 pb-4">
      <p className="text-xs text-white/40">
        Cadre la cam sur la source, puis ajuste le rendu 9:16.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
          Forme caméra
        </span>
        <div className="flex flex-wrap gap-1.5">
          {CAM_SHAPES.map((shape) => {
            const Icon = shape.icon;
            const isActive = camShape === shape.id;

            return (
              <button
                key={shape.id}
                type="button"
                onClick={() => setCamShape(shape.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                  isActive
                    ? "border-main-color/50 bg-main-color/10 text-main-color"
                    : "border-secondary-color/50 text-white/40 hover:border-main-color/30"
                }`}
              >
                <Icon className="size-3.5" />
                {shape.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
