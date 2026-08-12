import { Loader2, Plus, UserPlus, Youtube } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatClipTime } from "../../lib/clipTime";
import { buildClipExportPayloadAsync } from "../../lib/buildClipExportPayload";
import { useExportClip } from "../../hooks/useExportClip";
import {
  useSocialAccounts,
  type SocialPlatform,
} from "../../hooks/useSocialAccounts";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import ClipExportProgressOverlay from "./ClipExportProgressOverlay";
import SocialAccountConnectModal from "./SocialAccountConnectModal";

function AccountPlatformLabel({ platform }: { platform: SocialPlatform }) {
  if (platform === "youtube") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-red-400/80">
        <Youtube className="size-3 shrink-0" aria-hidden="true" />
        YouTube
      </span>
    );
  }

  return (
    <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
      {platform}
    </span>
  );
}

export default function ClipEditorExportView() {
  const [modalOpen, setModalOpen] = useState(false);
  const hasTriggeredExportRef = useRef(false);

  const exportUrl = useClipEditorStore((s) => s.exportUrl);
  const exportResult = useClipEditorStore((s) => s.exportResult);
  const exportProgress = useClipEditorStore((s) => s.exportProgress);
  const exportPhase = useClipEditorStore((s) => s.exportPhase);
  const isExporting = useClipEditorStore((s) => s.isExporting);
  const clipId = useClipEditorStore((s) => s.clipId);

  const exportClip = useExportClip({ openDownload: false });
  const { data: accounts = [], isLoading: accountsLoading } = useSocialAccounts();

  useEffect(() => {
    if (!clipId || exportUrl || isExporting || hasTriggeredExportRef.current) return;

    hasTriggeredExportRef.current = true;
    void buildClipExportPayloadAsync()
      .then((payload) => exportClip.mutate(payload))
      .catch(() => {
        hasTriggeredExportRef.current = false;
      });
  }, [clipId, exportUrl, exportClip, isExporting]);

  const isEncoding = !exportUrl && (isExporting || exportClip.isPending);

  const handleRetryExport = () => {
    hasTriggeredExportRef.current = false;
    void buildClipExportPayloadAsync()
      .then((payload) => exportClip.mutate(payload))
      .catch(() => {
        hasTriggeredExportRef.current = false;
      });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
      <div className="flex shrink-0 flex-col items-center justify-center border-b border-secondary-color/40 p-4 sm:w-[min(320px,38vw)] sm:border-b-0 sm:border-r sm:p-5">
        <div className="flex w-full max-w-[280px] flex-col items-center gap-3">
          <div className="relative aspect-[9/16] w-full max-h-[min(52vh,520px)] overflow-hidden rounded-2xl border border-secondary-color/60 bg-black shadow-[0_0_60px_rgba(205,183,255,0.08)]">
            {isEncoding && (
              <ClipExportProgressOverlay
                progress={exportProgress}
                phase={exportPhase || "Préparation"}
              />
            )}

            {!isEncoding && exportUrl ? (
              <video
                key={exportUrl}
                src={exportUrl}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            ) : !isEncoding ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-sm text-white/40">
                  {exportClip.isError
                    ? "L'encodage a échoué."
                    : "Preview export indisponible"}
                </p>
                {exportClip.isError && (
                  <button
                    type="button"
                    onClick={handleRetryExport}
                    className="rounded-xl border border-main-color/50 bg-main-color/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-main-color transition-all hover:bg-main-color/15"
                  >
                    Réessayer
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {exportResult && !isEncoding && (
            <p className="text-xs font-extrabold tabular-nums tracking-wide text-white/45">
              {exportResult.width}×{exportResult.height}
              <span className="text-white/25"> · </span>
              {formatClipTime(exportResult.duration)}
            </p>
          )}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-y-auto p-4 lg:p-6">
        <div className="w-full max-w-md rounded-3xl border border-secondary-color/50 bg-background p-5 md:p-6">
          <section className="space-y-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-main-color">
                Comptes
              </p>
              <p className="mt-1 text-sm text-white/45">
                Connecte tes comptes pour préparer la publication automatique.
              </p>
            </div>

            {accountsLoading ? (
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Loader2 className="size-4 animate-spin" />
                Chargement des comptes…
              </div>
            ) : accounts.length === 0 ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-main-color/40 bg-main-color/5 px-4 py-10 transition-all hover:border-main-color/60 hover:bg-main-color/10"
              >
                <UserPlus className="size-8 text-main-color" />
                <span className="text-sm font-extrabold uppercase tracking-wide text-main-color">
                  Ajouter un compte
                </span>
                <span className="text-xs text-white/35">
                  Instagram, TikTok ou YouTube
                </span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div
                      key={`${account.platform}-${account.id}`}
                      className="flex items-center gap-3 rounded-xl border border-secondary-color/50 bg-background-secondary px-3 py-2.5"
                    >
                      {account.avatar ? (
                        <img
                          src={account.avatar}
                          alt=""
                          className="size-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-9 rounded-full bg-secondary-color/40" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white/85">
                          {account.label}
                        </p>
                        <AccountPlatformLabel platform={account.platform} />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-secondary-color/60 bg-background px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-main-color transition-all hover:border-main-color/50 hover:bg-main-color/5"
                >
                  <Plus className="size-4" />
                  Ajouter un compte
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      <SocialAccountConnectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accounts={accounts}
      />
    </div>
  );
}
