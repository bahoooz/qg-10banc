import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Loader2,
  Share2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatClipTime } from "../lib/clipTime";
import { formatBytes } from "../lib/savedClip";
import {
  getSavedClipDownloadUrl,
  useClipsStorage,
  useDeleteSavedClip,
  useSavedClipsPage,
} from "../hooks/useSavedClips";

export default function SavedClipsPage() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { data, isLoading, isError } = useSavedClipsPage(page);
  const { data: storage } = useClipsStorage();
  const deleteClip = useDeleteSavedClip();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (!window.confirm("Supprimer ce clip définitivement ?")) return;
    setDeletingId(id);
    deleteClip.mutate(id, {
      onSettled: () => setDeletingId(null),
    });
  };

  return (
    <>
      <title>Clips enregistrés - QG10banc</title>

      <div className="min-h-dvh pb-10 pt-24 md:pt-28">
        <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-12">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                to="/editeur-clips"
                className="mb-3 inline-flex text-xs font-extrabold uppercase tracking-wide text-white/40 transition-colors hover:text-main-color"
              >
                ← Retour à l&apos;éditeur
              </Link>
              <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.2em] text-main-color">
                Bibliothèque
              </p>
              <h1 className="text-3xl font-extrabold uppercase tracking-wide md:text-4xl">
                Clips enregistrés
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/50">
                Retrouve tes montages sauvegardés. Les clips de plus de 30 jours
                sont supprimés automatiquement.
              </p>
            </div>

            {storage && (
              <div className="w-full max-w-xs rounded-2xl border border-secondary-color/50 bg-background-secondary p-4">
                <div className="mb-2 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide text-white/40">
                  <span>Stockage clips</span>
                  <span>
                    {formatBytes(storage.usedBytes)} / {formatBytes(storage.quotaBytes)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full bg-main-color transition-all"
                    style={{ width: `${Math.min(100, storage.usedPercent)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-right text-[10px] tabular-nums text-white/35">
                  {storage.usedPercent}% utilisé
                </p>
              </div>
            )}
          </header>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-white/40">
              <Loader2 className="size-5 animate-spin" />
              Chargement des clips…
            </div>
          ) : isError ? (
            <p className="py-20 text-center text-sm text-red-400/80">
              Impossible de charger vos clips enregistrés.
            </p>
          ) : !data || data.items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-secondary-color/50 bg-background-secondary/40 px-6 py-16 text-center">
              <p className="text-sm font-bold text-white/60">Aucun clip enregistré</p>
              <p className="mt-2 text-xs text-white/35">
                Importe une vidéo depuis l&apos;éditeur pour commencer.
              </p>
              <Link
                to="/editeur-clips"
                className="mt-5 inline-flex rounded-xl border border-main-color/40 bg-main-color/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-main-color transition-all hover:bg-main-color/15"
              >
                Importer un clip
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {data.items.map((clip) => (
                  <article
                    key={clip.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-secondary-color/50 bg-background-secondary"
                  >
                    <div className="relative aspect-[9/16] min-h-[280px] bg-black sm:min-h-[320px]">
                      <video
                        key={clip.previewUrl}
                        src={clip.previewUrl}
                        className="h-full w-full object-contain"
                        controls
                        playsInline
                        preload="metadata"
                      />
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-4">
                      <div>
                        <h2 className="truncate text-base font-bold text-white/90">
                          {clip.name}
                        </h2>
                        <p className="mt-0.5 text-[11px] tabular-nums text-white/35">
                          {formatClipTime(clip.sourceDuration)}
                          <span className="text-white/20"> · </span>
                          {clip.sourceType === "twitch" ? "Twitch" : "Fichier"}
                        </p>
                      </div>

                      <div className="mt-auto flex flex-col gap-2">
                        <button
                          type="button"
                          disabled
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-secondary-color/40 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-white/30"
                          title="Bientôt disponible"
                        >
                          <Share2 className="size-3.5" />
                          Publier
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/editeur-clips/${clip.id}`, {
                              state: { startOnMontage: true },
                            })
                          }
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-main-color/40 bg-main-color/10 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-main-color transition-all hover:bg-main-color/15"
                        >
                          <Edit3 className="size-3.5" />
                          Éditer le clip
                        </button>
                        <a
                          href={getSavedClipDownloadUrl(clip.id)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-secondary-color/50 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-white/60 transition-all hover:border-white/25 hover:text-white/85"
                        >
                          <Download className="size-3.5" />
                          Télécharger
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(clip.id)}
                          disabled={deletingId === clip.id}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-950/70 bg-red-950/40 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-red-400/90 transition-all hover:border-red-900/80 hover:bg-red-950/60 disabled:opacity-40"
                        >
                          {deletingId === clip.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {data.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-secondary-color/50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white/50 transition-all hover:border-main-color/40 disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" />
                    Préc.
                  </button>

                  {Array.from({ length: data.totalPages }, (_, index) => index + 1).map(
                    (pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`min-w-9 rounded-lg border px-3 py-1.5 text-xs font-extrabold tabular-nums transition-all ${
                          pageNumber === page
                            ? "border-main-color/50 bg-main-color/10 text-main-color"
                            : "border-secondary-color/50 text-white/45 hover:border-main-color/30"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    disabled={page >= data.totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(data.totalPages, current + 1))
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-secondary-color/50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white/50 transition-all hover:border-main-color/40 disabled:opacity-30"
                  >
                    Suiv.
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
