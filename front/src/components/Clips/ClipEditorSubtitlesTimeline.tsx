import {
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, Pause, Play, Trash2 } from "lucide-react";
import {
  buildPackedSegments,
  formatClipTime,
  getEditedDuration,
  sequenceTimeToSourceTime,
  snapTimeToKeepSegments,
  sourceTimeToSequenceTime,
} from "../../lib/clipTime";
import {
  moveSubtitleWordBySequenceOffset,
  remapTimedSubtitleWordsToSequence,
  resizeSubtitleWordAtSequenceEdge,
  type SequenceSubtitleWord,
} from "../../lib/clipSubtitles";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import ClipEditorPreviewVolumeSlider from "./ClipEditorPreviewVolumeSlider";

type ClipEditorSubtitlesTimelineProps = {
  disabled?: boolean;
};

type ScrubMode =
  | "video-track"
  | "word-start"
  | "word-end"
  | "word-move"
  | null;

type WordDragState = {
  wordId: string;
  initialClientX: number;
  initialSeqStart: number;
  initialSeqEnd: number;
};

const TIMELINE_ZOOM_RANGE = { min: 1, max: 10, step: 0.25 };

export default function ClipEditorSubtitlesTimeline({
  disabled = false,
}: ClipEditorSubtitlesTimelineProps) {
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const subtitleTrackRef = useRef<HTMLDivElement>(null);
  const videoTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const scrubModeRef = useRef<ScrubMode>(null);
  const wordDragRef = useRef<WordDragState | null>(null);
  const wordMovedRef = useRef(false);
  const sequenceTimeRef = useRef(0);
  const [timelineZoom, setTimelineZoom] = useState(1);

  const keepSegments = useClipEditorStore((s) => s.keepSegments);
  const currentTime = useClipEditorStore((s) => s.currentTime);
  const isPlaying = useClipEditorStore((s) => s.isPlaying);
  const isApplyingCut = useClipEditorStore((s) => s.isApplyingCut);
  const subtitleWords = useClipEditorStore((s) => s.subtitleWords);
  const subtitleTiming = useClipEditorStore((s) => s.subtitleTiming);
  const selectedSubtitleWordId = useClipEditorStore(
    (s) => s.selectedSubtitleWordId,
  );

  const setCurrentTime = useClipEditorStore((s) => s.setCurrentTime);
  const setIsPlaying = useClipEditorStore((s) => s.setIsPlaying);
  const setSelectedSubtitleWordId = useClipEditorStore(
    (s) => s.setSelectedSubtitleWordId,
  );
  const updateSubtitleWord = useClipEditorStore((s) => s.updateSubtitleWord);
  const addSubtitleWordAtSourceTime = useClipEditorStore(
    (s) => s.addSubtitleWordAtSourceTime,
  );
  const deleteSelectedSubtitleWord = useClipEditorStore(
    (s) => s.deleteSelectedSubtitleWord,
  );

  const segments = useMemo(
    () => buildPackedSegments(keepSegments),
    [keepSegments],
  );
  const editedDuration = useMemo(
    () => getEditedDuration(keepSegments),
    [keepSegments],
  );
  const sequenceTime = useMemo(
    () => sourceTimeToSequenceTime(currentTime, keepSegments),
    [currentTime, keepSegments],
  );
  const sequenceWords = useMemo(
    () =>
      remapTimedSubtitleWordsToSequence(
        subtitleWords,
        keepSegments,
        subtitleTiming,
      ),
    [subtitleWords, keepSegments, subtitleTiming],
  );

  const selectedSequenceWord = sequenceWords.find(
    (word) => word.id === selectedSubtitleWordId,
  );

  sequenceTimeRef.current = sequenceTime;

  const playheadPercent =
    editedDuration > 0 ? (sequenceTime / editedDuration) * 100 : 0;
  const playheadMotionStyle = isPlaying
    ? ({ willChange: "left, width" } as const)
    : undefined;

  const selectedWordCenterPercent = selectedSequenceWord
    ? (((selectedSequenceWord.sequenceStart + selectedSequenceWord.sequenceEnd) /
        2) /
        editedDuration) *
      100
    : 0;

  const scrollTimelineToFocus = useCallback(() => {
    const scroll = scrollContainerRef.current;
    const track = subtitleTrackRef.current;
    if (!scroll || !track || editedDuration <= 0) return;

    const focusedWord = sequenceWords.find(
      (word) => word.id === selectedSubtitleWordId,
    );
    const focusRatio = focusedWord
      ? (focusedWord.sequenceStart + focusedWord.sequenceEnd) / 2 / editedDuration
      : sequenceTimeRef.current / editedDuration;

    const targetX = focusRatio * track.offsetWidth - scroll.clientWidth / 2;
    const maxScroll = Math.max(0, track.offsetWidth - scroll.clientWidth);
    scroll.scrollLeft = Math.max(0, Math.min(targetX, maxScroll));
  }, [editedDuration, selectedSubtitleWordId, sequenceWords]);

  useEffect(() => {
    scrollTimelineToFocus();
  }, [selectedSubtitleWordId, timelineZoom, scrollTimelineToFocus]);

  const seekFromClientX = useCallback(
    (clientX: number, trackElement: HTMLDivElement | null) => {
      const track = trackElement ?? videoTrackRef.current;
      if (!track || editedDuration <= 0) return;

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const seqTime = ratio * editedDuration;
      const sourceTime = sequenceTimeToSourceTime(seqTime, keepSegments);
      setCurrentTime(snapTimeToKeepSegments(sourceTime, keepSegments));
    },
    [editedDuration, keepSegments, setCurrentTime],
  );

  const applyWordDragAtClientX = (clientX: number, mode: ScrubMode) => {
    const track = subtitleTrackRef.current;
    const drag = wordDragRef.current;
    if (!track || editedDuration <= 0 || !drag || !mode) return;

    const word = subtitleWords.find((item) => item.id === drag.wordId);
    if (!word) return;

    const rect = track.getBoundingClientRect();

    if (mode === "word-move") {
      const deltaX = clientX - drag.initialClientX;
      const sequenceOffset = (deltaX / rect.width) * editedDuration;
      const updated = moveSubtitleWordBySequenceOffset(
        word,
        sequenceOffset,
        keepSegments,
        subtitleTiming,
        drag.initialSeqStart,
        drag.initialSeqEnd,
      );
      if (updated) {
        updateSubtitleWord(word.id, {
          start: updated.start,
          end: updated.end,
        });
      }
      return;
    }

    const ratio = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const seqTime = ratio * editedDuration;
    const edge = mode === "word-start" ? "start" : "end";
    const fixedBound =
      edge === "start" ? drag.initialSeqEnd : drag.initialSeqStart;

    const bounds = resizeSubtitleWordAtSequenceEdge(
      word,
      edge,
      seqTime,
      fixedBound,
      keepSegments,
      subtitleTiming,
      editedDuration,
    );
    if (bounds) {
      updateSubtitleWord(word.id, bounds);
    }
  };

  const handleVideoTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || editedDuration <= 0) return;

    isDraggingRef.current = true;
    scrubModeRef.current = "video-track";
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPlaying(false);
    setSelectedSubtitleWordId(null);
    seekFromClientX(event.clientX, videoTrackRef.current);
  };

  const handleSubtitleTrackPointerDown = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (disabled || editedDuration <= 0) return;

    const target = event.target as HTMLElement;
    if (target.dataset.subtitleWord === "true") return;
    if (target.closest("[data-word-edge='true']")) return;
    if (target.closest("[data-word-action='true']")) return;

    const track = subtitleTrackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    );
    const seqTime = ratio * editedDuration;
    const sourceTime = sequenceTimeToSourceTime(seqTime, keepSegments);
    addSubtitleWordAtSourceTime(sourceTime);
  };

  const handleWordBodyPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    word: SequenceSubtitleWord,
  ) => {
    if (disabled) return;

    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current = "word-move";
    wordDragRef.current = {
      wordId: word.id,
      initialClientX: event.clientX,
      initialSeqStart: word.sequenceStart,
      initialSeqEnd: word.sequenceEnd,
    };
    wordMovedRef.current = false;
    setSelectedSubtitleWordId(word.id);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleWordEdgePointerDown = (
    event: PointerEvent<HTMLDivElement>,
    word: SequenceSubtitleWord,
    edge: "start" | "end",
  ) => {
    if (disabled) return;

    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current = edge === "start" ? "word-start" : "word-end";
    wordDragRef.current = {
      wordId: word.id,
      initialClientX: event.clientX,
      initialSeqStart: word.sequenceStart,
      initialSeqEnd: word.sequenceEnd,
    };
    setSelectedSubtitleWordId(word.id);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleScrubPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!isDraggingRef.current || disabled) return;

    const mode = scrubModeRef.current;
    if (mode === "word-start" || mode === "word-end" || mode === "word-move") {
      wordMovedRef.current = true;
      applyWordDragAtClientX(event.clientX, mode);
      return;
    }

    if (mode === "video-track") {
      seekFromClientX(event.clientX, videoTrackRef.current);
    }
  };

  const handleScrubPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    scrubModeRef.current = null;
    wordDragRef.current = null;

    const captureTarget = event.target;
    if (
      captureTarget instanceof Element &&
      captureTarget.hasPointerCapture(event.pointerId)
    ) {
      captureTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWordPointerUp = (
    event: PointerEvent<HTMLElement>,
    word: SequenceSubtitleWord,
  ) => {
    if (!wordMovedRef.current) {
      setSelectedSubtitleWordId(word.id);
      setCurrentTime(word.start);
    }
    wordMovedRef.current = false;
    handleScrubPointerUp(event);
  };

  if (editedDuration <= 0) return null;

  const isBusy = disabled;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-secondary-color/50 bg-background-secondary px-4 py-4 md:px-6 md:py-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={isBusy}
          className="flex size-10 items-center justify-center rounded-xl bg-main-color text-background transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
          aria-label={isPlaying ? "Pause" : "Lecture"}
        >
          {isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5 ml-0.5" />
          )}
        </button>

        <span className="text-xs font-extrabold tabular-nums tracking-wide text-white/50">
          {formatClipTime(sequenceTime)}
          <span className="text-white/25"> / </span>
          {formatClipTime(editedDuration)}
        </span>

        {isApplyingCut && (
          <span className="inline-flex items-center gap-2 text-xs text-main-color">
            <Loader2 className="size-4 animate-spin" />
            FFmpeg…
          </span>
        )}

        {selectedSequenceWord && !isBusy && (
          <button
            type="button"
            onClick={deleteSelectedSubtitleWord}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-background px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-red-400 transition-all hover:bg-red-400/10 md:text-xs"
          >
            <Trash2 className="size-4" />
            Supprimer le mot
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <ClipEditorPreviewVolumeSlider />

          <label className="flex min-w-[148px] items-center gap-2">
            <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-white/30">
              Zoom {Math.round(timelineZoom * 100)}%
            </span>
            <input
              type="range"
              min={TIMELINE_ZOOM_RANGE.min}
              max={TIMELINE_ZOOM_RANGE.max}
              step={TIMELINE_ZOOM_RANGE.step}
              value={timelineZoom}
              onChange={(event) => setTimelineZoom(Number(event.target.value))}
              className="w-full accent-main-color"
              aria-label="Zoom horizontal de la timeline"
            />
          </label>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-visible pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-secondary-color/80 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        <div
          className="relative min-w-full"
          style={{ width: `${timelineZoom * 100}%` }}
        >
          <div
            ref={trackAreaRef}
            className="relative space-y-2 overflow-visible pb-2 pt-10"
            onPointerMove={handleScrubPointerMove}
            onPointerUp={handleScrubPointerUp}
            onPointerCancel={handleScrubPointerUp}
          >
          <div
            ref={subtitleTrackRef}
            role="slider"
            aria-label="Timeline sous-titres"
            tabIndex={0}
            onPointerDown={handleSubtitleTrackPointerDown}
            className={`relative h-10 rounded-xl border border-secondary-color/40 bg-background/80 touch-none select-none ${
              isBusy ? "cursor-not-allowed opacity-40" : "cursor-cell"
            }`}
          >
            {selectedSequenceWord && !isBusy && (
              <button
                type="button"
                data-word-action="true"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={deleteSelectedSubtitleWord}
                className="absolute -top-10 z-30 flex size-9 -translate-x-1/2 items-center justify-center rounded-xl border border-red-400/40 bg-background text-red-400 shadow-lg transition-all hover:scale-105 hover:bg-red-400/10 active:scale-95"
                style={{ left: `${selectedWordCenterPercent}%` }}
                aria-label="Supprimer le mot sélectionné"
                title="Supprimer ce mot"
              >
                <Trash2 className="size-4" />
              </button>
            )}

            <span className="pointer-events-none absolute -top-5 left-0 text-[9px] font-extrabold uppercase tracking-wide text-white/30">
              Sous-titres
            </span>

            {sequenceWords.map((word) => {
              const left = (word.sequenceStart / editedDuration) * 100;
              const width =
                ((word.sequenceEnd - word.sequenceStart) / editedDuration) *
                100;
              const isSelected = word.id === selectedSubtitleWordId;

              return (
                <div
                  key={word.id}
                  className="absolute inset-y-1 z-20"
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.4)}%` }}
                >
                  <button
                    type="button"
                    data-subtitle-word="true"
                    onPointerDown={(event) =>
                      handleWordBodyPointerDown(event, word)
                    }
                    onPointerUp={(event) => handleWordPointerUp(event, word)}
                    onPointerCancel={(event) => handleWordPointerUp(event, word)}
                    className={`absolute inset-0 cursor-grab rounded-md border px-1 text-left transition-all active:cursor-grabbing ${
                      isSelected
                        ? "border-main-color bg-main-color/25 ring-1 ring-main-color/40"
                        : "border-main-color/35 bg-main-color/10 hover:bg-main-color/20"
                    }`}
                    aria-label={`${word.text} · ${formatClipTime(word.sequenceStart)} à ${formatClipTime(word.sequenceEnd)}`}
                    aria-pressed={isSelected}
                  >
                    <span className="pointer-events-none block truncate text-[9px] font-extrabold uppercase tracking-wide text-main-color/90">
                      {word.text}
                    </span>
                  </button>

                  {isSelected && (
                    <>
                      <div
                        role="presentation"
                        data-word-edge="true"
                        onPointerDown={(event) =>
                          handleWordEdgePointerDown(event, word, "start")
                        }
                        className="absolute inset-y-1 left-0 z-30 w-2 -translate-x-1/2 cursor-ew-resize rounded bg-main-color/80"
                        aria-label="Ajuster le début du mot"
                      />
                      <div
                        role="presentation"
                        data-word-edge="true"
                        onPointerDown={(event) =>
                          handleWordEdgePointerDown(event, word, "end")
                        }
                        className="absolute inset-y-1 right-0 z-30 w-2 translate-x-1/2 cursor-ew-resize rounded bg-main-color/80"
                        aria-label="Ajuster la fin du mot"
                      />
                    </>
                  )}
                </div>
              );
            })}

            <div
              className="pointer-events-none absolute top-1/2 z-10 h-8 w-0.5 -translate-y-1/2 bg-main-color/40"
              style={{ left: `${playheadPercent}%`, ...playheadMotionStyle }}
            />
          </div>

          <div
            ref={videoTrackRef}
            role="slider"
            aria-label="Timeline vidéo"
            aria-valuemin={0}
            aria-valuemax={editedDuration}
            aria-valuenow={sequenceTime}
            tabIndex={0}
            onPointerDown={handleVideoTrackPointerDown}
            onPointerMove={handleScrubPointerMove}
            onPointerUp={handleScrubPointerUp}
            onPointerCancel={handleScrubPointerUp}
            className={`relative h-14 rounded-xl border border-secondary-color/60 bg-background touch-none select-none ${
              isBusy ? "cursor-not-allowed opacity-40" : "cursor-pointer"
            }`}
          >
            <div
              className="pointer-events-none absolute inset-y-2 left-0 overflow-hidden rounded-lg bg-secondary-color/30"
              style={{ width: `${playheadPercent}%`, ...playheadMotionStyle }}
            />

            {segments.map((segment) => {
              const left = (segment.sequenceStart / editedDuration) * 100;
              const width =
                ((segment.sequenceEnd - segment.sequenceStart) /
                  editedDuration) *
                100;

              return (
                <div
                  key={segment.id}
                  className="pointer-events-none absolute inset-y-1 rounded-md bg-white/5"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              );
            })}

            <div
              data-playhead="true"
              className="pointer-events-none absolute top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${playheadPercent}%`, ...playheadMotionStyle }}
            >
              <div className="relative h-9 w-1 rounded-full bg-main-color shadow-[0_0_8px_rgba(205,183,255,0.6)]" />
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
