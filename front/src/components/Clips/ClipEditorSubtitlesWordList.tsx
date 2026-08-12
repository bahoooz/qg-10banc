import { useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { formatSubtitleWordTime, sortSubtitleWords } from "../../lib/clipSubtitles";
import { useClipEditorStore } from "../../stores/clipEditorStore";

type ClipEditorSubtitlesWordListProps = {
  disabled?: boolean;
};

export default function ClipEditorSubtitlesWordList({
  disabled = false,
}: ClipEditorSubtitlesWordListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const subtitleWords = useClipEditorStore((s) => s.subtitleWords);
  const selectedSubtitleWordId = useClipEditorStore(
    (s) => s.selectedSubtitleWordId,
  );
  const isTranscribing = useClipEditorStore((s) => s.isTranscribing);
  const setSelectedSubtitleWordId = useClipEditorStore(
    (s) => s.setSelectedSubtitleWordId,
  );
  const updateSubtitleWord = useClipEditorStore((s) => s.updateSubtitleWord);
  const setCurrentTime = useClipEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useClipEditorStore((s) => s.setIsPlaying);

  const sortedWords = useMemo(
    () => sortSubtitleWords(subtitleWords),
    [subtitleWords],
  );

  useEffect(() => {
    if (!selectedSubtitleWordId || !listRef.current) return;
    const container = listRef.current;
    const node = container.querySelector(
      `[data-word-id="${selectedSubtitleWordId}"]`,
    );
    if (!(node instanceof HTMLElement)) return;

    const nodeTop = node.offsetTop;
    const nodeBottom = nodeTop + node.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;

    if (nodeTop < viewTop) {
      container.scrollTop = nodeTop;
    } else if (nodeBottom > viewBottom) {
      container.scrollTop = nodeBottom - container.clientHeight;
    }
  }, [selectedSubtitleWordId]);

  const handleSelectWord = (wordId: string, start: number) => {
    if (disabled) return;
    setSelectedSubtitleWordId(wordId);
    setCurrentTime(start);
    setIsPlaying(false);
  };

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-secondary-color/40 bg-background-secondary max-h-[min(42vh,360px)] lg:max-h-none lg:w-72 lg:self-stretch lg:border-b-0 lg:border-r">
      <div className="shrink-0 border-b border-secondary-color/40 px-4 py-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-main-color">
          Mots
        </p>
        <p className="mt-1 text-[11px] text-white/35">
          {isTranscribing ? (
            <span className="inline-flex items-center gap-1.5 text-main-color">
              <Loader2 className="size-3 animate-spin" />
              Transcription…
            </span>
          ) : (
            <span>{sortedWords.length} entrées</span>
          )}
        </p>
      </div>

      <div
        ref={listRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-scroll overscroll-contain p-3 [scrollbar-gutter:stable]"
      >
        <div className="flex flex-col gap-2">
        {!isTranscribing && sortedWords.length === 0 && (
          <p className="px-1 text-xs text-white/35">
            Aucun mot. Cliquez sur la piste Sous-titres pour en ajouter.
          </p>
        )}

        {sortedWords.map((word) => {
          const isSelected = word.id === selectedSubtitleWordId;

          return (
            <div
              key={word.id}
              data-word-id={word.id}
              className={`rounded-xl border px-3 py-2.5 transition-colors ${
                isSelected
                  ? "border-main-color/60 bg-main-color/10 ring-1 ring-main-color/30"
                  : "border-secondary-color/50 bg-background hover:border-main-color/30"
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelectWord(word.id, word.start)}
                disabled={disabled}
                className="mb-2 w-full text-left"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
                  {formatSubtitleWordTime(word.start)}
                  <span className="text-white/20"> → </span>
                  {formatSubtitleWordTime(word.end)}
                </p>
              </button>

              <input
                type="text"
                value={word.text}
                disabled={disabled}
                onFocus={() => handleSelectWord(word.id, word.start)}
                onChange={(event) =>
                  updateSubtitleWord(word.id, {
                    text: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-secondary-color/50 bg-background-secondary px-2.5 py-1.5 text-sm font-semibold text-white/90 outline-none transition-colors focus:border-main-color/50 disabled:opacity-50"
                aria-label={`Texte du mot à ${formatSubtitleWordTime(word.start)}`}
              />
            </div>
          );
        })}
        </div>
      </div>
    </aside>
  );
}
