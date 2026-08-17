import { AlertCircle, Cloud, Loader2 } from "lucide-react";
import { useClipEditorStore } from "../../stores/clipEditorStore";

export default function ClipSaveStatusIndicator() {
  const saveStatus = useClipEditorStore((s) => s.saveStatus);
  const savedClipId = useClipEditorStore((s) => s.savedClipId);

  if (!savedClipId) return null;

  return (
    <div className="mt-auto border-t border-secondary-color/40 px-4 py-3 lg:px-5">
      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wide text-white/40">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="size-3.5 animate-spin text-main-color" />
            <span className="text-main-color/80">Sauvegarde…</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <Cloud className="size-3.5 text-emerald-400/80" />
            <span className="text-emerald-400/80">Enregistré</span>
          </>
        )}
        {saveStatus === "error" && (
          <>
            <AlertCircle className="size-3.5 text-red-400/80" />
            <span className="text-red-400/80">Erreur sauvegarde</span>
          </>
        )}
        {saveStatus === "idle" && (
          <>
            <Cloud className="size-3.5" />
            <span>Clip cloud</span>
          </>
        )}
      </div>
    </div>
  );
}
