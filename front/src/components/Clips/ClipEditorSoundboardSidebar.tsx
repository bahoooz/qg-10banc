import { Loader2, Pause, Plus, Search, Upload, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSoundboardSearch } from "../../hooks/useSoundboardSearch";
import {
  probeAudioDurationSec,
  SOUNDBOARD_VOLUME_RANGE,
} from "../../lib/clipSoundboards";
import type { SoundboardCatalogItem } from "../../lib/soundboardCatalog";
import { useClipEditorStore } from "../../stores/clipEditorStore";

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
        {label}{" "}
        <span className="tabular-nums text-white/50">
          {Math.round(value * 100)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-main-color"
      />
    </label>
  );
}

function SoundboardListItem({
  item,
  isAdding,
  isPreviewActive,
  isPreviewPlaying,
  onPreview,
  onAdd,
}: {
  item: SoundboardCatalogItem;
  isAdding: boolean;
  isPreviewActive: boolean;
  isPreviewPlaying: boolean;
  onPreview: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-2 rounded-lg border border-secondary-color/40 bg-background px-2 py-2">
      <button
        type="button"
        onClick={onPreview}
        className={`flex size-8 shrink-0 items-center justify-center rounded-md transition-colors ${
          isPreviewActive
            ? "bg-main-color/30 text-main-color"
            : "bg-main-color/15 text-main-color hover:bg-main-color/25"
        }`}
        aria-label={
          isPreviewPlaying
            ? `Mettre en pause ${item.name}`
            : `Écouter ${item.name}`
        }
        title={isPreviewPlaying ? "Mettre en pause" : "Écouter l'aperçu"}
      >
        {isPreviewPlaying ? (
          <Pause className="size-3.5" />
        ) : (
          <Volume2 className="size-3.5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-white/85">{item.name}</p>
        <p className="truncate text-[10px] capitalize text-white/30">
          {item.category}
          {item.tags.length > 0 ? ` · ${item.tags.slice(0, 3).join(", ")}` : ""}
        </p>
      </div>

      <button
        type="button"
        disabled={isAdding}
        onClick={onAdd}
        className="flex size-8 shrink-0 items-center justify-center rounded-md border border-main-color/40 bg-main-color/10 text-main-color transition-all hover:border-main-color/60 hover:bg-main-color/20 disabled:opacity-40"
        aria-label={`Ajouter ${item.name} au montage`}
        title="Ajouter au montage"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

type PreviewState = {
  id: string;
  isPlaying: boolean;
};

export default function ClipEditorSoundboardSidebar() {
  const [query, setQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const soundboards = useClipEditorStore((s) => s.soundboards);
  const selectedSoundboardId = useClipEditorStore((s) => s.selectedSoundboardId);
  const addSoundboardClip = useClipEditorStore((s) => s.addSoundboardClip);
  const updateSoundboard = useClipEditorStore((s) => s.updateSoundboard);
  const deleteSelectedSoundboard = useClipEditorStore(
    (s) => s.deleteSelectedSoundboard,
  );

  const { data, isLoading, isFetching, error } = useSoundboardSearch(query);
  const results = data?.clips ?? [];

  const selectedClip = soundboards.find(
    (clip) => clip.id === selectedSoundboardId,
  );

  useEffect(
    () => () => {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
    },
    [],
  );

  const stopPreviewAudio = () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
  };

  const startPreviewAudio = (item: SoundboardCatalogItem) => {
    stopPreviewAudio();

    const audio = new Audio(item.src);
    previewAudioRef.current = audio;
    setPreviewState({ id: item.id, isPlaying: true });

    audio.addEventListener(
      "ended",
      () => {
        setPreviewState((current) =>
          current?.id === item.id
            ? { id: item.id, isPlaying: false }
            : current,
        );
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        setPreviewState((current) =>
          current?.id === item.id ? null : current,
        );
        toast.error(`Impossible de lire « ${item.name} »`);
      },
      { once: true },
    );

    void audio.play().catch(() => {
      setPreviewState(null);
      stopPreviewAudio();
      toast.error(`Impossible de lire « ${item.name} »`);
    });
  };

  const handlePreview = (item: SoundboardCatalogItem) => {
    const isSameItem = previewState?.id === item.id;
    const audio = previewAudioRef.current;

    if (isSameItem && audio) {
      if (previewState.isPlaying) {
        audio.pause();
        setPreviewState({ id: item.id, isPlaying: false });
        return;
      }

      audio.currentTime = 0;
      setPreviewState({ id: item.id, isPlaying: true });
      void audio.play().catch(() => {
        setPreviewState(null);
        stopPreviewAudio();
        toast.error(`Impossible de lire « ${item.name} »`);
      });
      return;
    }

    startPreviewAudio(item);
  };

  const handleAddSound = async (item: SoundboardCatalogItem) => {
    setIsAdding(true);
    try {
      const duration = await probeAudioDurationSec(item.src);
      const created = addSoundboardClip(item.src, item.name, duration);
      if (!created) {
        toast.error(
          "Impossible d'ajouter le son ici (hors segment ou durée trop courte)",
        );
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleImportFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setIsAdding(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("audio/")) continue;
        const src = URL.createObjectURL(file);
        const duration = await probeAudioDurationSec(src);
        const created = addSoundboardClip(
          src,
          file.name.replace(/\.[^.]+$/, ""),
          duration,
        );
        if (!created) {
          toast.error(`Impossible d'ajouter « ${file.name} » à la playhead`);
        }
      }
    } finally {
      setIsAdding(false);
    }
  };

  const sourceLabel =
    data?.source === "voicy"
      ? "Voicy — lib StreamLadder"
      : data?.source === "mixed"
        ? "Voicy + MyInstants"
        : "MyInstants — sons meme / TikTok";

  return (
    <aside
      data-clip-editor-panel
      className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-secondary-color/50 bg-background-secondary max-h-[min(42vh,360px)] lg:max-h-none lg:w-72 lg:self-stretch lg:border-b-0 lg:border-r"
    >
      <header className="shrink-0 border-b border-secondary-color/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Volume2 className="size-4 text-main-color" aria-hidden="true" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-main-color">
              Soundboards
            </p>
            <p className="text-[10px] text-white/35">{sourceLabel}</p>
          </div>
        </div>
      </header>

      {selectedClip ? (
        <section className="shrink-0 space-y-4 border-b border-secondary-color/40 px-4 py-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
              Son sélectionné
            </p>
            <p className="mt-1 truncate text-sm font-bold text-white/85">
              {selectedClip.label}
            </p>
          </div>

          <RangeControl
            label="Volume"
            value={selectedClip.volume}
            min={SOUNDBOARD_VOLUME_RANGE.min}
            max={SOUNDBOARD_VOLUME_RANGE.max}
            step={SOUNDBOARD_VOLUME_RANGE.step}
            unit="%"
            onChange={(volume) =>
              updateSoundboard(selectedClip.id, { volume })
            }
          />

          <button
            type="button"
            onClick={deleteSelectedSoundboard}
            className="w-full rounded-lg border border-red-400/40 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-red-400 transition-colors hover:bg-red-400/10"
          >
            Supprimer du montage
          </button>
        </section>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
        <div className="shrink-0 space-y-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher (vine boom, bruh, rizz…)"
              className="w-full rounded-xl border border-secondary-color/60 bg-background py-2.5 pl-9 pr-3 text-sm text-white/90 outline-none focus:border-main-color/50"
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleImportFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAdding}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-main-color/40 bg-main-color/5 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide text-main-color transition-colors hover:border-main-color/60 hover:bg-main-color/10 disabled:opacity-50"
          >
            <Upload className="size-4" />
            Importer mes sons
          </button>

          {isAdding && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Loader2 className="size-4 animate-spin" />
              Ajout du son…
            </div>
          )}
        </div>

        <div className="scrollbar-thin mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
          {(isLoading || isFetching) && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-white/40">
              <Loader2 className="size-4 animate-spin" />
              Chargement des sons…
            </div>
          ) : error ? (
            <p className="py-6 text-center text-xs text-red-400/90">
              {error instanceof Error
                ? error.message
                : "Erreur de chargement"}
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-xs text-white/35">
              Aucun son trouvé pour « {query.trim() || "cette recherche"} »
            </p>
          ) : (
            <div className="space-y-1.5 pb-1">
              {results.map((item) => (
                <SoundboardListItem
                  key={item.id}
                  item={item}
                  isAdding={isAdding}
                  isPreviewActive={previewState?.id === item.id}
                  isPreviewPlaying={
                    previewState?.id === item.id && previewState.isPlaying
                  }
                  onPreview={() => handlePreview(item)}
                  onAdd={() => void handleAddSound(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
