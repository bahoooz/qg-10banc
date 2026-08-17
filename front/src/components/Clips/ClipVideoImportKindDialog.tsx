import { Film, Scissors, X } from "lucide-react";
import type { TimelineVideoImportKind } from "../../lib/clipTimelineInserts";

type ClipVideoImportKindDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (kind: TimelineVideoImportKind) => void;
};

export default function ClipVideoImportKindDialog({
  open,
  onClose,
  onSelect,
}: ClipVideoImportKindDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clip-video-kind-title"
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-secondary-color/60 bg-background-secondary shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-xl border border-secondary-color/50 text-white/50 transition-colors hover:border-main-color/40 hover:text-main-color"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col gap-5 p-6 pt-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-main-color/15">
              <Film className="size-5 text-main-color" />
            </div>
            <div>
              <h2
                id="clip-video-kind-title"
                className="text-lg font-extrabold uppercase tracking-wide"
              >
                Type de vidéo
              </h2>
              <p className="text-sm text-white/50">
                Choisis comment intégrer la vidéo sur la timeline
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => onSelect("meme")}
              className="rounded-xl border border-sky-300/40 bg-sky-300/10 px-4 py-4 text-left transition-all hover:border-sky-300/70 hover:bg-sky-300/15"
            >
              <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-sky-100">
                <Scissors className="size-4" />
                Meme
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-white/45">
                Inséré à la position du curseur. La vidéo de base est coupée et
                le meme se place entre les deux segments. Durée max{" "}
                <strong className="text-white/70">20 secondes</strong>.
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelect("clip")}
              className="rounded-xl border border-main-color/40 bg-main-color/10 px-4 py-4 text-left transition-all hover:border-main-color/70 hover:bg-main-color/15"
            >
              <span className="block text-sm font-extrabold uppercase tracking-wide text-main-color">
                Clip
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-white/45">
                Ajouté à la fin de la timeline, sans couper la vidéo de base
                (comportement actuel).
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
