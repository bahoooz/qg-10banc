import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FolderOpen } from "lucide-react";
import type { ClipImportResult } from "../../types";
import ClipEditorWorkspace from "../components/Clips/ClipEditorWorkspace";
import ClipNameDialog from "../components/Clips/ClipNameDialog";
import ClipProgressOverlay from "../components/Clips/ClipProgressOverlay";
import TwitchClipImport from "../components/Clips/TwitchClipImport";
import VideoFileDropzone from "../components/Clips/VideoFileDropzone";
import { useImportTwitchClip, useUploadClip } from "../hooks/useImportClip";
import {
  useCreateSavedClip,
  useSavedClip,
} from "../hooks/useSavedClips";
import {
  buildInitialEditorState,
  savedClipToImportResult,
} from "../lib/savedClip";
import { useQueryClient } from "@tanstack/react-query";

type EditorView = "import" | "loading" | "editor";

export default function ClipEditorPage() {
  const { savedClipId: routeSavedClipId } = useParams<{ savedClipId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const startOnMontage =
    (location.state as { startOnMontage?: boolean } | null)?.startOnMontage ===
    true;
  const [view, setView] = useState<EditorView>(
    routeSavedClipId ? "loading" : "import",
  );
  const [clip, setClip] = useState<ClipImportResult | null>(null);
  const [activeSavedClipId, setActiveSavedClipId] = useState<string | null>(
    routeSavedClipId ?? null,
  );
  const [activeSavedClipName, setActiveSavedClipName] = useState("");
  const [pendingClip, setPendingClip] = useState<ClipImportResult | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState("Préparation");
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const createSavedClip = useCreateSavedClip();
  const {
    data: savedClipDetail,
    isLoading: isLoadingSavedClip,
    isError: isSavedClipError,
  } = useSavedClip(routeSavedClipId ?? null);

  const handleImportProgress = (progress: number, phase: string) => {
    setImportProgress(progress);
    setImportPhase(phase);
  };

  const uploadClip = useUploadClip({ onProgress: handleImportProgress });
  const importTwitch = useImportTwitchClip({ onProgress: handleImportProgress });

  const isLoading = uploadClip.isPending || importTwitch.isPending;

  useEffect(() => {
    const twitchStatus = searchParams.get("twitch");
    if (twitchStatus) {
      if (twitchStatus === "connected") {
        const login = searchParams.get("login");
        toast.success(
          login ? `Compte Twitch connecté : ${login}` : "Compte Twitch connecté",
        );
        void queryClient.invalidateQueries({ queryKey: ["twitch-accounts"] });
      } else if (twitchStatus === "error") {
        toast.error("Échec de la connexion Twitch");
      }

      searchParams.delete("twitch");
      searchParams.delete("login");
      setSearchParams(searchParams, { replace: true });
      return;
    }

    const socialPlatform = searchParams.get("social");
    const socialStatus = searchParams.get("status");
    if (!socialPlatform || !socialStatus) return;

    if (socialStatus === "connected") {
      const channel = searchParams.get("channel");
      const platformLabel =
        socialPlatform === "tiktok"
          ? "TikTok"
          : socialPlatform === "youtube"
            ? "YouTube"
            : socialPlatform;
      toast.success(
        channel
          ? `Compte ${platformLabel} connecté : ${channel}`
          : `Compte ${platformLabel} connecté`,
      );
      void queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
    } else if (socialStatus === "error") {
      toast.error("Échec de la connexion du compte");
    }

    searchParams.delete("social");
    searchParams.delete("status");
    searchParams.delete("channel");
    setSearchParams(searchParams, { replace: true });
  }, [queryClient, searchParams, setSearchParams]);

  useEffect(() => {
    if (!routeSavedClipId) return;
    if (isLoadingSavedClip) {
      setView("loading");
      return;
    }
    if (isSavedClipError || !savedClipDetail) {
      toast.error("Clip enregistré introuvable");
      navigate("/editeur-clips", { replace: true });
      return;
    }

    setClip(savedClipToImportResult(savedClipDetail));
    setActiveSavedClipId(savedClipDetail.id);
    setActiveSavedClipName(savedClipDetail.name);
    setView("editor");
  }, [
    isLoadingSavedClip,
    isSavedClipError,
    navigate,
    routeSavedClipId,
    savedClipDetail,
  ]);

  const registerSavedClip = async (
    importedClip: ClipImportResult,
    name: string,
  ) => {
    const response = await createSavedClip.mutateAsync({
      name,
      clipId: importedClip.id,
      sourceType: importedClip.sourceType,
      originalName: importedClip.originalName,
      sourceWidth: importedClip.width,
      sourceHeight: importedClip.height,
      sourceDuration: importedClip.duration,
      editorState: buildInitialEditorState(importedClip),
    });

    setActiveSavedClipId(response.clip.id);
    setActiveSavedClipName(response.clip.name);
    setClip(importedClip);
    setView("editor");
    navigate(`/editeur-clips/${response.clip.id}`, { replace: true });
  };

  const handleTwitchSubmit = async (payload: {
    url: string;
    twitchAccountId?: string;
  }) => {
    setImportProgress(0);
    setImportPhase("Préparation");
    setView("loading");
    try {
      const result = await importTwitch.mutateAsync(payload);
      const clipName =
        result.originalName?.trim() ||
        `Clip Twitch ${new Date().toLocaleDateString("fr-FR")}`;
      await registerSavedClip(result, clipName);
    } catch {
      setView("import");
    }
  };

  const handleFileSubmit = async (file: File) => {
    setImportProgress(0);
    setImportPhase("Préparation");
    setView("loading");
    try {
      const result = await uploadClip.mutateAsync(file);
      setPendingClip(result);
      setView("import");
      setNameDialogOpen(true);
    } catch {
      setView("import");
    }
  };

  const handleConfirmClipName = async (name: string) => {
    if (!pendingClip) return;

    try {
      await registerSavedClip(pendingClip, name);
      setNameDialogOpen(false);
      setPendingClip(null);
    } catch {
      // toast handled by mutation
    }
  };

  const handleCloseNameDialog = () => {
    setNameDialogOpen(false);
    setPendingClip(null);
  };

  return (
    <>
      <title>Éditeur de clips - QG10banc</title>

      <div
        className={
          view === "editor" && clip
            ? "flex h-dvh flex-col overflow-hidden pt-24 md:pt-28"
            : view === "loading"
              ? "flex min-h-dvh flex-col pt-24 md:pt-28"
              : "min-h-dvh pb-6 pt-24 md:pt-28"
        }
      >
        {view === "editor" && clip ? (
          <ClipEditorWorkspace
            clip={clip}
            savedClipId={activeSavedClipId}
            savedClipName={activeSavedClipName}
            initialEditorState={
              routeSavedClipId ? savedClipDetail?.editorState ?? null : null
            }
            startOnMontage={startOnMontage}
          />
        ) : view === "loading" ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
            <div className="relative aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border border-secondary-color/60 bg-black shadow-[0_0_60px_rgba(205,183,255,0.08)]">
              <ClipProgressOverlay
                progress={importProgress}
                phase={
                  routeSavedClipId && isLoadingSavedClip
                    ? "Chargement du clip…"
                    : importPhase
                }
                title={
                  routeSavedClipId && isLoadingSavedClip
                    ? "Ouverture du clip"
                    : "Conversion en cours"
                }
              />
            </div>
            <p className="mt-5 max-w-sm text-center text-sm text-white/45">
              {routeSavedClipId && isLoadingSavedClip
                ? "Récupération de ton montage sauvegardé."
                : "Le serveur prépare ta preview 9:16. La durée dépend de la taille de la vidéo."}
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl px-4 md:px-8 lg:px-12">
            <header className="mb-10 md:mb-14">
              <p className="mb-2 text-sm font-extrabold uppercase tracking-[0.2em] text-main-color">
                Studio clip
              </p>
              <h1 className="text-3xl font-extrabold uppercase tracking-wide md:text-4xl lg:text-5xl">
                Éditeur de clips
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/50 md:text-base">
                Importe un clip Twitch ou une vidéo depuis ton PC pour commencer
                le montage vertical.
              </p>
            </header>

            <section className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <div className="min-h-[360px] rounded-3xl border border-secondary-color/50 bg-background-secondary p-6 md:p-8">
                <TwitchClipImport
                  onSubmit={handleTwitchSubmit}
                  disabled={isLoading}
                />
              </div>
              <div className="min-h-[360px] rounded-3xl border border-secondary-color/50 bg-background-secondary p-6 md:p-8">
                <VideoFileDropzone
                  onSubmit={handleFileSubmit}
                  disabled={isLoading}
                />
              </div>
            </section>

            <div className="mt-6">
              <Link
                to="/clips-enregistres"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-secondary-color/50 bg-background-secondary px-4 py-4 text-sm font-extrabold uppercase tracking-wide text-white/55 transition-all hover:border-main-color/40 hover:text-main-color sm:w-auto sm:px-6"
              >
                <FolderOpen className="size-4" />
                Parcourir les clips
              </Link>
            </div>
          </div>
        )}
      </div>

      <ClipNameDialog
        open={nameDialogOpen}
        defaultName={pendingClip?.originalName ?? ""}
        onClose={handleCloseNameDialog}
        onConfirm={(name) => void handleConfirmClipName(name)}
        isSubmitting={createSavedClip.isPending}
      />
    </>
  );
}
