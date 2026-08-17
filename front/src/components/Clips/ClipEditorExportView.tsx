import { Loader2, Plus, RefreshCw, Save, UserPlus, Youtube } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatClipTime } from "../../lib/clipTime";
import { buildClipExportPayloadAsync } from "../../lib/buildClipExportPayload";
import { useExportClip } from "../../hooks/useExportClip";
import {
  useSocialAccounts,
  type SocialAccount,
  type SocialPlatform,
} from "../../hooks/useSocialAccounts";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import ClipProgressOverlay from "./ClipProgressOverlay";
import ClipTikTokPublishForm from "./ClipTikTokPublishForm";
import ClipYouTubePublishForm from "./ClipYouTubePublishForm";
import SocialAccountConnectModal from "./SocialAccountConnectModal";
import ClipTemplateSaveDialog from "./ClipTemplateSaveDialog";
import AppCheckbox from "../ui/AppCheckbox";
import {
  buildAccountSelectionKey,
  createDefaultTikTokPublishDraft,
  type TikTokPublishDraft,
} from "../../lib/tiktokPublish";
import {
  createDefaultYouTubePublishDraft,
  type YouTubePublishDraft,
} from "../../lib/youtubePublish";

function AccountPlatformBadge({ platform }: { platform: SocialPlatform }) {
  if (platform === "youtube") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wide text-red-400/80">
        <Youtube className="size-3 shrink-0" aria-hidden="true" />
        YouTube
      </span>
    );
  }

  if (platform === "tiktok") {
    return (
      <span className="rounded bg-[#010101] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
        TikTok
      </span>
    );
  }

  return (
    <span className="text-[9px] font-extrabold uppercase tracking-wide text-white/30">
      {platform}
    </span>
  );
}

type SelectableAccountCardProps = {
  account: SocialAccount;
  selected: boolean;
  onToggle: () => void;
};

