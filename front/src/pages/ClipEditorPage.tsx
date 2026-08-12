import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { ClipImportResult } from "../../types";
import ClipEditorWorkspace from "../components/Clips/ClipEditorWorkspace";
import TwitchClipImport from "../components/Clips/TwitchClipImport";
import VideoFileDropzone from "../components/Clips/VideoFileDropzone";
import { useImportTwitchClip, useUploadClip } from "../hooks/useImportClip";
import { useQueryClient } from "@tanstack/react-query";
type EditorView = "import" | "loading" | "editor";

export default function ClipEditorPage() {
  const [view, setView] = useState<EditorView>("import");
  const [clip, setClip] = useState<ClipImportResult | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const uploadClip = useUploadClip();
  const importTwitch = useImportTwitchClip();

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

  const handleTwitchSubmit = async (payload: {
    url: string;
    twitchAccountId?: string;
  }) => {
    setView("loading");
    try {
      const result = await importTwitch.mutateAsync(payload);
      setClip(result);
      setView("editor");
    } catch {
      setView("import");
    }
  };
  const handleFileSubmit = async (file: File) => {
    setView("loading");
    try {
      const result = await uploadClip.mutateAsync(file);
      setClip(result);
      setView("editor");
    } catch {
      setView("import");
    }
  };

  return (
    <>
      <title>Éditeur de clips - QG10banc</title>

      <div
        className={
          view === "editor" && clip
            ? "flex h-dvh flex-col overflow-hidden pt-24 md:pt-28"
            : "min-h-dvh pb-6 pt-24 md:pt-28"
        }
      >
        {view === "editor" && clip ? (
          <ClipEditorWorkspace clip={clip} />
        ) : view === "loading" ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
            <Loader2 className="size-12 animate-spin text-main-color" />
            <div>
              <p className="text-xl font-extrabold uppercase tracking-wide">
                Conversion en vertical…
              </p>
              <p className="mt-2 max-w-sm text-sm text-white/45">
                Le serveur prépare ta preview 9:16. Ça peut prendre quelques
                secondes selon la taille de la vidéo.
              </p>
            </div>
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
          </div>
        )}
      </div>
    </>
  );
}
