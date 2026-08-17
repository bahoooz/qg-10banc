import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Film,
  Gauge,
  ImagePlus,
  Loader2,
  Pause,
  Play,
  Redo2,
  Scissors,
  Subtitles,
  Trash2,
  Type,
  Undo2,
  Volume2,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatClipTime,
  formatSpeedLabel,
  getEditedDuration,
  getPackedCutMarkers,
  removeKeepSegmentById,
  sequenceTimeToSourceTime,
  sourceTimeToSequenceTime,
  MAX_TIMELINE_HISTORY,
} from "../../lib/clipTime";
import {
  buildPackedSegmentsWithInserts,
  getActualBaseEndSequence,
  naturalToActualBeforeInsert,
  getTimelineInserts,
  type TimelineVideoImportKind,
} from "../../lib/clipTimelineInserts";
import {
  mapImageOverlaysToSequence,
  moveImageOverlayBySequenceOffset,
  normalizeImageOverlaySequenceStorage,
  imageOverlayUsesSequenceTime,
  updateImageOverlayBounds,
  type CreateImageOverlayOptions,
} from "../../lib/clipImageOverlays";
import {
  findTextOverlayForPlayhead,
  mapTextOverlaysToSequence,
  moveTextOverlayBySequenceOffset,
  updateTextOverlayBounds,
} from "../../lib/clipTextOverlays";
import {
  mapZoomEffectsToSequence,
  moveZoomEffectBySequenceOffset,
  updateZoomEffectBounds,
} from "../../lib/clipZoomEffects";
import {
  mapSoundboardsToSequence,
  moveSoundboardBySequenceOffset,
  updateSoundboardBounds,
} from "../../lib/clipSoundboards";
import {
  getTotalTimelineDuration,
  getTimelineVideoSequenceDuration,
  getTimelineVideoSpeed,
  moveTimelineVideoBySequenceOffset,
  resolveTimelineVideoPlacementStart,
  resolveTimelineVideoSequenceStart,
} from "../../lib/clipTimelineVideos";
import { useApplyClipCut } from "../../hooks/useApplyClipCut";
import ClipEditorPreviewVolumeSlider from "./ClipEditorPreviewVolumeSlider";
import ClipEditorTimelineZoomSlider from "./ClipEditorTimelineZoomSlider";
import ClipImageImportDialog from "./ClipImageImportDialog";
import ClipVideoImportDialog from "./ClipVideoImportDialog";
import ClipVideoImportKindDialog from "./ClipVideoImportKindDialog";
import ClipTimelinePlayheadLine from "./ClipTimelinePlayheadLine";
import ClipTimelineRuler from "./ClipTimelineRuler";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import type { ClipImportResult } from "../../../types";
import type { TimelineVideoLayoutMode } from "../../lib/clipTimelineVideos";
import {
  collectTimelineSnapPoints,
  snapSegmentMoveStart,
  snapSequenceTimeWithFeedback,
  type TimelineSnapExclude,
} from "../../lib/clipTimelineSnap";

function TimelineToolbarSeparator() {
  return (
    <div
      className="mx-5 hidden h-8 w-px shrink-0 bg-secondary-color/70 sm:block"
      aria-hidden="true"
    />
  );
}

type ScrubMode =
  | "track"
  | "effect-start"
  | "effect-end"
  | "effect-move"
  | "image-start"
  | "image-end"
  | "image-move"
  | "text-start"
  | "text-end"
  | "text-move"
  | "soundboard-start"
  | "soundboard-end"
  | "soundboard-move"
  | "timeline-video-move"
  | null;

type EffectDragState = {
  effectId: string;
  initialClientX: number;
  initialSeqStart: number;
  initialSeqEnd: number;
};

type ImageDragState = {
  overlayId: string;
  initialClientX: number;
  initialSeqStart: number;
  initialSeqEnd: number;
};

type TextDragState = {
  overlayId: string;
  initialClientX: number;
  initialSeqStart: number;
  initialSeqEnd: number;
};

type SoundboardDragState = {
  clipId: string;
  initialClientX: number;
  initialSeqStart: number;
  initialSeqEnd: number;
};

type TimelineVideoDragState = {
  clipId: string;
  initialClientX: number;
  initialSeqStart: number;
  previewSeqStart?: number;
};

