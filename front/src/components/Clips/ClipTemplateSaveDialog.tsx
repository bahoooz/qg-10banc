import { Loader2, Save, X } from "lucide-react";
import { useState } from "react";
import { buildClipTemplatePayloadFromState } from "../../lib/clipTemplate";
import { useCreateClipTemplate } from "../../hooks/useClipTemplates";
import { useClipEditorStore } from "../../stores/clipEditorStore";

type ClipTemplateSaveDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function ClipTemplateSaveDialog({
  open,
  onClose,
}: ClipTemplateSaveDialogProps) {
  const [name, setName] = useState("");
  const createTemplate = useCreateClipTemplate();

  if (!open) return null;

  const handleClose = () => {
    setName("");
    onClose();
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const state = useClipEditorStore.getState();
    const payload = buildClipTemplatePayloadFromState(state);

    createTemplate.mutate(
      { name: trimmed, payload },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clip-template-save-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-secondary-color/60 bg-background p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="clip-template-save-title"
              className="text-sm font-extrabold uppercase tracking-[0.12em] text-main-color"
            >
              Sauvegarder la template
            </h2>
            <p className="mt-1 text-xs text-white/40">
              Layout, montage (1er texte + sticker follow) et sous-titres.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-white/35">
            Nom de la template
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="Ex. TikTok gaming v1"
            className="w-full rounded-xl border border-secondary-color/60 bg-background-secondary px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-main-color/50"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmit();
              }
            }}
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-secondary-color/60 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white/50 transition-all hover:border-white/20 hover:text-white/70"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!name.trim() || createTemplate.isPending}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-main-color/50 bg-main-color/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-main-color transition-all hover:bg-main-color/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {createTemplate.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