function SelectableAccountCard({
  account,
  selected,
  onToggle,
}: SelectableAccountCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={`flex min-w-[200px] max-w-[240px] shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition-all ${
        selected
          ? "border-main-color/60 bg-main-color/10 shadow-[0_0_20px_rgba(205,183,255,0.08)]"
          : "border-secondary-color/50 bg-background-secondary hover:border-secondary-color"
      }`}
    >
      <AppCheckbox checked={selected} onChange={() => onToggle()} />
      {account.avatar ? (
        <img
          src={account.avatar}
          alt=""
          className="size-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="size-8 shrink-0 rounded-full bg-secondary-color/40" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-white/85">{account.label}</p>
        <AccountPlatformBadge platform={account.platform} />
      </div>
    </div>
  );
}

export default function ClipEditorExportView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [templateSaveOpen, setTemplateSaveOpen] = useState(false);
  const [selectedAccountKeys, setSelectedAccountKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [tiktokDrafts, setTiktokDrafts] = useState<
    Record<string, TikTokPublishDraft>
  >({});
  const [youtubeDrafts, setYoutubeDrafts] = useState<
    Record<string, YouTubePublishDraft>
  >({});
  const hasTriggeredExportRef = useRef(false);

  const exportUrl = useClipEditorStore((s) => s.exportUrl);
  const exportResult = useClipEditorStore((s) => s.exportResult);
  const exportProgress = useClipEditorStore((s) => s.exportProgress);
  const exportPhase = useClipEditorStore((s) => s.exportPhase);
  const isExporting = useClipEditorStore((s) => s.isExporting);
  const clipId = useClipEditorStore((s) => s.clipId);
  const sourceDuration = useClipEditorStore((s) => s.sourceDuration);
  const setExportResult = useClipEditorStore((s) => s.setExportResult);

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

  const handleRelaunchExport = () => {
    setExportResult(null);
    void buildClipExportPayloadAsync()
      .then((payload) => exportClip.mutate(payload))
      .catch(() => {
        // erreur gérée par useExportClip
      });
  };

  const toggleAccount = (account: SocialAccount) => {
    const key = buildAccountSelectionKey(account.platform, account.id);
    setSelectedAccountKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        if (account.platform === "tiktok" && !tiktokDrafts[account.id]) {
          setTiktokDrafts((drafts) => ({
            ...drafts,
            [account.id]: createDefaultTikTokPublishDraft(),
          }));
        }
        if (account.platform === "youtube" && !youtubeDrafts[account.id]) {
          setYoutubeDrafts((drafts) => ({
            ...drafts,
            [account.id]: createDefaultYouTubePublishDraft(),
          }));
        }
      }
      return next;
    });
  };

  const selectedTikTokAccounts = accounts.filter(
    (account) =>
      account.platform === "tiktok" &&
      selectedAccountKeys.has(
        buildAccountSelectionKey(account.platform, account.id),
      ),
  );

  const selectedYouTubeAccounts = accounts.filter(
    (account) =>
      account.platform === "youtube" &&
      selectedAccountKeys.has(
        buildAccountSelectionKey(account.platform, account.id),
      ),
  );

  const videoDurationSec = exportResult?.duration ?? sourceDuration;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
      <div className="flex shrink-0 flex-col items-center justify-center border-b border-secondary-color/40 p-4 sm:w-[min(320px,38vw)] sm:border-b-0 sm:border-r sm:p-5">
        <div className="flex w-full max-w-[280px] flex-col items-center gap-3">
          <div className="relative aspect-[9/16] w-full max-h-[min(52vh,520px)] overflow-hidden rounded-2xl border border-secondary-color/60 bg-black shadow-[0_0_60px_rgba(205,183,255,0.08)]">
            {isEncoding && (
              <ClipProgressOverlay
                progress={exportProgress}
                phase={exportPhase || "Préparation"}
                title="Encodage en cours"
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

          {exportUrl && !isEncoding && (
            <button
              type="button"
              disabled={exportClip.isPending}
              onClick={handleRelaunchExport}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-main-color/40 bg-main-color/10 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-main-color transition-all hover:bg-main-color/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exportClip.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Relancer l&apos;exportation
            </button>
          )}

          <button
            type="button"
            onClick={() => setTemplateSaveOpen(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-secondary-color/60 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white/55 transition-all hover:border-main-color/40 hover:text-main-color"
          >
            <Save className="size-3.5" />
            Sauvegarder la template
          </button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <section className="rounded-2xl border border-secondary-color/50 bg-background px-4 py-3 md:px-5 md:py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-main-color">
                  Comptes
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  Coche les comptes sur lesquels publier ce clip.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-color/60 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-main-color transition-all hover:border-main-color/50 hover:bg-main-color/5"
              >
                <Plus className="size-3.5" />
                Ajouter
              </button>
            </div>

            {accountsLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-white/40">
                <Loader2 className="size-4 animate-spin" />
                Chargement des comptes…
              </div>
            ) : accounts.length === 0 ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-main-color/40 bg-main-color/5 px-4 py-5 transition-all hover:border-main-color/60 hover:bg-main-color/10"
              >
                <UserPlus className="size-6 text-main-color" />
                <span className="text-sm font-extrabold uppercase tracking-wide text-main-color">
                  Connecter un compte
                </span>
              </button>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {accounts.map((account) => {
                  const key = buildAccountSelectionKey(account.platform, account.id);
                  return (
                    <SelectableAccountCard
                      key={key}
                      account={account}
                      selected={selectedAccountKeys.has(key)}
                      onToggle={() => toggleAccount(account)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {selectedTikTokAccounts.map((account) => (
            <ClipTikTokPublishForm
              key={account.id}
              openId={account.id}
              accountLabel={account.label}
              videoUrl={exportUrl}
              videoDurationSec={videoDurationSec}
              draft={tiktokDrafts[account.id] ?? createDefaultTikTokPublishDraft()}
              onChange={(draft) =>
                setTiktokDrafts((prev) => ({ ...prev, [account.id]: draft }))
              }
            />
          ))}

          {selectedYouTubeAccounts.map((account) => (
            <ClipYouTubePublishForm
              key={account.id}
              accountId={account.id}
              accountLabel={account.label}
              videoUrl={exportUrl}
              videoDurationSec={videoDurationSec}
              draft={youtubeDrafts[account.id] ?? createDefaultYouTubePublishDraft()}
              onChange={(draft) =>
                setYoutubeDrafts((prev) => ({ ...prev, [account.id]: draft }))
              }
            />
          ))}
        </div>
      </div>

      <SocialAccountConnectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accounts={accounts}
      />

      <ClipTemplateSaveDialog
        open={templateSaveOpen}
        onClose={() => setTemplateSaveOpen(false)}
      />
    </div>
  );
}
