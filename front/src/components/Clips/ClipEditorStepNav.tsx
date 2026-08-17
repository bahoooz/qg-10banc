import { LayoutGrid, Scissors, Subtitles, Upload } from "lucide-react";
import {
  useClipEditorStore,
  type ClipEditorStep,
} from "../../stores/clipEditorStore";

type StepConfig = {
  id: ClipEditorStep;
  label: string;
  number: number;
  icon: typeof LayoutGrid;
};

const STEPS: StepConfig[] = [
  { id: "layout", label: "Layout", number: 1, icon: LayoutGrid },
  { id: "montage", label: "Montage", number: 2, icon: Scissors },
  { id: "subtitles", label: "Sous-titres", number: 3, icon: Subtitles },
  { id: "export", label: "Export", number: 4, icon: Upload },
];

type ClipEditorStepNavProps = {
  orientation?: "horizontal" | "vertical";
};

export default function ClipEditorStepNav({
  orientation = "horizontal",
}: ClipEditorStepNavProps) {
  const editorStep = useClipEditorStore((s) => s.editorStep);
  const setEditorStep = useClipEditorStore((s) => s.setEditorStep);

  const isVertical = orientation === "vertical";

  return (
    <nav className={isVertical ? "flex flex-col gap-2" : "flex shrink-0 gap-2"}>
      {STEPS.map((step) => {
        const Icon = step.icon;
        const isActive = editorStep === step.id;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => setEditorStep(step.id)}
            className={`flex items-center text-left transition-all ${
              isVertical
                ? `gap-3 rounded-xl border px-3 py-3 ${
                    isActive
                      ? "border-main-color/50 bg-main-color/10"
                      : "border-secondary-color/50 bg-background hover:border-main-color/40 hover:bg-main-color/5"
                  }`
                : `gap-2 rounded-lg border px-3 py-2 ${
                    isActive
                      ? "border-main-color/50 bg-main-color/10"
                      : "border-secondary-color/50 bg-background hover:border-main-color/40 hover:bg-main-color/5"
                  }`
            }`}
          >
            <span
              className={`flex shrink-0 items-center justify-center font-extrabold ${
                isVertical
                  ? `size-8 rounded-lg text-xs ${
                      isActive
                        ? "bg-main-color text-background"
                        : "bg-secondary-color/40 text-white/50"
                    }`
                  : `size-6 rounded-md text-[10px] ${
                      isActive
                        ? "bg-main-color text-background"
                        : "bg-secondary-color/40 text-white/50"
                    }`
              }`}
            >
              {step.number}
            </span>
            <span
              className={`flex items-center font-extrabold uppercase tracking-wide ${
                isVertical
                  ? "gap-1.5 text-xs"
                  : "gap-1 text-[10px]"
              }`}
            >
              <Icon className={isVertical ? "size-3.5 shrink-0" : "size-3 shrink-0"} />
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