export default function ClipEditorTimeline() {
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const [memeDragPreviewStart, setMemeDragPreviewStart] = useState<number | null>(
    null,
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const effectTrackRef = useRef<HTMLDivElement>(null);
  const imageTrackRef = useRef<HTMLDivElement>(null);
  const stickerTrackRef = useRef<HTMLDivElement>(null);
  const textTrackRef = useRef<HTMLDivElement>(null);
  const soundboardTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const scrubModeRef = useRef<ScrubMode>(null);
  const effectDragRef = useRef<EffectDragState | null>(null);
  const imageDragRef = useRef<ImageDragState | null>(null);
  const textDragRef = useRef<TextDragState | null>(null);
  const soundboardDragRef = useRef<SoundboardDragState | null>(null);
  const timelineVideoDragRef = useRef<TimelineVideoDragState | null>(null);
  const effectEditedRef = useRef(false);
  const imageEditedRef = useRef(false);
  const textEditedRef = useRef(false);
  const soundboardEditedRef = useRef(false);
  const timelineVideoEditedRef = useRef(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [videoKindDialogOpen, setVideoKindDialogOpen] = useState(false);
  const [videoImportKind, setVideoImportKind] =
    useState<TimelineVideoImportKind>("clip");
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);

  const currentTime = useClipEditorStore((s) => s.currentTime);
  const isPlaying = useClipEditorStore((s) => s.isPlaying);
  const isApplyingCut = useClipEditorStore((s) => s.isApplyingCut);
  const isExporting = useClipEditorStore((s) => s.isExporting);
  const clipId = useClipEditorStore((s) => s.clipId);
  const keepSegments = useClipEditorStore((s) => s.keepSegments);
  const selectedSegmentId = useClipEditorStore((s) => s.selectedSegmentId);
  const zoomEffects = useClipEditorStore((s) => s.zoomEffects);
  const selectedZoomEffectId = useClipEditorStore((s) => s.selectedZoomEffectId);
  const isZoomToolActive = useClipEditorStore((s) => s.isZoomToolActive);
  const imageOverlays = useClipEditorStore((s) => s.imageOverlays);
  const selectedImageOverlayId = useClipEditorStore(
    (s) => s.selectedImageOverlayId,
  );
  const isImageToolActive = useClipEditorStore((s) => s.isImageToolActive);
  const textOverlays = useClipEditorStore((s) => s.textOverlays);
  const selectedTextOverlayId = useClipEditorStore(
    (s) => s.selectedTextOverlayId,
  );
  const isTextToolActive = useClipEditorStore((s) => s.isTextToolActive);
  const soundboards = useClipEditorStore((s) => s.soundboards);
  const selectedSoundboardId = useClipEditorStore(
    (s) => s.selectedSoundboardId,
  );
  const isSoundboardToolActive = useClipEditorStore(
    (s) => s.isSoundboardToolActive,
  );
  const timelineVideos = useClipEditorStore((s) => s.timelineVideos);
  const selectedTimelineVideoId = useClipEditorStore(
    (s) => s.selectedTimelineVideoId,
  );
  const sequencePlayhead = useClipEditorStore((s) => s.sequencePlayhead);
  const timelineZoom = useClipEditorStore((s) => s.timelineZoom);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollbarRef = useRef<HTMLDivElement>(null);
  const isSyncingTimelineScrollRef = useRef(false);

  const syncTimelineScroll = useCallback((source: "timeline" | "bar") => {
    if (isSyncingTimelineScrollRef.current) return;
    isSyncingTimelineScrollRef.current = true;
    const timelineEl = timelineScrollRef.current;
    const barEl = timelineScrollbarRef.current;
    if (timelineEl && barEl) {
      if (source === "timeline") {
        barEl.scrollLeft = timelineEl.scrollLeft;
      } else {
        timelineEl.scrollLeft = barEl.scrollLeft;
      }
    }
    isSyncingTimelineScrollRef.current = false;
  }, []);

  const handleTimelineScroll = useCallback(() => {
    syncTimelineScroll("timeline");
  }, [syncTimelineScroll]);

  const handleTimelineScrollbarScroll = useCallback(() => {
    syncTimelineScroll("bar");
  }, [syncTimelineScroll]);

  const timelineContentWidth = `${timelineZoom * 100}%`;

  const segments = useMemo(
    () => buildPackedSegmentsWithInserts(keepSegments, timelineVideos),
    [keepSegments, timelineVideos],
  );
  const cutMarkers = useMemo(() => {
    const inserts = getTimelineInserts(timelineVideos);
    return getPackedCutMarkers(keepSegments).map((marker) =>
      naturalToActualBeforeInsert(marker, inserts),
    );
  }, [keepSegments, timelineVideos]);
  const packedZoomEffects = useMemo(
    () => mapZoomEffectsToSequence(zoomEffects, keepSegments),
    [zoomEffects, keepSegments],
  );
  const packedImageOverlays = useMemo(
    () => mapImageOverlaysToSequence(imageOverlays, keepSegments),
    [imageOverlays, keepSegments],
  );
  const packedRegularImageOverlays = useMemo(
    () => packedImageOverlays.filter((overlay) => !overlay.sticker),
    [packedImageOverlays],
  );
  const packedStickerOverlays = useMemo(
    () => packedImageOverlays.filter((overlay) => overlay.sticker),
    [packedImageOverlays],
  );
  const packedTextOverlays = useMemo(
    () => mapTextOverlaysToSequence(textOverlays, keepSegments),
    [textOverlays, keepSegments],
  );
  const packedSoundboards = useMemo(
    () => mapSoundboardsToSequence(soundboards, keepSegments),
    [soundboards, keepSegments],
  );
  const editedDuration = useMemo(
    () => getEditedDuration(keepSegments),
    [keepSegments],
  );
  const timelineDuration = useMemo(
    () => getTotalTimelineDuration(keepSegments, timelineVideos),
    [keepSegments, timelineVideos],
  );
  const overlayTrackScale = useMemo(
    () =>
      timelineDuration > editedDuration + 0.01 || timelineVideos.length > 0
        ? timelineDuration
        : editedDuration,
    [editedDuration, timelineDuration, timelineVideos.length],
  );
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | null>(null);
  const sequenceTime = useMemo(
    () =>
      timelineVideos.length > 0
        ? sequencePlayhead
        : sourceTimeToSequenceTime(currentTime, keepSegments),
    [currentTime, keepSegments, sequencePlayhead, timelineVideos.length],
  );

  const buildSnapPoints = useCallback(
    (exclude?: TimelineSnapExclude) =>
      collectTimelineSnapPoints({
        segmentStarts: segments.map((segment) => segment.sequenceStart),
        segmentEnds: segments.map((segment) => segment.sequenceEnd),
        cutMarkers,
        zoomEffects: packedZoomEffects,
        imageOverlays: packedImageOverlays,
        textOverlays: packedTextOverlays,
        soundboards: packedSoundboards,
        timelineVideos: timelineVideos.map((clip) => ({
          id: clip.id,
          sequenceStart: clip.sequenceStart,
          sequenceEnd: clip.sequenceStart + getTimelineVideoSequenceDuration(clip),
        })),
        sequencePlayhead,
        exclude,
      }),
    [
      cutMarkers,
      packedImageOverlays,
      packedSoundboards,
      packedTextOverlays,
      packedZoomEffects,
      segments,
      sequencePlayhead,
      timelineVideos,
    ],
  );

  const applyTimelineSnap = useCallback(
    (time: number, exclude?: TimelineSnapExclude) => {
      const result = snapSequenceTimeWithFeedback(time, buildSnapPoints(exclude));
      setActiveSnapPoint(result.snapPoint);
      return result.time;
    },
    [buildSnapPoints],
  );

  const clampOverlaySequenceTime = useCallback(
    (time: number) => Math.max(0, Math.min(time, overlayTrackScale)),
    [overlayTrackScale],
  );

  const applySegmentMoveSnap = useCallback(
    (rawStart: number, duration: number, exclude?: TimelineSnapExclude) => {
      const result = snapSegmentMoveStart(
        clampOverlaySequenceTime(rawStart),
        duration,
        buildSnapPoints(exclude),
      );
      setActiveSnapPoint(result.snapPoint);
      return result.time;
    },
    [buildSnapPoints, clampOverlaySequenceTime],
  );

  const setSequencePlayhead = useClipEditorStore((s) => s.setSequencePlayhead);
  const setIsPlaying = useClipEditorStore((s) => s.setIsPlaying);
  const setSelectedSegmentId = useClipEditorStore((s) => s.setSelectedSegmentId);
  const setSelectedZoomEffectId = useClipEditorStore(
    (s) => s.setSelectedZoomEffectId,
  );
  const addCutAtCurrentTime = useClipEditorStore((s) => s.addCutAtCurrentTime);
  const recordTimelineSnapshot = useClipEditorStore((s) => s.recordTimelineSnapshot);
  const undoTimeline = useClipEditorStore((s) => s.undoTimeline);
  const redoTimeline = useClipEditorStore((s) => s.redoTimeline);
  const toggleZoomTool = useClipEditorStore((s) => s.toggleZoomTool);
  const updateZoomEffect = useClipEditorStore((s) => s.updateZoomEffect);
  const deleteSelectedZoomEffect = useClipEditorStore(
    (s) => s.deleteSelectedZoomEffect,
  );
  const addImageOverlay = useClipEditorStore((s) => s.addImageOverlay);
  const setSelectedImageOverlayId = useClipEditorStore(
    (s) => s.setSelectedImageOverlayId,
  );
  const updateImageOverlay = useClipEditorStore((s) => s.updateImageOverlay);
  const deleteSelectedImageOverlay = useClipEditorStore(
    (s) => s.deleteSelectedImageOverlay,
  );
  const addTextOverlay = useClipEditorStore((s) => s.addTextOverlay);
  const setSelectedTextOverlayId = useClipEditorStore(
    (s) => s.setSelectedTextOverlayId,
  );
  const updateTextOverlay = useClipEditorStore((s) => s.updateTextOverlay);
  const deleteSelectedTextOverlay = useClipEditorStore(
    (s) => s.deleteSelectedTextOverlay,
  );
  const toggleSoundboardTool = useClipEditorStore((s) => s.toggleSoundboardTool);
  const toggleSpeedTool = useClipEditorStore((s) => s.toggleSpeedTool);
  const openSpeedTool = useClipEditorStore((s) => s.openSpeedTool);
  const isSpeedToolActive = useClipEditorStore((s) => s.isSpeedToolActive);
  const setSelectedSoundboardId = useClipEditorStore(
    (s) => s.setSelectedSoundboardId,
  );
  const updateSoundboard = useClipEditorStore((s) => s.updateSoundboard);
  const deleteSelectedSoundboard = useClipEditorStore(
    (s) => s.deleteSelectedSoundboard,
  );
  const addTimelineVideo = useClipEditorStore((s) => s.addTimelineVideo);
  const setSelectedTimelineVideoId = useClipEditorStore(
    (s) => s.setSelectedTimelineVideoId,
  );
  const updateTimelineVideo = useClipEditorStore((s) => s.updateTimelineVideo);
  const moveMemeTimelineVideo = useClipEditorStore((s) => s.moveMemeTimelineVideo);
  const reconcileSequencePlayback = useClipEditorStore(
    (s) => s.reconcileSequencePlayback,
  );
  const deleteSelectedTimelineVideo = useClipEditorStore(
    (s) => s.deleteSelectedTimelineVideo,
  );
  const canUndoTimeline = useClipEditorStore(
    (s) => s.timelineUndoStack.length > 0,
  );
  const canRedoTimeline = useClipEditorStore(
    (s) => s.timelineRedoStack.length > 0,
  );
  const setEditorStep = useClipEditorStore((s) => s.setEditorStep);

  const applyClipCut = useApplyClipCut();
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);
  const selectedZoomEffect = packedZoomEffects.find(
    (effect) => effect.id === selectedZoomEffectId,
  );
  const selectedImageOverlay = packedImageOverlays.find(
    (overlay) => overlay.id === selectedImageOverlayId,
  );
  const selectedTextOverlay = packedTextOverlays.find(
    (overlay) => overlay.id === selectedTextOverlayId,
  );
  const selectedSoundboard = packedSoundboards.find(
    (clip) => clip.id === selectedSoundboardId,
  );
  const selectedTimelineVideo = timelineVideos.find(
    (clip) => clip.id === selectedTimelineVideoId,
  );

  useEffect(() => {
    const handlePointerDownOutside = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (trackAreaRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-clip-editor-panel], [data-timeline-toolbar]")
      ) {
        return;
      }

      setSelectedSegmentId(null);
      setSelectedZoomEffectId(null);
      setSelectedImageOverlayId(null);
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDownOutside);
  }, [setSelectedImageOverlayId, setSelectedSegmentId, setSelectedZoomEffectId]);

  const seekFromClientX = useCallback(
    (clientX: number, trackElement: HTMLDivElement | null) => {
      const track = trackElement ?? trackRef.current;
      if (!track || timelineDuration <= 0) return;

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const seqTime = ratio * timelineDuration;
      setSequencePlayhead(seqTime);
    },
    [setSequencePlayhead, timelineDuration],
  );

  const startScrub = (
    event: PointerEvent<HTMLElement>,
    captureTarget: HTMLElement,
    mode: ScrubMode = "track",
  ) => {
    isDraggingRef.current = true;
    scrubModeRef.current = mode;
    captureTarget.setPointerCapture(event.pointerId);
    setIsPlaying(false);
    if (mode === "track" && !useClipEditorStore.getState().isSpeedToolActive) {
      setSelectedSegmentId(null);
      setSelectedTimelineVideoId(null);
      setSelectedZoomEffectId(null);
      setSelectedImageOverlayId(null);
      setSelectedTextOverlayId(null);
      setSelectedSoundboardId(null);
    }
    seekFromClientX(event.clientX, trackRef.current);
  };

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.dataset.segment === "true") return;
    if (target.dataset.timelineVideo === "true") return;
    if (target.dataset.zoomEffect === "true") return;
    if (target.dataset.imageOverlay === "true") return;
    if (target.dataset.textOverlay === "true") return;
    if (target.dataset.soundboardClip === "true") return;
    if (target.dataset.segmentAction === "true") return;
    if (target.closest("[data-segment-action='true']")) return;
    if (target.closest("[data-playhead='true']")) return;
    if (target.closest("[data-effect-edge='true']")) return;

    startScrub(event, event.currentTarget);
  };

  const handleEffectTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.dataset.zoomEffect === "true") return;
    if (target.dataset.segmentAction === "true") return;
    if (target.closest("[data-segment-action='true']")) return;
    if (target.closest("[data-effect-edge='true']")) return;

    startScrub(event, event.currentTarget);
  };

  const handleImageTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.dataset.imageOverlay === "true") return;
    if (target.dataset.segmentAction === "true") return;
    if (target.closest("[data-segment-action='true']")) return;
    if (target.closest("[data-effect-edge='true']")) return;

    startScrub(event, event.currentTarget);
  };

  const handlePlayheadPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    startScrub(event, event.currentTarget);
  };

  const handleEffectEdgePointerDown = (
    event: PointerEvent<HTMLDivElement>,
    effectId: string,
    edge: "start" | "end",
  ) => {
    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current = edge === "start" ? "effect-start" : "effect-end";
    const packed = packedZoomEffects.find((item) => item.id === effectId);
    effectDragRef.current = packed
      ? {
          effectId,
          initialClientX: event.clientX,
          initialSeqStart: packed.sequenceStart,
          initialSeqEnd: packed.sequenceEnd,
        }
      : { effectId, initialClientX: event.clientX, initialSeqStart: 0, initialSeqEnd: 0 };
    effectEditedRef.current = false;
    setSelectedZoomEffectId(effectId);
    setSelectedSegmentId(null);
    setSelectedImageOverlayId(null);
    setSelectedTextOverlayId(null);
    setSelectedSoundboardId(null);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleEffectBodyPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    effect: (typeof packedZoomEffects)[number],
  ) => {
    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current = "effect-move";
    effectDragRef.current = {
      effectId: effect.id,
      initialClientX: event.clientX,
      initialSeqStart: effect.sequenceStart,
      initialSeqEnd: effect.sequenceEnd,
    };
    effectEditedRef.current = false;
    setSelectedZoomEffectId(effect.id);
    setSelectedSegmentId(null);
    setSelectedImageOverlayId(null);
    setSelectedTextOverlayId(null);
    setSelectedSoundboardId(null);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleImageEdgePointerDown = (
    event: PointerEvent<HTMLDivElement>,
    overlayId: string,
    edge: "start" | "end",
  ) => {
    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current = edge === "start" ? "image-start" : "image-end";
    const packed = packedImageOverlays.find((item) => item.id === overlayId);
    imageDragRef.current = packed
      ? {
          overlayId,
          initialClientX: event.clientX,
          initialSeqStart: packed.sequenceStart,
          initialSeqEnd: packed.sequenceEnd,
        }
      : {
          overlayId,
          initialClientX: event.clientX,
          initialSeqStart: 0,
          initialSeqEnd: 0,
        };
    imageEditedRef.current = false;
    setSelectedImageOverlayId(overlayId);
    setSelectedSegmentId(null);
    setSelectedZoomEffectId(null);
    setSelectedTextOverlayId(null);
    setSelectedSoundboardId(null);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleImageBodyPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    overlay: (typeof packedImageOverlays)[number],
  ) => {
    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current = "image-move";
    imageDragRef.current = {
      overlayId: overlay.id,
      initialClientX: event.clientX,
      initialSeqStart: overlay.sequenceStart,
      initialSeqEnd: overlay.sequenceEnd,
    };
    imageEditedRef.current = false;
    setSelectedImageOverlayId(overlay.id);
    setSelectedSegmentId(null);
    setSelectedZoomEffectId(null);
    setSelectedTextOverlayId(null);
    setSelectedSoundboardId(null);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTextTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.dataset.textOverlay === "true") return;
    if (target.dataset.segmentAction === "true") return;
    if (target.closest("[data-segment-action='true']")) return;
    if (target.closest("[data-effect-edge='true']")) return;

    startScrub(event, event.currentTarget);
  };

  const handleTextEdgePointerDown = (
    event: PointerEvent<HTMLDivElement>,
    overlayId: string,
    edge: "start" | "end",
  ) => {
    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current = edge === "start" ? "text-start" : "text-end";
    const packed = packedTextOverlays.find((item) => item.id === overlayId);
    textDragRef.current = packed
      ? {
          overlayId,
          initialClientX: event.clientX,
          initialSeqStart: packed.sequenceStart,
          initialSeqEnd: packed.sequenceEnd,
        }
      : {
          overlayId,
          initialClientX: event.clientX,
          initialSeqStart: 0,
          initialSeqEnd: 0,
        };
    textEditedRef.current = false;
    setSelectedTextOverlayId(overlayId);
    setSelectedSegmentId(null);
    setSelectedZoomEffectId(null);
    setSelectedImageOverlayId(null);
    setSelectedSoundboardId(null);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTextBodyPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    overlay: (typeof packedTextOverlays)[number],
  ) => {
    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current = "text-move";
    textDragRef.current = {
      overlayId: overlay.id,
      initialClientX: event.clientX,
      initialSeqStart: overlay.sequenceStart,
      initialSeqEnd: overlay.sequenceEnd,
    };
    textEditedRef.current = false;
    setSelectedTextOverlayId(overlay.id);
    setSelectedSegmentId(null);
    setSelectedZoomEffectId(null);
    setSelectedImageOverlayId(null);
    setSelectedSoundboardId(null);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSoundboardTrackPointerDown = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    const target = event.target as HTMLElement;
    if (target.dataset.soundboardClip === "true") return;
    if (target.dataset.segmentAction === "true") return;
    if (target.closest("[data-segment-action='true']")) return;
    if (target.closest("[data-effect-edge='true']")) return;

    startScrub(event, event.currentTarget);
  };

  const handleSoundboardEdgePointerDown = (
    event: PointerEvent<HTMLDivElement>,
    clipId: string,
    edge: "start" | "end",
  ) => {
    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current =
      edge === "start" ? "soundboard-start" : "soundboard-end";
    const packed = packedSoundboards.find((item) => item.id === clipId);
    soundboardDragRef.current = packed
      ? {
          clipId,
          initialClientX: event.clientX,
          initialSeqStart: packed.sequenceStart,
          initialSeqEnd: packed.sequenceEnd,
        }
      : {
          clipId,
          initialClientX: event.clientX,
          initialSeqStart: 0,
          initialSeqEnd: 0,
        };
    soundboardEditedRef.current = false;
    setSelectedSoundboardId(clipId);
    setSelectedSegmentId(null);
    setSelectedZoomEffectId(null);
    setSelectedImageOverlayId(null);
    setSelectedTextOverlayId(null);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSoundboardBodyPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    clip: (typeof packedSoundboards)[number],
  ) => {
    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current = "soundboard-move";
    soundboardDragRef.current = {
      clipId: clip.id,
      initialClientX: event.clientX,
      initialSeqStart: clip.sequenceStart,
      initialSeqEnd: clip.sequenceEnd,
    };
    soundboardEditedRef.current = false;
    setSelectedSoundboardId(clip.id);
    setSelectedSegmentId(null);
    setSelectedZoomEffectId(null);
    setSelectedImageOverlayId(null);
    setSelectedTextOverlayId(null);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const applyEffectDragAtClientX = (clientX: number, mode: ScrubMode) => {
    const track = effectTrackRef.current;
    if (!track || overlayTrackScale <= 0 || !effectDragRef.current) return;

    const effect = zoomEffects.find(
      (item) => item.id === effectDragRef.current?.effectId,
    );
    if (!effect) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const rawSeqTime = ratio * overlayTrackScale;
    const seqTime = applyTimelineSnap(
      clampOverlaySequenceTime(rawSeqTime),
      { zoomEffectId: effect.id },
    );
    const sourceTime = sequenceTimeToSourceTime(seqTime, keepSegments);

    if (!effectEditedRef.current) {
      recordTimelineSnapshot();
      effectEditedRef.current = true;
    }

    if (mode === "effect-move") {
      const deltaX = clientX - effectDragRef.current.initialClientX;
      const rawStart =
        effectDragRef.current.initialSeqStart +
        (deltaX / rect.width) * overlayTrackScale;
      const duration =
        effectDragRef.current.initialSeqEnd -
        effectDragRef.current.initialSeqStart;
      const snappedStart = applySegmentMoveSnap(rawStart, duration, {
        zoomEffectId: effect.id,
      });
      const sequenceOffset = snappedStart - effectDragRef.current.initialSeqStart;
      const updated = moveZoomEffectBySequenceOffset(
        effect,
        sequenceOffset,
        keepSegments,
        effectDragRef.current.initialSeqStart,
        effectDragRef.current.initialSeqEnd,
        timelineDuration,
      );
      if (updated) {
        updateZoomEffect(effect.id, {
          start: updated.start,
          end: updated.end,
        });
      }
      return;
    }

    const updated =
      mode === "effect-start"
        ? effect.usesSequenceTime
          ? updateZoomEffectBounds(
              effect,
              { start: seqTime },
              keepSegments,
              timelineDuration,
            )
          : updateZoomEffectBounds(effect, { start: sourceTime }, keepSegments)
        : effect.usesSequenceTime
          ? updateZoomEffectBounds(
              effect,
              { end: seqTime },
              keepSegments,
              timelineDuration,
            )
          : updateZoomEffectBounds(effect, { end: sourceTime }, keepSegments);

    if (updated) {
      updateZoomEffect(effect.id, {
        start: updated.start,
        end: updated.end,
      });
    }
  };

  const applyImageDragAtClientX = (clientX: number, mode: ScrubMode) => {
    const dragState = imageDragRef.current;
    if (!dragState || overlayTrackScale <= 0) return;

    const overlayRaw = imageOverlays.find(
      (item) => item.id === dragState.overlayId,
    );
    if (!overlayRaw) return;

    const overlay = normalizeImageOverlaySequenceStorage(
      overlayRaw,
      keepSegments,
    );
    if (
      overlay.sticker &&
      !overlayRaw.usesSequenceTime &&
      (overlay.start !== overlayRaw.start ||
        overlay.end !== overlayRaw.end ||
        !overlayRaw.usesSequenceTime)
    ) {
      updateImageOverlay(overlay.id, {
        start: overlay.start,
        end: overlay.end,
        usesSequenceTime: true,
      });
    }

    const track = overlay.sticker
      ? stickerTrackRef.current
      : imageTrackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const rawSeqTime = ratio * overlayTrackScale;
    const seqTime = applyTimelineSnap(
      clampOverlaySequenceTime(rawSeqTime),
      { imageOverlayId: overlay.id },
    );
    const sourceTime = sequenceTimeToSourceTime(seqTime, keepSegments);

    if (!imageEditedRef.current) {
      recordTimelineSnapshot();
      imageEditedRef.current = true;
    }

    if (mode === "image-move") {
      const deltaX = clientX - dragState.initialClientX;
      const rawStart =
        dragState.initialSeqStart +
        (deltaX / rect.width) * overlayTrackScale;
      const duration =
        dragState.initialSeqEnd - dragState.initialSeqStart;
      const snappedStart = applySegmentMoveSnap(rawStart, duration, {
        imageOverlayId: overlay.id,
      });
      const sequenceOffset = snappedStart - dragState.initialSeqStart;
      const updated = moveImageOverlayBySequenceOffset(
        overlay,
        sequenceOffset,
        keepSegments,
        dragState.initialSeqStart,
        dragState.initialSeqEnd,
        timelineDuration,
      );
      if (updated) {
        updateImageOverlay(overlay.id, {
          start: updated.start,
          end: updated.end,
          ...(imageOverlayUsesSequenceTime(updated)
            ? { usesSequenceTime: true }
            : {}),
        });
      }
      return;
    }

    const updated =
      mode === "image-start"
        ? imageOverlayUsesSequenceTime(overlay)
          ? updateImageOverlayBounds(
              overlay,
              { start: seqTime },
              keepSegments,
              timelineDuration,
            )
          : updateImageOverlayBounds(overlay, { start: sourceTime }, keepSegments)
        : imageOverlayUsesSequenceTime(overlay)
          ? updateImageOverlayBounds(
              overlay,
              { end: seqTime },
              keepSegments,
              timelineDuration,
            )
          : updateImageOverlayBounds(overlay, { end: sourceTime }, keepSegments);

    if (updated) {
      updateImageOverlay(overlay.id, {
        start: updated.start,
        end: updated.end,
        ...(updated.usesSequenceTime ? { usesSequenceTime: true } : {}),
      });
    }
  };

  const applyTextDragAtClientX = (clientX: number, mode: ScrubMode) => {
    const track = textTrackRef.current;
    if (!track || overlayTrackScale <= 0 || !textDragRef.current) return;

    const overlay = textOverlays.find(
      (item) => item.id === textDragRef.current?.overlayId,
    );
    if (!overlay) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const rawSeqTime = ratio * overlayTrackScale;
    const seqTime = applyTimelineSnap(
      clampOverlaySequenceTime(rawSeqTime),
      { textOverlayId: overlay.id },
    );
    const sourceTime = sequenceTimeToSourceTime(seqTime, keepSegments);

    if (!textEditedRef.current) {
      recordTimelineSnapshot();
      textEditedRef.current = true;
    }

    if (mode === "text-move") {
      const deltaX = clientX - textDragRef.current.initialClientX;
      const rawStart =
        textDragRef.current.initialSeqStart +
        (deltaX / rect.width) * overlayTrackScale;
      const duration =
        textDragRef.current.initialSeqEnd - textDragRef.current.initialSeqStart;
      const snappedStart = applySegmentMoveSnap(rawStart, duration, {
        textOverlayId: overlay.id,
      });
      const sequenceOffset = snappedStart - textDragRef.current.initialSeqStart;
      const updated = moveTextOverlayBySequenceOffset(
        overlay,
        sequenceOffset,
        keepSegments,
        textDragRef.current.initialSeqStart,
        textDragRef.current.initialSeqEnd,
        timelineDuration,
      );
      if (updated) {
        updateTextOverlay(overlay.id, {
          start: updated.start,
          end: updated.end,
        });
      }
      return;
    }

    const updated =
      mode === "text-start"
        ? overlay.usesSequenceTime
          ? updateTextOverlayBounds(
              overlay,
              { start: seqTime },
              keepSegments,
              timelineDuration,
            )
          : updateTextOverlayBounds(overlay, { start: sourceTime }, keepSegments)
        : overlay.usesSequenceTime
          ? updateTextOverlayBounds(
              overlay,
              { end: seqTime },
              keepSegments,
              timelineDuration,
            )
          : updateTextOverlayBounds(overlay, { end: sourceTime }, keepSegments);

    if (updated) {
      updateTextOverlay(overlay.id, {
        start: updated.start,
        end: updated.end,
      });
    }
  };

  const applySoundboardDragAtClientX = (clientX: number, mode: ScrubMode) => {
    const track = soundboardTrackRef.current;
    if (!track || overlayTrackScale <= 0 || !soundboardDragRef.current) return;

    const clip = soundboards.find(
      (item) => item.id === soundboardDragRef.current?.clipId,
    );
    if (!clip) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const rawSeqTime = ratio * overlayTrackScale;
    const seqTime = applyTimelineSnap(
      clampOverlaySequenceTime(rawSeqTime),
      { soundboardId: clip.id },
    );
    const sourceTime = sequenceTimeToSourceTime(seqTime, keepSegments);

    if (!soundboardEditedRef.current) {
      recordTimelineSnapshot();
      soundboardEditedRef.current = true;
    }

    if (mode === "soundboard-move") {
      const deltaX = clientX - soundboardDragRef.current.initialClientX;
      const rawStart =
        soundboardDragRef.current.initialSeqStart +
        (deltaX / rect.width) * overlayTrackScale;
      const duration =
        soundboardDragRef.current.initialSeqEnd -
        soundboardDragRef.current.initialSeqStart;
      const snappedStart = applySegmentMoveSnap(rawStart, duration, {
        soundboardId: clip.id,
      });
      const sequenceOffset =
        snappedStart - soundboardDragRef.current.initialSeqStart;
      const updated = moveSoundboardBySequenceOffset(
        clip,
        sequenceOffset,
        keepSegments,
        soundboardDragRef.current.initialSeqStart,
        soundboardDragRef.current.initialSeqEnd,
        timelineDuration,
      );
      if (updated) {
        updateSoundboard(clip.id, {
          start: updated.start,
          end: updated.end,
        });
      }
      return;
    }

    const updated =
      mode === "soundboard-start"
        ? clip.usesSequenceTime
          ? updateSoundboardBounds(
              clip,
              { start: seqTime },
              keepSegments,
              timelineDuration,
            )
          : updateSoundboardBounds(clip, { start: sourceTime }, keepSegments)
        : clip.usesSequenceTime
          ? updateSoundboardBounds(
              clip,
              { end: seqTime },
              keepSegments,
              timelineDuration,
            )
          : updateSoundboardBounds(clip, { end: sourceTime }, keepSegments);

    if (updated) {
      updateSoundboard(clip.id, {
        start: updated.start,
        end: updated.end,
      });
    }
  };

  const applyTimelineVideoDragAtClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track || timelineDuration <= 0 || !timelineVideoDragRef.current) return;

    const clip = timelineVideos.find(
      (item) => item.id === timelineVideoDragRef.current?.clipId,
    );
    if (!clip) return;

    if (!timelineVideoEditedRef.current) {
      recordTimelineSnapshot();
      timelineVideoEditedRef.current = true;
    }

    const rect = track.getBoundingClientRect();
    const deltaX = clientX - timelineVideoDragRef.current.initialClientX;
    const sequenceOffset = (deltaX / rect.width) * timelineDuration;
    const rawStart = timelineVideoDragRef.current.initialSeqStart + sequenceOffset;
    const duration = getTimelineVideoSequenceDuration(clip);
    const snappedStart = applySegmentMoveSnap(rawStart, duration, {
      timelineVideoId: clip.id,
    });
    const updated = moveTimelineVideoBySequenceOffset(
      clip,
      snappedStart - timelineVideoDragRef.current.initialSeqStart,
      timelineVideoDragRef.current.initialSeqStart,
    );

    if (clip.importKind === "meme") {
      const resolvedStart = resolveTimelineVideoSequenceStart(
        updated,
        updated.sequenceStart,
        timelineVideos,
      );
      if (timelineVideoDragRef.current) {
        timelineVideoDragRef.current.previewSeqStart = resolvedStart;
      }
      setMemeDragPreviewStart(resolvedStart);
      return;
    }

    const actualBaseEnd = getActualBaseEndSequence(keepSegments, timelineVideos);
    const resolvedStart = resolveTimelineVideoPlacementStart(
      clip,
      updated.sequenceStart,
      actualBaseEnd,
      timelineVideos,
    );
    if (resolvedStart !== clip.sequenceStart) {
      updateTimelineVideo(clip.id, {
        sequenceStart: resolvedStart,
      });
    }
  };

  const handleTimelineVideoBodyPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    clip: (typeof timelineVideos)[number],
  ) => {
    event.stopPropagation();
    isDraggingRef.current = true;
    scrubModeRef.current = "timeline-video-move";
    timelineVideoDragRef.current = {
      clipId: clip.id,
      initialClientX: event.clientX,
      initialSeqStart: clip.sequenceStart,
    };
    timelineVideoEditedRef.current = false;
    setSelectedTimelineVideoId(clip.id);
    setSelectedSegmentId(null);
    setSelectedZoomEffectId(null);
    setSelectedImageOverlayId(null);
    setSelectedTextOverlayId(null);
    setSelectedSoundboardId(null);
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTimelineVideoPointerUp = (
    event: PointerEvent<HTMLElement>,
  ) => {
    if (timelineVideoEditedRef.current && timelineVideoDragRef.current) {
      const clip = timelineVideos.find(
        (item) => item.id === timelineVideoDragRef.current?.clipId,
      );
      if (clip?.importKind === "meme") {
        const targetStart =
          timelineVideoDragRef.current.previewSeqStart ?? clip.sequenceStart;
        const moved = moveMemeTimelineVideo(clip.id, targetStart);
        if (!moved) {
          undoTimeline();
          toast.error("Impossible de déplacer le meme à cet endroit");
        }
      }
    }
    setMemeDragPreviewStart(null);
    isDraggingRef.current = false;
    scrubModeRef.current = null;
    timelineVideoDragRef.current = null;
    timelineVideoEditedRef.current = false;
    reconcileSequencePlayback();
    setActiveSnapPoint(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleScrubPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!isDraggingRef.current) return;

    const mode = scrubModeRef.current;
    if (
      mode === "effect-start" ||
      mode === "effect-end" ||
      mode === "effect-move"
    ) {
      applyEffectDragAtClientX(event.clientX, mode);
      return;
    }

    if (
      mode === "image-start" ||
      mode === "image-end" ||
      mode === "image-move"
    ) {
      applyImageDragAtClientX(event.clientX, mode);
      return;
    }

    if (
      mode === "text-start" ||
      mode === "text-end" ||
      mode === "text-move"
    ) {
      applyTextDragAtClientX(event.clientX, mode);
      return;
    }

    if (
      mode === "soundboard-start" ||
      mode === "soundboard-end" ||
      mode === "soundboard-move"
    ) {
      applySoundboardDragAtClientX(event.clientX, mode);
      return;
    }

    if (mode === "timeline-video-move") {
      applyTimelineVideoDragAtClientX(event.clientX);
      return;
    }

    seekFromClientX(event.clientX, trackRef.current);
  };

  const handleEffectPointerUp = (event: PointerEvent<HTMLElement>) => {
    isDraggingRef.current = false;
    scrubModeRef.current = null;
    effectDragRef.current = null;
    effectEditedRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleImagePointerUp = (event: PointerEvent<HTMLElement>) => {
    isDraggingRef.current = false;
    scrubModeRef.current = null;
    imageDragRef.current = null;
    imageEditedRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleTextPointerUp = (event: PointerEvent<HTMLElement>) => {
    isDraggingRef.current = false;
    scrubModeRef.current = null;
    textDragRef.current = null;
    textEditedRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleSoundboardPointerUp = (event: PointerEvent<HTMLElement>) => {
    isDraggingRef.current = false;
    scrubModeRef.current = null;
    soundboardDragRef.current = null;
    soundboardEditedRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleScrubPointerUp = (event: PointerEvent<HTMLElement>) => {
    isDraggingRef.current = false;
    scrubModeRef.current = null;
    effectDragRef.current = null;
    imageDragRef.current = null;
    textDragRef.current = null;
    soundboardDragRef.current = null;
    effectEditedRef.current = false;
    imageEditedRef.current = false;
    textEditedRef.current = false;
    soundboardEditedRef.current = false;
    reconcileSequencePlayback();
    setActiveSnapPoint(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleCut = () => {
    const added = addCutAtCurrentTime();
    if (!added) {
      toast.error(
        "Impossible de couper ici (trop près d'un bord ou en dehors d'un segment)",
      );
    }
  };

  const handleUndo = () => {
    undoTimeline();
  };

  const handleRedo = () => {
    if (!clipId) return;

    const ffmpegCut = redoTimeline();
    if (ffmpegCut) {
      recordTimelineSnapshot();
      applyClipCut.mutate(
        { clipId, keepSegments: ffmpegCut.keepSegments },
        {
          onError: () => {
            useClipEditorStore.setState((state) => ({
              timelineUndoStack: state.timelineUndoStack.slice(0, -1),
              timelineRedoStack: [
                ...state.timelineRedoStack,
                ffmpegCut.restoreRedoSnapshot,
              ].slice(-MAX_TIMELINE_HISTORY),
            }));
          },
        },
      );
    }
  };

  const handleDeleteSelected = () => {
    if (selectedZoomEffectId) {
      deleteSelectedZoomEffect();
      return;
    }

    if (selectedImageOverlayId) {
      deleteSelectedImageOverlay();
      return;
    }

    if (selectedTextOverlayId) {
      deleteSelectedTextOverlay();
      return;
    }

    if (selectedSoundboardId) {
      deleteSelectedSoundboard();
      return;
    }

    if (selectedTimelineVideoId) {
      deleteSelectedTimelineVideo();
      return;
    }

    if (!selectedSegmentId || !clipId) return;

    const keepSegmentsPayload = removeKeepSegmentById(
      keepSegments,
      selectedSegmentId,
    );

    if (!keepSegmentsPayload) {
      toast.error("Impossible de supprimer le dernier segment restant");
      return;
    }

    recordTimelineSnapshot();
    setSelectedSegmentId(null);
    applyClipCut.mutate({ clipId, keepSegments: keepSegmentsPayload });
  };

  const isBusy = isApplyingCut || isExporting;
  const disabled = timelineDuration <= 0 || isBusy;

  const playheadPercent =
    timelineDuration > 0 ? (sequenceTime / timelineDuration) * 100 : 0;
  const playheadMotionStyle = isPlaying
    ? ({ willChange: "left, width" } as const)
    : undefined;
  const actualBaseEnd = useMemo(
    () => getActualBaseEndSequence(keepSegments, timelineVideos),
    [keepSegments, timelineVideos],
  );
  const hasExtendedTimeline = timelineDuration > actualBaseEnd + 0.01;
  const mainTrackScale =
    hasExtendedTimeline ? timelineDuration : actualBaseEnd;
  const selectedSegmentCenterPercent = selectedSegment
    ? (((selectedSegment.sequenceStart + selectedSegment.sequenceEnd) / 2) /
        mainTrackScale) *
      100
    : 0;
  const selectedZoomEffectCenterPercent = selectedZoomEffect
    ? (((selectedZoomEffect.sequenceStart + selectedZoomEffect.sequenceEnd) /
          2) /
          overlayTrackScale) *
        100
    : 0;

  const hasZoomTrack = zoomEffects.length > 0;
  const hasRegularImageTrack = packedRegularImageOverlays.length > 0;
  const hasStickerTrack = packedStickerOverlays.length > 0;
  const hasTextTrack = textOverlays.length > 0;
  const hasSoundboardTrack = soundboards.length > 0;

  const selectedRegularImageOverlay =
    selectedImageOverlay && !selectedImageOverlay.sticker
      ? selectedImageOverlay
      : undefined;
  const selectedStickerOverlay = selectedImageOverlay?.sticker
    ? selectedImageOverlay
    : undefined;
  const selectedRegularImageCenterPercent = selectedRegularImageOverlay
    ? (((selectedRegularImageOverlay.sequenceStart +
          selectedRegularImageOverlay.sequenceEnd) /
          2) /
          overlayTrackScale) *
        100
    : 0;
  const selectedStickerCenterPercent = selectedStickerOverlay
    ? (((selectedStickerOverlay.sequenceStart +
          selectedStickerOverlay.sequenceEnd) /
          2) /
          overlayTrackScale) *
        100
    : 0;

  const handleImageImport = (
    src: string,
    label: string,
    options?: CreateImageOverlayOptions,
  ) => {
    const created = addImageOverlay(src, label, options);
    if (!created) {
      toast.error(
        "Impossible d'ajouter une image ici (hors segment conservé ou durée trop courte)",
      );
    }
  };

  const handleTextTool = () => {
    const existing = findTextOverlayForPlayhead(
      textOverlays,
      sequenceTime,
      currentTime,
    );
    if (existing) {
      setSelectedTextOverlayId(existing.id);
      return;
    }

    const created = addTextOverlay();
    if (!created) {
      toast.error(
        "Impossible d'ajouter un texte ici (hors segment conservé ou durée trop courte)",
      );
    }
  };

  const selectedTextOverlayCenterPercent = selectedTextOverlay
    ? (((selectedTextOverlay.sequenceStart + selectedTextOverlay.sequenceEnd) /
          2) /
          overlayTrackScale) *
        100
    : 0;

  const selectedSoundboardCenterPercent = selectedSoundboard
    ? (((selectedSoundboard.sequenceStart +
          selectedSoundboard.sequenceEnd) /
          2) /
          overlayTrackScale) *
        100
    : 0;

  const selectedTimelineVideoCenterPercent = selectedTimelineVideo
    ? (((selectedTimelineVideo.sequenceStart +
        getTimelineVideoSequenceDuration(selectedTimelineVideo)) /
        2) /
        mainTrackScale) *
      100
    : 0;

  const mainPlayheadPercent =
    timelineDuration > 0 ? (sequenceTime / timelineDuration) * 100 : 0;

  const handleVideoImportComplete = (
    result: ClipImportResult,
    layoutMode: TimelineVideoLayoutMode,
  ) => {
    const created = addTimelineVideo(
      result,
      layoutMode,
      sequenceTime,
      videoImportKind,
    );
    if (!created) {
      if (videoImportKind === "meme") {
        toast.error(
          "Impossible d'insérer le meme ici (max 20 s, place le curseur sur la vidéo de base loin des bords)",
        );
      } else {
        toast.error("Impossible d'ajouter la vidéo à la timeline");
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-background-secondary px-4 py-4 md:px-6 md:py-5">
      <div
        data-timeline-toolbar="true"
        className="flex shrink-0 flex-wrap items-center gap-3"
      >
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={disabled}
          className="flex size-10 items-center justify-center rounded-xl bg-main-color text-background transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
          aria-label={isPlaying ? "Pause" : "Lecture"}
        >
          {isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5 ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={handleUndo}
          disabled={disabled || !canUndoTimeline}
          className="flex size-10 items-center justify-center rounded-xl border border-secondary-color/70 bg-background text-main-color transition-all hover:border-main-color/50 hover:scale-105 active:scale-95 disabled:opacity-40"
          aria-label="Annuler"
          title="Revenir en arrière"
        >
          <Undo2 className="size-5" />
        </button>

        <button
          type="button"
          onClick={handleRedo}
          disabled={disabled || !canRedoTimeline}
          className="flex size-10 items-center justify-center rounded-xl border border-secondary-color/70 bg-background text-main-color transition-all hover:border-main-color/50 hover:scale-105 active:scale-95 disabled:opacity-40"
          aria-label="Rétablir"
          title="Revenir en avant"
        >
          <Redo2 className="size-5" />
        </button>

        <TimelineToolbarSeparator />

        <button
          type="button"
          onClick={handleCut}
          disabled={disabled}
          className="flex size-10 items-center justify-center rounded-xl border border-secondary-color/70 bg-background text-main-color transition-all hover:border-main-color/50 hover:scale-105 active:scale-95 disabled:opacity-40"
          aria-label="Couper à la playhead"
          title="Couper (ciseaux)"
        >
          <Scissors className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => toggleZoomTool()}
          disabled={disabled}
          className={`flex size-10 items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${
            isZoomToolActive || selectedZoomEffectId
              ? "border-amber-300/70 bg-amber-300/15 text-amber-200"
              : "border-secondary-color/70 bg-background text-main-color hover:border-main-color/50"
          }`}
          aria-label="Outil zoom"
          title="Zoom — sélection source 16:9"
        >
          <ZoomIn className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => setImageDialogOpen(true)}
          disabled={disabled}
          className={`flex size-10 items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${
            isImageToolActive || selectedImageOverlayId
              ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100"
              : "border-secondary-color/70 bg-background text-main-color hover:border-main-color/50"
          }`}
          aria-label="Ajouter une image"
          title="Image — import, URL ou sticker follow"
        >
          <ImagePlus className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => setVideoKindDialogOpen(true)}
          disabled={disabled}
          className={`flex size-10 items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${
            selectedTimelineVideoId
              ? "border-sky-300/70 bg-sky-300/15 text-sky-100"
              : "border-secondary-color/70 bg-background text-main-color hover:border-main-color/50"
          }`}
          aria-label="Ajouter une vidéo"
          title="Vidéo — fichier local ou clip Twitch"
        >
          <Film className="size-5" />
        </button>

        <button
          type="button"
          onClick={handleTextTool}
          disabled={disabled}
          className={`flex size-10 items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${
            isTextToolActive || selectedTextOverlayId
              ? "border-violet-300/70 bg-violet-300/15 text-violet-100"
              : "border-secondary-color/70 bg-background text-main-color hover:border-main-color/50"
          }`}
          aria-label="Ajouter un texte"
          title="Texte — calque stylisable"
        >
          <Type className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => toggleSoundboardTool()}
          disabled={disabled}
          className={`flex size-10 items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${
            isSoundboardToolActive || selectedSoundboardId
              ? "border-emerald-300/70 bg-emerald-300/15 text-emerald-100"
              : "border-secondary-color/70 bg-background text-main-color hover:border-main-color/50"
          }`}
          aria-label="Ajouter un son"
          title="Son — soundboard stream / meme"
        >
          <Volume2 className="size-5" />
        </button>

        <button
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (isSpeedToolActive) {
              toggleSpeedTool();
              return;
            }
            openSpeedTool();
          }}
          disabled={disabled || (!selectedSegmentId && !selectedTimelineVideoId)}
          className={`flex size-10 items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ${
            isSpeedToolActive
              ? "border-sky-300/70 bg-sky-300/15 text-sky-100"
              : "border-secondary-color/70 bg-background text-main-color hover:border-main-color/50"
          }`}
          aria-label="Régler la vitesse du segment"
          title={
            selectedSegmentId || selectedTimelineVideoId
              ? "Vitesse — ralenti / accéléré sur le segment sélectionné"
              : "Sélectionnez d'abord un segment vidéo"
          }
        >
          <Gauge className="size-5" />
        </button>

        <TimelineToolbarSeparator />

        <span className="text-xs font-extrabold tabular-nums tracking-wide text-white/50">
          {formatClipTime(sequenceTime)}
          <span className="text-white/25"> / </span>
          {formatClipTime(timelineDuration)}
        </span>

        {isApplyingCut && (
          <span className="inline-flex items-center gap-2 text-xs text-main-color">
            <Loader2 className="size-4 animate-spin" />
            FFmpeg…
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ClipEditorPreviewVolumeSlider />
          <ClipEditorTimelineZoomSlider />

          <button
            type="button"
            onClick={() => setEditorStep("subtitles")}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-main-color/40 bg-main-color/10 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-main-color transition-all hover:border-main-color/60 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 md:text-xs"
          >
          <Subtitles className="size-4" />
          Sous-titres
          </button>
        </div>
      </div>

      <div
        className="timeline-scrollbar min-h-0 flex-1 overflow-y-auto pr-1"
      >
        <div
          ref={timelineScrollRef}
          onScroll={handleTimelineScroll}
          className="timeline-scrollbar-hidden overflow-x-auto overflow-y-visible"
        >
          <div
            className="relative min-w-full"
            style={{ width: timelineContentWidth }}
          >
          {timelineDuration > 0 && (
            <ClipTimelinePlayheadLine
              playheadPercent={playheadPercent}
              motionStyle={playheadMotionStyle}
              interactive={!isBusy}
              onPointerDown={handlePlayheadPointerDown}
              onPointerMove={handleScrubPointerMove}
              onPointerUp={handleScrubPointerUp}
              ariaLabel="Curseur de lecture"
              ariaValueMin={0}
              ariaValueMax={timelineDuration}
              ariaValueNow={sequenceTime}
              tabIndex={isBusy ? -1 : 0}
            />
          )}
          {activeSnapPoint !== null && timelineDuration > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-[34] w-px -translate-x-1/2 rounded-full bg-main-color/35 shadow-[0_0_6px_rgba(205,183,255,0.35)]"
              style={{
                left: `${(activeSnapPoint / timelineDuration) * 100}%`,
              }}
            />
          )}
          <ClipTimelineRuler duration={timelineDuration} />
          <div
            ref={trackAreaRef}
            className="relative space-y-2 overflow-visible pb-2 pt-10"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              if (useClipEditorStore.getState().isSpeedToolActive) return;
              setSelectedSegmentId(null);
              setSelectedZoomEffectId(null);
              setSelectedImageOverlayId(null);
              setSelectedTextOverlayId(null);
              setSelectedSoundboardId(null);
              setSelectedTimelineVideoId(null);
            }
          }}
        >
          {hasZoomTrack && (
            <div
              ref={effectTrackRef}
              role="slider"
              aria-label="Timeline zooms"
              tabIndex={0}
              onPointerDown={handleEffectTrackPointerDown}
              onPointerMove={handleScrubPointerMove}
              onPointerUp={handleScrubPointerUp}
              className="relative h-10 cursor-pointer rounded-xl border border-secondary-color/40 bg-background/80 touch-none select-none"
            >
              {selectedZoomEffect && !isBusy && (
                <button
                  type="button"
                  data-segment-action="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={handleDeleteSelected}
                  className="absolute -top-10 z-30 flex size-9 -translate-x-1/2 items-center justify-center rounded-xl border border-red-400/40 bg-background text-red-400 shadow-lg transition-all hover:scale-105 hover:bg-red-400/10 active:scale-95"
                  style={{ left: `${selectedZoomEffectCenterPercent}%` }}
                  aria-label="Supprimer l'effet zoom sélectionné"
                  title="Supprimer l'effet zoom"
                >
                  <Trash2 className="size-4" />
                </button>
              )}

              <span className="pointer-events-none absolute -top-5 left-0 text-[9px] font-extrabold uppercase tracking-wide text-white/30">
                Zooms
              </span>

              {overlayTrackScale > 0 &&
                packedZoomEffects.map((effect) => {
                  const left = (effect.sequenceStart / overlayTrackScale) * 100;
                  const width =
                    ((effect.sequenceEnd - effect.sequenceStart) /
                      overlayTrackScale) *
                    100;
                  const isSelected = effect.id === selectedZoomEffectId;

                  return (
                    <div
                      key={effect.id}
                      className="absolute inset-y-1 z-20"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <button
                        type="button"
                        data-zoom-effect="true"
                        onPointerDown={(event) =>
                          handleEffectBodyPointerDown(event, effect)
                        }
                        onPointerMove={handleScrubPointerMove}
                        onPointerUp={(event) =>
                          handleEffectPointerUp(event)
                        }
                        onPointerCancel={(event) =>
                          handleEffectPointerUp(event)
                        }
                        className={`absolute inset-0 cursor-grab rounded-md border transition-all active:cursor-grabbing ${
                          isSelected
                            ? "border-amber-300 bg-amber-300/25 ring-1 ring-amber-200/50"
                            : "border-amber-300/40 bg-amber-300/10 hover:bg-amber-300/20"
                        }`}
                        aria-label={`Zoom ${formatClipTime(effect.sequenceStart)} à ${formatClipTime(effect.sequenceEnd)}`}
                        aria-pressed={isSelected}
                      >
                        <span className="pointer-events-none absolute inset-x-1 bottom-0.5 truncate text-[9px] font-extrabold uppercase tracking-wide text-amber-100/80">
                          Zoom
                        </span>
                      </button>

                      {isSelected && (
                        <>
                          <div
                            role="presentation"
                            data-effect-edge="true"
                            onPointerDown={(event) =>
                              handleEffectEdgePointerDown(
                                event,
                                effect.id,
                                "start",
                              )
                            }
                            onPointerMove={handleScrubPointerMove}
                            onPointerUp={handleScrubPointerUp}
                            onPointerCancel={handleScrubPointerUp}
                            className="absolute inset-y-1 left-0 z-30 w-2 -translate-x-1/2 cursor-ew-resize rounded bg-amber-200/80"
                            aria-label="Ajuster le début de l'effet zoom"
                          />
                          <div
                            role="presentation"
                            data-effect-edge="true"
                            onPointerDown={(event) =>
                              handleEffectEdgePointerDown(event, effect.id, "end")
                            }
                            onPointerMove={handleScrubPointerMove}
                            onPointerUp={handleScrubPointerUp}
                            onPointerCancel={handleScrubPointerUp}
                            className="absolute inset-y-1 right-0 z-30 w-2 translate-x-1/2 cursor-ew-resize rounded bg-amber-200/80"
                            aria-label="Ajuster la fin de l'effet zoom"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {hasRegularImageTrack && (
            <div
              ref={imageTrackRef}
              role="slider"
              aria-label="Timeline images"
              tabIndex={0}
              onPointerDown={handleImageTrackPointerDown}
              onPointerMove={handleScrubPointerMove}
              onPointerUp={handleScrubPointerUp}
              className="relative h-10 cursor-pointer rounded-xl border border-secondary-color/40 bg-background/80 touch-none select-none"
            >
              {selectedRegularImageOverlay && !isBusy && (
                <button
                  type="button"
                  data-segment-action="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={handleDeleteSelected}
                  className="absolute -top-10 z-30 flex size-9 -translate-x-1/2 items-center justify-center rounded-xl border border-red-400/40 bg-background text-red-400 shadow-lg transition-all hover:scale-105 hover:bg-red-400/10 active:scale-95"
                  style={{ left: `${selectedRegularImageCenterPercent}%` }}
                  aria-label="Supprimer l'image sélectionnée"
                  title="Supprimer l'image"
                >
                  <Trash2 className="size-4" />
                </button>
              )}

              <span className="pointer-events-none absolute -top-5 left-0 text-[9px] font-extrabold uppercase tracking-wide text-white/30">
                Images
              </span>

              {overlayTrackScale > 0 &&
                packedRegularImageOverlays.map((overlay) => {
                  const left = (overlay.sequenceStart / overlayTrackScale) * 100;
                  const width =
                    ((overlay.sequenceEnd - overlay.sequenceStart) /
                      overlayTrackScale) *
                    100;
                  const isSelected = overlay.id === selectedImageOverlayId;

                  return (
                    <div
                      key={overlay.id}
                      className="absolute inset-y-1 z-20"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <button
                        type="button"
                        data-image-overlay="true"
                        onPointerDown={(event) =>
                          handleImageBodyPointerDown(event, overlay)
                        }
                        onPointerMove={handleScrubPointerMove}
                        onPointerUp={(event) =>
                          handleImagePointerUp(event)
                        }
                        onPointerCancel={(event) =>
                          handleImagePointerUp(event)
                        }
                        className={`absolute inset-0 cursor-grab rounded-md border transition-all active:cursor-grabbing ${
                          isSelected
                            ? "border-cyan-300 bg-cyan-300/25 ring-1 ring-cyan-200/50"
                            : "border-cyan-300/40 bg-cyan-300/10 hover:bg-cyan-300/20"
                        }`}
                        aria-label={`Image ${formatClipTime(overlay.sequenceStart)} à ${formatClipTime(overlay.sequenceEnd)}`}
                        aria-pressed={isSelected}
                      >
                        <span className="pointer-events-none absolute inset-x-1 bottom-0.5 truncate text-[9px] font-extrabold uppercase tracking-wide text-cyan-100/80">
                          {overlay.label}
                        </span>
                      </button>

                      {isSelected && (
                        <>
                          <div
                            role="presentation"
                            data-effect-edge="true"
                            onPointerDown={(event) =>
                              handleImageEdgePointerDown(
                                event,
                                overlay.id,
                                "start",
                              )
                            }
                            onPointerMove={handleScrubPointerMove}
                            onPointerUp={handleScrubPointerUp}
                            onPointerCancel={handleScrubPointerUp}
                            className="absolute inset-y-1 left-0 z-30 w-2 -translate-x-1/2 cursor-ew-resize rounded bg-cyan-200/80"
                            aria-label="Ajuster le début de l'image"
                          />
                          <div
                            role="presentation"
                            data-effect-edge="true"
                            onPointerDown={(event) =>
                              handleImageEdgePointerDown(
                                event,
                                overlay.id,
                                "end",
                              )
                            }
                            onPointerMove={handleScrubPointerMove}
                            onPointerUp={handleScrubPointerUp}
                            onPointerCancel={handleScrubPointerUp}
                            className="absolute inset-y-1 right-0 z-30 w-2 translate-x-1/2 cursor-ew-resize rounded bg-cyan-200/80"
                            aria-label="Ajuster la fin de l'image"
                          />
                        </>
                      )}
                    </div>
                  );
                })}

            </div>
          )}

          {hasStickerTrack && (
            <div
              ref={stickerTrackRef}
              role="slider"
              aria-label="Timeline stickers"
              tabIndex={0}
              onPointerDown={handleImageTrackPointerDown}
              onPointerMove={handleScrubPointerMove}
              onPointerUp={handleScrubPointerUp}
              className="relative h-10 cursor-pointer rounded-xl border border-secondary-color/40 bg-background/80 touch-none select-none"
            >
              {selectedStickerOverlay && !isBusy && (
                <button
                  type="button"
                  data-segment-action="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={handleDeleteSelected}
                  className="absolute -top-10 z-30 flex size-9 -translate-x-1/2 items-center justify-center rounded-xl border border-red-400/40 bg-background text-red-400 shadow-lg transition-all hover:scale-105 hover:bg-red-400/10 active:scale-95"
                  style={{ left: `${selectedStickerCenterPercent}%` }}
                  aria-label="Supprimer le sticker sélectionné"
                  title="Supprimer le sticker"
                >
                  <Trash2 className="size-4" />
                </button>
              )}

              <span className="pointer-events-none absolute -top-5 left-0 text-[9px] font-extrabold uppercase tracking-wide text-white/30">
                Sticker
              </span>

              {overlayTrackScale > 0 &&
                packedStickerOverlays.map((overlay) => {
                  const left = (overlay.sequenceStart / overlayTrackScale) * 100;
                  const width =
                    ((overlay.sequenceEnd - overlay.sequenceStart) /
                      overlayTrackScale) *
                    100;
                  const isSelected = overlay.id === selectedImageOverlayId;

                  return (
                    <div
                      key={overlay.id}
                      className="absolute inset-y-1 z-20"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <button
                        type="button"
                        data-image-overlay="true"
                        onPointerDown={(event) =>
                          handleImageBodyPointerDown(event, overlay)
                        }
                        onPointerMove={handleScrubPointerMove}
                        onPointerUp={(event) =>
                          handleImagePointerUp(event)
                        }
                        onPointerCancel={(event) =>
                          handleImagePointerUp(event)
                        }
                        className={`absolute inset-0 cursor-grab rounded-md border transition-all active:cursor-grabbing ${
                          isSelected
                            ? "border-rose-300 bg-rose-300/25 ring-1 ring-rose-200/50"
                            : "border-rose-300/40 bg-rose-300/10 hover:bg-rose-300/20"
                        }`}
                        aria-label={`Sticker ${formatClipTime(overlay.sequenceStart)} à ${formatClipTime(overlay.sequenceEnd)}`}
                        aria-pressed={isSelected}
                      >
                        <span className="pointer-events-none absolute inset-x-1 bottom-0.5 truncate text-[9px] font-extrabold uppercase tracking-wide text-rose-100/80">
                          {overlay.label}
                        </span>
                      </button>

                      {isSelected && (
                        <>
                          <div
                            role="presentation"
                            data-effect-edge="true"
                            onPointerDown={(event) =>
                              handleImageEdgePointerDown(
                                event,
                                overlay.id,
                                "start",
                              )
                            }
                            onPointerMove={handleScrubPointerMove}
                            onPointerUp={handleScrubPointerUp}
                            onPointerCancel={handleScrubPointerUp}
                            className="absolute inset-y-1 left-0 z-30 w-2 -translate-x-1/2 cursor-ew-resize rounded bg-rose-200/80"
                            aria-label="Ajuster le début du sticker"
                          />
                          <div
                            role="presentation"
                            data-effect-edge="true"
                            onPointerDown={(event) =>
                              handleImageEdgePointerDown(
                                event,
                                overlay.id,
                                "end",
                              )
                            }
                            onPointerMove={handleScrubPointerMove}
                            onPointerUp={handleScrubPointerUp}
                            onPointerCancel={handleScrubPointerUp}
                            className="absolute inset-y-1 right-0 z-30 w-2 translate-x-1/2 cursor-ew-resize rounded bg-rose-200/80"
                            aria-label="Ajuster la fin du sticker"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {hasTextTrack && (
            <div
              ref={textTrackRef}
              role="slider"
              aria-label="Timeline textes"
              tabIndex={0}
              onPointerDown={handleTextTrackPointerDown}
              onPointerMove={handleScrubPointerMove}
              onPointerUp={handleScrubPointerUp}
              className="relative h-10 cursor-pointer rounded-xl border border-secondary-color/40 bg-background/80 touch-none select-none"
            >
              {selectedTextOverlay && !isBusy && (
                <button
                  type="button"
                  data-segment-action="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={handleDeleteSelected}
                  className="absolute -top-10 z-30 flex size-9 -translate-x-1/2 items-center justify-center rounded-xl border border-red-400/40 bg-background text-red-400 shadow-lg transition-all hover:scale-105 hover:bg-red-400/10 active:scale-95"
                  style={{ left: `${selectedTextOverlayCenterPercent}%` }}
                  aria-label="Supprimer le texte sélectionné"
                  title="Supprimer le texte"
                >
                  <Trash2 className="size-4" />
                </button>
              )}

              <span className="pointer-events-none absolute -top-5 left-0 text-[9px] font-extrabold uppercase tracking-wide text-white/30">
                Textes
              </span>

              {overlayTrackScale > 0 &&
                packedTextOverlays.map((overlay) => {
                  const left = (overlay.sequenceStart / overlayTrackScale) * 100;
                  const width =
                    ((overlay.sequenceEnd - overlay.sequenceStart) /
                      overlayTrackScale) *
                    100;
                  const isSelected = overlay.id === selectedTextOverlayId;

                  return (
                    <div
                      key={overlay.id}
                      className="absolute inset-y-1 z-20"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <button
                        type="button"
                        data-text-overlay="true"
                        onPointerDown={(event) =>
                          handleTextBodyPointerDown(event, overlay)
                        }
                        onPointerMove={handleScrubPointerMove}
                        onPointerUp={(event) =>
                          handleTextPointerUp(event)
                        }
                        onPointerCancel={(event) =>
                          handleTextPointerUp(event)
                        }
                        className={`absolute inset-0 cursor-grab rounded-md border transition-all active:cursor-grabbing ${
                          isSelected
                            ? "border-violet-300 bg-violet-300/25 ring-1 ring-violet-200/50"
                            : "border-violet-300/40 bg-violet-300/10 hover:bg-violet-300/20"
                        }`}
                        aria-label={`Texte ${formatClipTime(overlay.sequenceStart)} à ${formatClipTime(overlay.sequenceEnd)}`}
                        aria-pressed={isSelected}
                      >
                        <span className="pointer-events-none absolute inset-x-1 bottom-0.5 truncate text-[9px] font-extrabold uppercase tracking-wide text-violet-100/80">
                          {overlay.label}
                        </span>
                      </button>

                      {isSelected && (
                        <>
                          <div
                            role="presentation"
                            data-effect-edge="true"
                            onPointerDown={(event) =>
                              handleTextEdgePointerDown(
                                event,
                                overlay.id,
                                "start",
                              )
                            }
                            onPointerMove={handleScrubPointerMove}
                            onPointerUp={handleScrubPointerUp}
                            onPointerCancel={handleScrubPointerUp}
                            className="absolute inset-y-1 left-0 z-30 w-2 -translate-x-1/2 cursor-ew-resize rounded bg-violet-200/80"
                            aria-label="Ajuster le début du texte"
                          />
                          <div
                            role="presentation"
                            data-effect-edge="true"
                            onPointerDown={(event) =>
                              handleTextEdgePointerDown(
                                event,
                                overlay.id,
                                "end",
                              )
                            }
                            onPointerMove={handleScrubPointerMove}
                            onPointerUp={handleScrubPointerUp}
                            onPointerCancel={handleScrubPointerUp}
                            className="absolute inset-y-1 right-0 z-30 w-2 translate-x-1/2 cursor-ew-resize rounded bg-violet-200/80"
                            aria-label="Ajuster la fin du texte"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {hasSoundboardTrack && (
            <div
              ref={soundboardTrackRef}
              role="slider"
              aria-label="Timeline soundboards"
              tabIndex={0}
              onPointerDown={handleSoundboardTrackPointerDown}
              onPointerMove={handleScrubPointerMove}
              onPointerUp={handleScrubPointerUp}
              className="relative h-10 cursor-pointer rounded-xl border border-secondary-color/40 bg-background/80 touch-none select-none"
            >
              {selectedSoundboard && !isBusy && (
                <button
                  type="button"
                  data-segment-action="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={handleDeleteSelected}
                  className="absolute -top-10 z-30 flex size-9 -translate-x-1/2 items-center justify-center rounded-xl border border-red-400/40 bg-background text-red-400 shadow-lg transition-all hover:scale-105 hover:bg-red-400/10 active:scale-95"
                  style={{ left: `${selectedSoundboardCenterPercent}%` }}
                  aria-label="Supprimer le son sélectionné"
                  title="Supprimer le son"
                >
                  <Trash2 className="size-4" />
                </button>
              )}

              <span className="pointer-events-none absolute -top-5 left-0 text-[9px] font-extrabold uppercase tracking-wide text-white/30">
                Soundboards
              </span>

              {overlayTrackScale > 0 &&
                packedSoundboards.map((clip) => {
                  const left = (clip.sequenceStart / overlayTrackScale) * 100;
                  const width =
                    ((clip.sequenceEnd - clip.sequenceStart) / overlayTrackScale) *
                    100;
                  const isSelected = clip.id === selectedSoundboardId;

                  return (
                    <div
                      key={clip.id}
                      className="absolute inset-y-1 z-20"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <button
                        type="button"
                        data-soundboard-clip="true"
                        onPointerDown={(event) =>
                          handleSoundboardBodyPointerDown(event, clip)
                        }
                        onPointerMove={handleScrubPointerMove}
                        onPointerUp={(event) =>
                          handleSoundboardPointerUp(event)
                        }
                        onPointerCancel={(event) =>
                          handleSoundboardPointerUp(event)
                        }
                        className={`absolute inset-0 cursor-grab rounded-md border transition-all active:cursor-grabbing ${
                          isSelected
                            ? "border-emerald-300 bg-emerald-400/25 ring-1 ring-emerald-300/50"
                            : "border-transparent bg-emerald-400/10 hover:border-emerald-300/40 hover:bg-emerald-400/20"
                        }`}
                        aria-label={`Son ${clip.label}`}
                        aria-pressed={isSelected}
                      >
                        <span className="pointer-events-none absolute inset-x-1 bottom-0.5 truncate text-[9px] font-extrabold uppercase tracking-wide text-emerald-100/80">
                          {clip.label}
                        </span>
                      </button>

                      {isSelected && (
                        <>
                          <div
                            role="presentation"
                            data-effect-edge="true"
                            onPointerDown={(event) =>
                              handleSoundboardEdgePointerDown(
                                event,
                                clip.id,
                                "start",
                              )
                            }
                            onPointerMove={handleScrubPointerMove}
                            onPointerUp={handleScrubPointerUp}
                            onPointerCancel={handleScrubPointerUp}
                            className="absolute inset-y-1 left-0 z-30 w-2 -translate-x-1/2 cursor-ew-resize rounded bg-emerald-200/80"
                            aria-label="Ajuster le début du son"
                          />
                          <div
                            role="presentation"
                            data-effect-edge="true"
                            onPointerDown={(event) =>
                              handleSoundboardEdgePointerDown(
                                event,
                                clip.id,
                                "end",
                              )
                            }
                            onPointerMove={handleScrubPointerMove}
                            onPointerUp={handleScrubPointerUp}
                            onPointerCancel={handleScrubPointerUp}
                            className="absolute inset-y-1 right-0 z-30 w-2 translate-x-1/2 cursor-ew-resize rounded bg-emerald-200/80"
                            aria-label="Ajuster la fin du son"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          <div
            ref={trackRef}
            role="slider"
            aria-label="Timeline vidéo"
            aria-valuemin={0}
            aria-valuemax={timelineDuration}
            aria-valuenow={sequenceTime}
            tabIndex={0}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleScrubPointerMove}
            onPointerUp={handleScrubPointerUp}
            className="relative h-14 cursor-pointer rounded-xl border border-secondary-color/60 bg-background touch-none select-none"
          >
            {selectedTimelineVideo && !isBusy && (
              <button
                type="button"
                data-segment-action="true"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handleDeleteSelected}
                className="absolute -top-10 z-30 flex size-9 -translate-x-1/2 items-center justify-center rounded-xl border border-red-400/40 bg-background text-red-400 shadow-lg transition-all hover:scale-105 hover:bg-red-400/10 active:scale-95"
                style={{ left: `${selectedTimelineVideoCenterPercent}%` }}
                aria-label="Supprimer la vidéo sélectionnée"
                title="Supprimer la vidéo"
              >
                <Trash2 className="size-4" />
              </button>
            )}

            {selectedSegment && !isBusy && (
              <button
                type="button"
                data-segment-action="true"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handleDeleteSelected}
                className="absolute -top-10 z-30 flex size-9 -translate-x-1/2 items-center justify-center rounded-xl border border-red-400/40 bg-background text-red-400 shadow-lg transition-all hover:scale-105 hover:bg-red-400/10 active:scale-95"
                style={{ left: `${selectedSegmentCenterPercent}%` }}
                aria-label="Supprimer le segment sélectionné"
                title="Supprimer ce segment"
              >
                <Trash2 className="size-4" />
              </button>
            )}

            <div
              className="pointer-events-none absolute inset-y-2 left-0 overflow-hidden rounded-lg bg-secondary-color/30"
              style={{ width: `${mainPlayheadPercent}%`, ...playheadMotionStyle }}
            />

            {hasExtendedTimeline && actualBaseEnd > 0 && (
              <div
                className="pointer-events-none absolute inset-y-1 left-0 z-10 rounded-md border border-main-color/25 bg-main-color/10"
                style={{
                  width: `${(actualBaseEnd / timelineDuration) * 100}%`,
                }}
                aria-hidden="true"
              />
            )}

            {editedDuration > 0 &&
              segments.map((segment) => {
                const left = (segment.sequenceStart / mainTrackScale) * 100;
                const width =
                  ((segment.sequenceEnd - segment.sequenceStart) /
                    mainTrackScale) *
                  100;
                const isSelected = segment.id === selectedSegmentId;
                const speedLabel =
                  segment.speed !== 0 ? formatSpeedLabel(segment.speed) : null;

                return (
                  <button
                    key={segment.id}
                    type="button"
                    data-segment="true"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      isDraggingRef.current = false;
                      setSelectedSegmentId(segment.id);
                      setSelectedZoomEffectId(null);
                      setSelectedImageOverlayId(null);
                      setSelectedTextOverlayId(null);
                      setSelectedSoundboardId(null);
                      setSelectedTimelineVideoId(null);
                      setIsPlaying(false);
                    }}
                    className={`absolute inset-y-1 z-20 rounded-md border transition-all ${
                      isSelected
                        ? "border-main-color bg-main-color/25 ring-1 ring-main-color/50"
                        : "border-transparent bg-white/5 hover:border-main-color/30 hover:bg-main-color/10"
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    aria-label={`Segment ${formatClipTime(segment.sequenceStart)} à ${formatClipTime(segment.sequenceEnd)}${speedLabel ? ` — ${speedLabel}` : ""}`}
                    aria-pressed={isSelected}
                    title={speedLabel ? `Vitesse ${speedLabel}` : undefined}
                  >
                    {speedLabel && width > 6 ? (
                      <span className="pointer-events-none absolute bottom-0.5 left-1 truncate text-[8px] font-extrabold uppercase tracking-wide text-main-color/80">
                        {speedLabel}
                      </span>
                    ) : null}
                  </button>
                );
              })}

            {timelineDuration > 0 &&
              timelineVideos.map((clip) => {
                const seqDuration = getTimelineVideoSequenceDuration(clip);
                const isDraggingMemePreview =
                  memeDragPreviewStart !== null &&
                  timelineVideoDragRef.current?.clipId === clip.id &&
                  clip.importKind === "meme";
                const displayStart = isDraggingMemePreview
                  ? memeDragPreviewStart
                  : clip.sequenceStart;
                const left = (displayStart / mainTrackScale) * 100;
                const width = (seqDuration / mainTrackScale) * 100;
                const isSelected = clip.id === selectedTimelineVideoId;
                const speedLabel =
                  getTimelineVideoSpeed(clip) !== 0
                    ? formatSpeedLabel(getTimelineVideoSpeed(clip))
                    : null;

                return (
                  <div
                    key={clip.id}
                    className="absolute inset-y-1 z-20"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <button
                      type="button"
                      data-timeline-video="true"
                      onPointerDown={(event) =>
                        handleTimelineVideoBodyPointerDown(event, clip)
                      }
                      onPointerMove={handleScrubPointerMove}
                      onPointerUp={(event) => handleTimelineVideoPointerUp(event)}
                      onPointerCancel={(event) =>
                        handleTimelineVideoPointerUp(event)
                      }
                      className={`absolute inset-0 cursor-grab rounded-md border transition-all active:cursor-grabbing ${
                        isSelected
                          ? "border-sky-300 bg-sky-300/25 ring-1 ring-sky-200/50"
                          : "border-sky-300/40 bg-sky-300/10 hover:bg-sky-300/20"
                      }`}
                      aria-label={`Vidéo ${clip.label}`}
                      aria-pressed={isSelected}
                      title={speedLabel ? `Vitesse ${speedLabel}` : undefined}
                    >
                      <span className="pointer-events-none absolute inset-x-1 bottom-0.5 truncate text-[9px] font-extrabold uppercase tracking-wide text-sky-100/80">
                        {clip.label}
                      </span>
                      {speedLabel && width > 6 ? (
                        <span className="pointer-events-none absolute left-1 top-0.5 truncate text-[8px] font-extrabold uppercase tracking-wide text-sky-200/80">
                          {speedLabel}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })}

            {editedDuration > 0 &&
              cutMarkers.map((point) => (
                <div
                  key={point}
                  className="pointer-events-none absolute inset-y-0 z-[25] w-0.5 bg-main-color"
                  style={{ left: `${(point / mainTrackScale) * 100}%` }}
                />
              ))}

          </div>
        </div>
        </div>
        </div>

        {timelineZoom > 1.01 && (
          <div
            ref={timelineScrollbarRef}
            onScroll={handleTimelineScrollbarScroll}
            className="timeline-scrollbar mt-1.5 h-2 overflow-x-auto overflow-y-hidden"
            aria-label="Défilement horizontal de la timeline"
          >
            <div
              className="h-px"
              style={{ width: timelineContentWidth }}
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      <ClipImageImportDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onImport={handleImageImport}
      />
      <ClipVideoImportKindDialog
        open={videoKindDialogOpen}
        onClose={() => setVideoKindDialogOpen(false)}
        onSelect={(kind) => {
          setVideoImportKind(kind);
          setVideoKindDialogOpen(false);
          setVideoDialogOpen(true);
        }}
      />
      <ClipVideoImportDialog
        open={videoDialogOpen}
        importKind={videoImportKind}
        onClose={() => setVideoDialogOpen(false)}
        onComplete={handleVideoImportComplete}
      />
    </div>
  );
}
