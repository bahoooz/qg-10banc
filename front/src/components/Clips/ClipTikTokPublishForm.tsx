import { Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTikTokCreatorInfo } from "../../hooks/useTikTokCreatorInfo";
import AppCheckbox from "../ui/AppCheckbox";
import {
  TIKTOK_PRIVACY_LABELS,
  type TikTokPublishDraft,
} from "../../lib/tiktokPublish";

type ClipTikTokPublishFormProps = {
  openId: string;
  accountLabel: string;
  videoUrl: string | null;
  videoDurationSec: number;
  draft: TikTokPublishDraft;
  onChange: (draft: TikTokPublishDraft) => void;
};

function waitForVideoSeek(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 2 && Math.abs(video.currentTime - timeSec) < 0.05) {
      resolve();
      return;
    }

    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("seek_failed"));
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError, { once: true });
    video.currentTime = timeSec;
  });
}

function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1) return Promise.resolve();

  return new Promise((resolve, reject) => {
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(new Error("metadata_failed")), {
      once: true,
    });
  });
}

export default function ClipTikTokPublishForm({
  openId,
  accountLabel,
  videoUrl,
  videoDurationSec,
  draft,
  onChange,
}: ClipTikTokPublishFormProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialCaptureVideoRef = useRef<string | null>(null);
  const [isCapturingCover, setIsCapturingCover] = useState(false);
  const [sliderMaxMs, setSliderMaxMs] = useState(() =>
    Math.max(1000, Math.round(videoDurationSec * 1000)),
  );

  const { data: creatorInfo, isLoading, isError, error } =
    useTikTokCreatorInfo(openId);

  const captureCoverFromVideo = useCallback(
    async (timestampMs?: number) => {
      const video = videoRef.current;
      if (!video || !videoUrl) return;

      const ms = timestampMs ?? draft.coverTimestampMs;
      setIsCapturingCover(true);

      try {
        await waitForVideoMetadata(video);
        await waitForVideoSeek(video, ms / 1000);

        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) return;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, width, height);
        const coverPreviewUrl = canvas.toDataURL("image/jpeg", 0.85);

        onChange({
          ...draft,
          coverTimestampMs: ms,
          coverPreviewUrl,
        });
      } catch {
        // CORS ou chargement vidéo — l'import d'image reste disponible
      } finally {
        setIsCapturingCover(false);
      }
    },
    [draft, onChange, videoUrl],
  );

  useEffect(() => {
    setSliderMaxMs(Math.max(1000, Math.round(videoDurationSec * 1000)));
  }, [videoDurationSec]);

  useEffect(() => {
    if (!videoUrl) {
      initialCaptureVideoRef.current = null;
      return;
    }

    if (initialCaptureVideoRef.current === videoUrl) return;
    if (draft.coverPreviewUrl) {
      initialCaptureVideoRef.current = videoUrl;
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const runInitialCapture = () => {
      if (video.duration && Number.isFinite(video.duration)) {
        setSliderMaxMs(Math.max(1000, Math.round(video.duration * 1000)));
      }
      initialCaptureVideoRef.current = videoUrl;
      void captureCoverFromVideo(0);
    };

    if (video.readyState >= 1) {
      runInitialCapture();
      return;
    }

    video.addEventListener("loadedmetadata", runInitialCapture, { once: true });
    return () => video.removeEventListener("loadedmetadata", runInitialCapture);
  }, [videoUrl, draft.coverPreviewUrl, captureCoverFromVideo]);
  const handleCoverFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        ...draft,
        coverPreviewUrl:
          typeof reader.result === "string" ? reader.result : null,
      });
    };
    reader.readAsDataURL(file);
  };

  const maxDuration = creatorInfo?.maxVideoPostDurationSec ?? videoDurationSec;
  const durationOk = videoDurationSec <= maxDuration;

  return (
    <div className="rounded-2xl border border-secondary-color/50 bg-background-secondary/60 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-md bg-[#010101] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
          TikTok
        </span>
        <p className="truncate text-sm font-bold text-white/85">{accountLabel}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Loader2 className="size-4 animate-spin" />
          Chargement des options TikTok…
        </div>
      ) : isError ? (
        <p className="text-sm text-red-400/90">
          {error instanceof Error ? error.message : "Erreur TikTok"}
        </p>
      ) : (
        <div className="space-y-4">
          {!durationOk && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
              Durée max pour ce compte : {maxDuration}s (clip :{" "}
              {Math.round(videoDurationSec)}s)
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-white/45">
              Titre / description
            </span>
            <textarea
              value={draft.title}
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              rows={3}
              maxLength={2200}
              placeholder="Titre, #hashtags, @mentions…"
              className="w-full resize-none rounded-xl border border-secondary-color/60 bg-background px-3 py-2.5 text-sm text-white/90 outline-none transition-colors focus:border-main-color/50"
            />
            <span className="text-[10px] text-white/30">
              {draft.title.length}/2200 — hashtags et mentions supportés
            </span>
          </label>

          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-white/45">
              Miniature
            </span>
            <div className="flex gap-3">
              <div className="relative aspect-[9/16] w-20 shrink-0 overflow-visible">
                <div className="relative aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-lg border border-secondary-color/50 bg-black transition-transform duration-200 ease-out hover:z-20 hover:scale-[3] hover:shadow-[0_0_24px_rgba(0,0,0,0.6)] origin-top-left">
                {draft.coverPreviewUrl ? (
                  <img
                    src={draft.coverPreviewUrl}
                    alt="Miniature TikTok"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-white/30">
                    Aperçu
                  </div>
                )}
                {isCapturingCover && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="size-4 animate-spin text-main-color" />
                  </div>
                )}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                {videoUrl && (
                  <>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      crossOrigin="anonymous"
                      muted
                      playsInline
                      preload="auto"
                      className="pointer-events-none fixed size-0 opacity-0"
                    />
                    <label className="block space-y-1">
                      <span className="text-[10px] text-white/35">
                        Frame vidéo ({Math.round(draft.coverTimestampMs / 1000)}s)
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={sliderMaxMs}
                        step={100}
                        value={Math.min(draft.coverTimestampMs, sliderMaxMs)}
                        onChange={(event) => {
                          const coverTimestampMs = Number(event.target.value);
                          onChange({ ...draft, coverTimestampMs });
                        }}
                        onMouseUp={(event) =>
                          void captureCoverFromVideo(
                            Number((event.target as HTMLInputElement).value),
                          )
                        }
                        onTouchEnd={(event) =>
                          void captureCoverFromVideo(
                            Number((event.target as HTMLInputElement).value),
                          )
                        }
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary-color/50 accent-main-color [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-main-color [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(205,183,255,0.5)]"
                      />
                    </label>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleCoverFile(file);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-color/60 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white/60 transition-colors hover:border-main-color/40 hover:text-main-color"
                >
                  <Upload className="size-3.5" />
                  Importer une image
                </button>
              </div>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-white/45">
              Qui peut voir la vidéo
            </span>
            <select
              value={draft.privacyLevel}
              onChange={(event) =>
                onChange({
                  ...draft,
                  privacyLevel: event.target.value as TikTokPublishDraft["privacyLevel"],
                })
              }
              className="w-full rounded-xl border border-secondary-color/60 bg-background px-3 py-2.5 text-sm text-white/90 outline-none focus:border-main-color/50"
            >
              <option value="">Choisir une visibilité…</option>
              {(creatorInfo?.privacyLevelOptions ?? []).map((option) => (
                <option key={option} value={option}>
                  {TIKTOK_PRIVACY_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2 sm:grid-cols-3">
            <ToggleOption
              label="Commentaires"
              disabled={creatorInfo?.commentDisabled ?? false}
              checked={draft.disableComment}
              onChange={(checked) =>
                onChange({ ...draft, disableComment: checked })
              }
              offLabel="Autorisés"
              onLabel="Désactivés"
            />
            <ToggleOption
              label="Duos"
              disabled={creatorInfo?.duetDisabled ?? false}
              checked={draft.disableDuet}
              onChange={(checked) =>
                onChange({ ...draft, disableDuet: checked })
              }
              offLabel="Autorisés"
              onLabel="Désactivés"
            />
            <ToggleOption
              label="Stitches"
              disabled={creatorInfo?.stitchDisabled ?? false}
              checked={draft.disableStitch}
              onChange={(checked) =>
                onChange({ ...draft, disableStitch: checked })
              }
              offLabel="Autorisés"
              onLabel="Désactivés"
            />
          </div>

          <p className="rounded-xl border border-main-color/20 bg-main-color/5 px-3 py-2 text-[11px] leading-relaxed text-white/40">
            Publication directe disponible après review TikTok. Les champs sont
            préparés selon l&apos;API{" "}
            <code className="text-main-color/80">video.publish</code>.
          </p>
        </div>
      )}
    </div>
  );
}

function ToggleOption({
  label,
  disabled,
  checked,
  onChange,
  offLabel,
  onLabel,
}: {
  label: string;
  disabled: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  offLabel: string;
  onLabel: string;
}) {
  const toggle = () => {
    if (!disabled) onChange(!checked);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={toggle}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      }}
      className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
        disabled
          ? "cursor-not-allowed border-secondary-color/30 opacity-45"
          : "cursor-pointer border-secondary-color/50 hover:border-main-color/30"
      }`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">
        {label}
      </span>
      <div className="flex items-center gap-2.5">
        <AppCheckbox checked={checked} disabled={disabled} onChange={onChange} />
        <span className="text-xs text-white/70">
          {checked ? onLabel : offLabel}
        </span>
      </div>
    </div>
  );
}