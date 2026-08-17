import { ExternalLink, Loader2, Upload, Youtube } from "lucide-react";
import AppCheckbox from "../ui/AppCheckbox";
import { usePublishYouTube } from "../../hooks/usePublishYouTube";
import {
  YOUTUBE_CATEGORIES,
  YOUTUBE_PRIVACY_LABELS,
  YOUTUBE_SHORTS_MAX_DURATION_SEC,
  buildYouTubePublishPayload,
  type YouTubePublishDraft,
  type YouTubePublishResult,
} from "../../lib/youtubePublish";

type ClipYouTubePublishFormProps = {
  accountId: string;
  accountLabel: string;
  videoUrl: string | null;
  videoDurationSec: number;
  draft: YouTubePublishDraft;
  onChange: (draft: YouTubePublishDraft) => void;
  onPublished?: (result: YouTubePublishResult) => void;
};

export default function ClipYouTubePublishForm({
  accountId,
  accountLabel,
  videoUrl,
  videoDurationSec,
  draft,
  onChange,
  onPublished,
}: ClipYouTubePublishFormProps) {
  const publish = usePublishYouTube();
  const durationOk = videoDurationSec <= YOUTUBE_SHORTS_MAX_DURATION_SEC;
  const canPublish = Boolean(
    videoUrl &&
      draft.title.trim() &&
      draft.privacyStatus &&
      durationOk &&
      !publish.isPending,
  );

  const handlePublish = () => {
    if (!videoUrl) return;

    const payload = buildYouTubePublishPayload(accountId, videoUrl, draft);
    if (!payload) return;

    publish.mutate(payload, {
      onSuccess: (data) => {
        onPublished?.(data.result);
      },
    });
  };

  return (
    <div className="rounded-2xl border border-secondary-color/50 bg-background-secondary/60 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-red-600/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
          <Youtube className="size-3 shrink-0" aria-hidden="true" />
          YouTube
        </span>
        <p className="truncate text-sm font-bold text-white/85">{accountLabel}</p>
      </div>

      <div className="space-y-4">
        {!videoUrl && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            Exporte d&apos;abord le clip avant de publier sur YouTube.
          </p>
        )}

        {!durationOk && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            Durée max Short : {YOUTUBE_SHORTS_MAX_DURATION_SEC}s (clip :{" "}
            {Math.round(videoDurationSec)}s)
          </p>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-white/45">
            Titre
          </span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
            maxLength={100}
            placeholder="Titre du Short"
            className="w-full rounded-xl border border-secondary-color/60 bg-background px-3 py-2.5 text-sm text-white/90 outline-none transition-colors focus:border-main-color/50"
          />
          <span className="text-[10px] text-white/30">
            {draft.title.length}/100
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-white/45">
            Description
          </span>
          <textarea
            value={draft.description}
            onChange={(event) =>
              onChange({ ...draft, description: event.target.value })
            }
            rows={4}
            maxLength={5000}
            placeholder="Description, liens, hashtags…"
            className="w-full resize-none rounded-xl border border-secondary-color/60 bg-background px-3 py-2.5 text-sm text-white/90 outline-none transition-colors focus:border-main-color/50"
          />
          <span className="text-[10px] text-white/30">
            {draft.description.length}/5000
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-white/45">
            Visibilité
          </span>
          <select
            value={draft.privacyStatus}
            onChange={(event) =>
              onChange({
                ...draft,
                privacyStatus: event.target.value as YouTubePublishDraft["privacyStatus"],
              })
            }
            className="w-full rounded-xl border border-secondary-color/60 bg-background px-3 py-2.5 text-sm text-white/90 outline-none focus:border-main-color/50"
          >
            <option value="">Choisir une visibilité…</option>
            {(Object.keys(YOUTUBE_PRIVACY_LABELS) as Array<
              keyof typeof YOUTUBE_PRIVACY_LABELS
            >).map((option) => (
              <option key={option} value={option}>
                {YOUTUBE_PRIVACY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-white/45">
            Catégorie
          </span>
          <select
            value={draft.categoryId}
            onChange={(event) =>
              onChange({
                ...draft,
                categoryId: event.target.value as YouTubePublishDraft["categoryId"],
              })
            }
            className="w-full rounded-xl border border-secondary-color/60 bg-background px-3 py-2.5 text-sm text-white/90 outline-none focus:border-main-color/50"
          >
            {YOUTUBE_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-white/45">
            Tags
          </span>
          <input
            type="text"
            value={draft.tags}
            onChange={(event) => onChange({ ...draft, tags: event.target.value })}
            placeholder="gaming, clip, twitch (séparés par des virgules)"
            className="w-full rounded-xl border border-secondary-color/60 bg-background px-3 py-2.5 text-sm text-white/90 outline-none transition-colors focus:border-main-color/50"
          />
          <span className="text-[10px] text-white/30">Max. 15 tags</span>
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleOption
            label="Contenu pour enfants"
            checked={draft.selfDeclaredMadeForKids}
            onChange={(checked) =>
              onChange({ ...draft, selfDeclaredMadeForKids: checked })
            }
            offLabel="Non"
            onLabel="Oui (made for kids)"
          />
          <ToggleOption
            label="Tag #Shorts"
            checked={draft.includeShortsTag}
            onChange={(checked) =>
              onChange({ ...draft, includeShortsTag: checked })
            }
            offLabel="Désactivé"
            onLabel="Ajouté auto"
          />
        </div>

        <button
          type="button"
          disabled={!canPublish}
          onClick={handlePublish}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-600/15 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-red-300 transition-all hover:bg-red-600/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {publish.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Publier sur YouTube
        </button>

        {publish.data?.result && (
          <a
            href={publish.data.result.shortsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-main-color hover:underline"
          >
            Voir le Short publié
            <ExternalLink className="size-3.5" />
          </a>
        )}

        <p className="rounded-xl border border-main-color/20 bg-main-color/5 px-3 py-2 text-[11px] leading-relaxed text-white/40">
          Upload via l&apos;API{" "}
          <code className="text-main-color/80">videos.insert</code>. YouTube
          classifie automatiquement en Short si la vidéo est verticale et
          courte.
        </p>
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
  offLabel,
  onLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  offLabel: string;
  onLabel: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChange(!checked);
        }
      }}
      className="flex cursor-pointer flex-col gap-2 rounded-xl border border-secondary-color/50 px-3 py-2.5 transition-colors hover:border-main-color/30"
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">
        {label}
      </span>
      <div className="flex items-center gap-2.5">
        <AppCheckbox checked={checked} onChange={onChange} />
        <span className="text-xs text-white/70">
          {checked ? onLabel : offLabel}
        </span>
      </div>
    </div>
  );
}
