import { Loader2, Trash2, X } from "lucide-react";

type DeleteSavedClipDialogProps = {
  open: boolean;
  clipName?: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
};

export default function DeleteSavedClipDialog({
  open,
  clipName,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteSavedClipDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-saved-clip-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-secondary-color/60 bg-background p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="delete-saved-clip-title"
              className="text-sm font-extrabold uppercase tracking-[0.12em] text-red-400"
            >
              Supprimer le clip
            </h2>
            <p className="mt-1 text-xs text-white/40">
              {clipName ? (
                <>
                  « {clipName} » sera supprimé définitivement. Cette action est
                  irréversible.
                </>
              ) : (
                <>Ce clip sera supprimé définitivement. Cette action est irréversible.</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70 disabled:opacity-40"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-secondary-color/60 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white/50 transition-all hover:border-white/20 hover:text-white/70 disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-900/70 bg-red-950/50 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-red-400 transition-all hover:border-red-800/80 hover:bg-red-950/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
