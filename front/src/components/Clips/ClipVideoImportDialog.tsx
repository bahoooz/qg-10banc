import { type FormEvent, useRef, useState } from "react";
import { Film, Link2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { ClipImportResult } from "../../../types";
import { twitchClipUrlSchema } from "../../schemas/clipEditor";
import {
  getTwitchLoginUrl,
  useTwitchAccounts,
  type TwitchAccountSummary,
} from "../../hooks/useTwitchAccounts";
import { useImportTwitchClip, useUploadClip } from "../../hooks/useImportClip";
import type { TimelineVideoLayoutMode } from "../../lib/clipTimelineVideos";
import type { TimelineVideoImportKind } from "../../lib/clipTimelineInserts";
import { MEME_MAX_DURATION_SEC } from "../../lib/clipTimelineInserts";
import ClipProgressOverlay from "./ClipProgressOverlay";

type ClipVideoImportDialogProps = {
  open: boolean;
  importKind: TimelineVideoImportKind;
  onClose: () => void;
  onComplete: (
    result: ClipImportResult,
    layoutMode: TimelineVideoLayoutMode,
  ) => void;
};

type ImportMode = "file" | "twitch";
type DialogStep = "import" | "loading" | "layout";

function AccountChip({
  account,
  selected,
  onSelect,
}: {
  account: TwitchAccountSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
        selected
          ? "border-main-color/60 bg-main-color/10"
          : "border-secondary-color/50 bg-background hover:border-main-color/30"
      }`}
    >
      {account.avatar ? (
        <img
          src={account.avatar}
          alt=""
          className="size-7 rounded-full object-cover"
        />
      ) : (
        <div className="size-7 rounded-full bg-secondary-color/40" />
      )}
      <span className="text-sm font-bold text-white/80">
        {account.displayName ?? account.login}
      </span>
    </button>
  );
}

export default function ClipVideoImportDialog({
  open,
  importKind,
  onClose,
  onComplete,
}: ClipVideoImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("file");
  const [step, setStep] = useState<DialogStep>("import");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState("Préparation");
  const [importResult, setImportResult] = useState<ClipImportResult | null>(
    null,
  );

  const { data: accounts = [], isLoading: accountsLoading } = useTwitchAccounts();

  const importTwitch = useImportTwitchClip({
    onProgress: (progress, phase) => {
      setImportProgress(progress);
      setImportPhase(phase);
    },
  });

  const uploadClip = useUploadClip({
    onProgress: (progress, phase) => {
      setImportProgress(progress);
      setImportPhase(phase);
    },
  });

  if (!open) return null;

  const resetState = () => {
    setMode("file");
    setStep("import");
    setUrl("");
    setUrlError(null);
    setSelectedAccountId(undefined);
    setImportProgress(0);
    setImportPhase("Préparation");
    setImportResult(null);
  };

  const handleClose = () => {
    if (importTwitch.isPending || uploadClip.isPending) return;
    resetState();
    onClose();
  };

  const startImport = async (task: Promise<ClipImportResult>) => {
    setStep("loading");
    setImportProgress(0);
    setImportPhase("Préparation");

    try {
      const result = await task;

      if (importKind === "meme") {
        if (result.duration > MEME_MAX_DURATION_SEC + 0.01) {
          toast.error(
            `Un meme doit durer moins de ${MEME_MAX_DURATION_SEC} secondes (durée : ${result.duration.toFixed(1)} s)`,
          );
          setStep("import");
          return;
        }

        onComplete(result, "center-crop");
        resetState();
        onClose();
        return;
      }

      setImportResult(result);
      setStep("layout");
    } catch {
      setStep("import");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Le fichier doit être une vidéo");
      return;
    }

    void startImport(uploadClip.mutateAsync(file));
  };

  const handleTwitchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = twitchClipUrlSchema.safeParse(url);
    if (!result.success) {
      setUrlError(result.error.issues[0]?.message ?? "Lien invalide");
      return;
    }

    if (accounts.length === 0) {
      setUrlError("Connecte d'abord un compte Twitch autorisé sur ce clip");
      return;
    }

    setUrlError(null);
    void startImport(
      importTwitch.mutateAsync({
        url: result.data,
        twitchAccountId: selectedAccountId ?? accounts[0]?.id,
      }),
    );
  };

  const handleLayoutChoice = (layoutMode: TimelineVideoLayoutMode) => {
    if (!importResult) return;

    if (
      importKind === "meme" &&
      importResult.duration > MEME_MAX_DURATION_SEC + 0.01
    ) {
      toast.error(
        `Un meme doit durer moins de ${MEME_MAX_DURATION_SEC} secondes (durée : ${importResult.duration.toFixed(1)} s)`,
      );
      setStep("import");
      setImportResult(null);
      return;
    }

    onComplete(importResult, layoutMode);
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clip-video-import-title"
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-secondary-color/60 bg-background-secondary shadow-2xl"
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={importTwitch.isPending || uploadClip.isPending}
          className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-xl border border-secondary-color/50 text-white/50 transition-colors hover:border-main-color/40 hover:text-main-color disabled:opacity-40"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </button>

        {step === "loading" && (
          <div className="relative min-h-[320px]">
            <ClipProgressOverlay
              progress={importProgress}
              phase={importPhase}
              title="Import vidéo"
              className="relative inset-auto min-h-[320px] rounded-none bg-background-secondary"
            />
          </div>
        )}

        {step === "layout" && importResult && (
          <div className="flex flex-col gap-5 p-6 pt-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-main-color/15">
                <Film className="size-5 text-main-color" />
              </div>
              <div>
                <h2
                  id="clip-video-import-title"
                  className="text-lg font-extrabold uppercase tracking-wide"
                >
                  Layout de la vidéo
                </h2>
                <p className="text-sm text-white/50">
                  {importResult.originalName ?? "Vidéo importée"} — comment
                  l&apos;intégrer ?
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => handleLayoutChoice("base")}
                className="rounded-xl border border-main-color/40 bg-main-color/10 px-4 py-4 text-left transition-all hover:border-main-color/70 hover:bg-main-color/15"
              >
                <span className="block text-sm font-extrabold uppercase tracking-wide text-main-color">
                  Même layout que la vidéo de base
                </span>
                <span className="mt-1 block text-xs text-white/45">
                  Cam PiP, crop et forme identiques au clip principal.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleLayoutChoice("center-crop")}
                className="rounded-xl border border-secondary-color/50 bg-background px-4 py-4 text-left transition-all hover:border-secondary-color/80 hover:bg-background/80"
              >
                <span className="block text-sm font-extrabold uppercase tracking-wide text-white/80">
                  Laisser tel quel (9:16)
                </span>
                <span className="mt-1 block text-xs text-white/45">
                  Recadrage vertical centré, sans layout PiP.
                </span>
              </button>
            </div>
          </div>
        )}

        {step === "import" && (
          <div className="flex flex-col gap-5 p-6 pt-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-main-color/15">
                <Film className="size-5 text-main-color" />
              </div>
              <div>
                <h2
                  id="clip-video-import-title"
                  className="text-lg font-extrabold uppercase tracking-wide"
                >
                  Ajouter une vidéo
                </h2>
                <p className="text-sm text-white/50">
                  {importKind === "meme"
                    ? "Meme — inséré au curseur (max 20 s)"
                    : "Clip — ajouté à la fin de la timeline"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("file")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                  mode === "file"
                    ? "border-main-color/60 bg-main-color/10 text-main-color"
                    : "border-secondary-color/50 text-white/50 hover:border-main-color/30"
                }`}
              >
                <Upload className="size-4" />
                Fichier
              </button>
              <button
                type="button"
                onClick={() => setMode("twitch")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                  mode === "twitch"
                    ? "border-main-color/60 bg-main-color/10 text-main-color"
                    : "border-secondary-color/50 text-white/50 hover:border-main-color/30"
                }`}
              >
                <Link2 className="size-4" />
                Twitch
              </button>
            </div>

            {mode === "file" ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadClip.isPending}
                  className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-secondary-color/60 bg-background px-4 py-8 transition-colors hover:border-main-color/40 hover:bg-main-color/5 disabled:opacity-40"
                >
                  <Upload className="size-8 text-main-color/70" />
                  <span className="text-sm font-extrabold uppercase tracking-wide text-white/70">
                    Choisir une vidéo
                  </span>
                  <span className="text-xs text-white/35">MP4, WebM, MOV…</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleTwitchSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="timeline-video-twitch-url"
                    className="text-[10px] font-extrabold uppercase tracking-wide text-white/35"
                  >
                    Lien du clip Twitch
                  </label>
                  <input
                    id="timeline-video-twitch-url"
                    type="url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setUrlError(null);
                    }}
                    placeholder="https://clips.twitch.tv/…"
                    className="w-full rounded-xl border border-secondary-color/50 bg-background px-4 py-3 text-sm text-white outline-none transition-colors focus:border-main-color/50"
                  />
                  {urlError && (
                    <p className="text-xs text-red-400">{urlError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/35">
                      Compte Twitch
                    </span>
                    <a
                      href={getTwitchLoginUrl()}
                      className="text-[10px] font-extrabold uppercase tracking-wide text-main-color hover:underline"
                    >
                      Connecter
                    </a>
                  </div>

                  {accountsLoading ? (
                    <p className="text-xs text-white/35">Chargement…</p>
                  ) : accounts.length === 0 ? (
                    <p className="text-xs text-white/45">
                      Aucun compte connecté — requis pour télécharger le clip.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {accounts.map((account) => (
                        <AccountChip
                          key={account.id}
                          account={account}
                          selected={
                            (selectedAccountId ?? accounts[0]?.id) === account.id
                          }
                          onSelect={() => setSelectedAccountId(account.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={importTwitch.isPending || accounts.length === 0}
                  className="w-full rounded-xl bg-main-color py-3 text-sm font-extrabold uppercase tracking-wide text-background transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
                >
                  Importer le clip
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
