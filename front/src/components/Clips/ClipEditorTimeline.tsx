import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildPackedSegments,
  formatClipTime,
  getEditedDuration,
  getPackedCutMarkers,
  removeKeepSegmentById,
  sequenceTimeToSourceTime,
  snapTimeToKeepSegments,
  sourceTimeToSequenceTime,
  MAX_TIMELINE_HISTORY,
} from "../../lib/clipTime";
import {
  mapImageOverlaysToSequence,
  moveImageOverlayBySequenceOffset,
  updateImageOverlayBounds,
} from "../../lib/clipImageOverlays";
import {
  findTextOverlayAtTime,
  mapTextOverlaysToSequence,
  moveTextOverlayBySequenceOffset,
  updateTextOverlayBounds,
} from "../../lib/clipTextOverlays";
import {
  mapZoomEffectsToSequence,
  moveZoomEffectBySequenceOffset,
  updateZoomEffectBounds,
} from "../../lib/clipZoomEffects";
import { useApplyClipCut } from "../../hooks/useApplyClipCut";
import ClipEditorPreviewVolumeSlider from "./ClipEditorPreviewVolumeSlider";
import ClipImageImportDialog from "./ClipImageImportDialog";
import { useClipEditorStore } from "../../stores/clipEditorStore";

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

export default function ClipEditorTimeline() {
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const effectTrackRef = useRef<HTMLDivElement>(null);
  const imageTrackRef = useRef<HTMLDivElement>(null);
  const textTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const scrubModeRef = useRef<ScrubMode>(null);
  const effectDragRef = useRef<EffectDragState | null>(null);
  const imageDragRef = useRef<ImageDragState | null>(null);
  const textDragRef = useRef<TextDragState | null>(null);
  const effectEditedRef = useRef(false);
  const imageEditedRef = useRef(false);
  const textEditedRef = useRef(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

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

  const segments = useMemo(
    () => buildPackedSegments(keepSegments),
    [keepSegments],
  );
  const packedZoomEffects = useMemo(
    () => mapZoomEffectsToSequence(zoomEffects, keepSegments),
    [zoomEffects, keepSegments],
  );
  const packedImageOverlays = useMemo(
    () => mapImageOverlaysToSequence(imageOverlays, keepSegments),
    [imageOverlays, keepSegments],
  );
  const packedTextOverlays = useMemo(
    () => mapTextOverlaysToSequence(textOverlays, keepSegments),
    [textOverlays, keepSegments],
  );
  const editedDuration = useMemo(
    () => getEditedDuration(keepSegments),
    [keepSegments],
  );
  const sequenceTime = useMemo(
    () => sourceTimeToSequenceTime(currentTime, keepSegments),
    [currentTime, keepSegments],
  );
  const cutMarkers = useMemo(
    () => getPackedCutMarkers(keepSegments),
    [keepSegments],
  );

  const setCurrentTime = useClipEditorStore((s) => s.setCurrentTime);
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

  useEffect(() => {
    const handlePointerDownOutside = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (trackAreaRef.current?.contains(target)) return;
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
      if (!track || editedDuration <= 0) return;

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const seqTime = ratio * editedDuration;
      const sourceTime = sequenceTimeToSourceTime(seqTime, keepSegments);
      setCurrentTime(snapTimeToKeepSegments(sourceTime, keepSegments));
    },
    [editedDuration, keepSegments, setCurrentTime],
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
    if (mode === "track") {
      setSelectedSegmentId(null);
      setSelectedZoomEffectId(null);
      setSelectedImageOverlayId(null);
      setSelectedTextOverlayId(null);
    }
    seekFromClientX(event.clientX, trackRef.current);
  };

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.dataset.segment === "true") return;
    if (target.dataset.zoomEffect === "true") return;
    if (target.dataset.imageOverlay === "true") return;
    if (target.dataset.textOverlay === "true") return;
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
    setIsPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const applyEffectDragAtClientX = (clientX: number, mode: ScrubMode) => {
    const track = effectTrackRef.current;
    if (!track || editedDuration <= 0 || !effectDragRef.current) return;

    const effect = zoomEffects.find(
      (item) => item.id === effectDragRef.current?.effectId,
    );
    if (!effect) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const seqTime = ratio * editedDuration;
    const sourceTime = sequenceTimeToSourceTime(seqTime, keepSegments);

    if (!effectEditedRef.current) {
      recordTimelineSnapshot();
      effectEditedRef.current = true;
    }

    if (mode === "effect-move") {
      const deltaX = clientX - effectDragRef.current.initialClientX;
      const sequenceOffset = (deltaX / rect.width) * editedDuration;
      const updated = moveZoomEffectBySequenceOffset(
        effect,
        sequenceOffset,
        keepSegments,
        effectDragRef.current.initialSeqStart,
        effectDragRef.current.initialSeqEnd,
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
        ? updateZoomEffectBounds(effect, { start: sourceTime }, keepSegments)
        : updateZoomEffectBounds(effect, { end: sourceTime }, keepSegments);

    if (updated) {
      updateZoomEffect(effect.id, {
        start: updated.start,
        end: updated.end,
      });
    }
  };

  const applyImageDragAtClientX = (clientX: number, mode: ScrubMode) => {
    const track = imageTrackRef.current;
    if (!track || editedDuration <= 0 || !imageDragRef.current) return;

    const overlay = imageOverlays.find(
      (item) => item.id === imageDragRef.current?.overlayId,
    );
    if (!overlay) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const seqTime = ratio * editedDuration;
    const sourceTime = sequenceTimeToSourceTime(seqTime, keepSegments);

    if (!imageEditedRef.current) {
      recordTimelineSnapshot();
      imageEditedRef.current = true;
    }

    if (mode === "image-move") {
      const deltaX = clientX - imageDragRef.current.initialClientX;
      const sequenceOffset = (deltaX / rect.width) * editedDuration;
      const updated = moveImageOverlayBySequenceOffset(
        overlay,
        sequenceOffset,
        keepSegments,
        imageDragRef.current.initialSeqStart,
        imageDragRef.current.initialSeqEnd,
      );
      if (updated) {
        updateImageOverlay(overlay.id, {
          start: updated.start,
          end: updated.end,
        });
      }
      return;
    }

    const updated =
      mode === "image-start"
        ? updateImageOverlayBounds(overlay, { start: sourceTime }, keepSegments)
        : updateImageOverlayBounds(overlay, { end: sourceTime }, keepSegments);

    if (updated) {
      updateImageOverlay(overlay.id, {
        start: updated.start,
        end: updated.end,
      });
    }
  };

  const applyTextDragAtClientX = (clientX: number, mode: ScrubMode) => {
    const track = textTrackRef.current;
    if (!track || editedDuration <= 0 || !textDragRef.current) return;

    const overlay = textOverlays.find(
      (item) => item.id === textDragRef.current?.overlayId,
    );
    if (!overlay) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width),
    );
    const seqTime = ratio * editedDuration;
    const sourceTime = sequenceTimeToSourceTime(seqTime, keepSegments);

    if (!textEditedRef.current) {
      recordTimelineSnapshot();
      textEditedRef.current = true;
    }

    if (mode === "text-move") {
      const deltaX = clientX - textDragRef.current.initialClientX;
      const sequenceOffset = (deltaX / rect.width) * editedDuration;
      const updated = moveTextOverlayBySequenceOffset(
        overlay,
        sequenceOffset,
        keepSegments,
        textDragRef.current.initialSeqStart,
        textDragRef.current.initialSeqEnd,
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
        ? updateTextOverlayBounds(overlay, { start: sourceTime }, keepSegments)
        : updateTextOverlayBounds(overlay, { end: sourceTime }, keepSegments);

    if (updated) {
      updateTextOverlay(overlay.id, {
        start: updated.start,
        end: updated.end,
      });
    }
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

    seekFromClientX(event.clientX, trackRef.current);
  };

  const handleEffectPointerUp = (
    event: PointerEvent<HTMLElement>,
    effectStart: number,
  ) => {
    if (!effectEditedRef.current) {
      setCurrentTime(effectStart);
    }
    isDraggingRef.current = false;
    scrubModeRef.current = null;
    effectDragRef.current = null;
    effectEditedRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleImagePointerUp = (
    event: PointerEvent<HTMLElement>,
    overlayStart: number,
  ) => {
    if (!imageEditedRef.current) {
      setCurrentTime(overlayStart);
    }
    isDraggingRef.current = false;
    scrubModeRef.current = null;
    imageDragRef.current = null;
    imageEditedRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleTextPointerUp = (
    event: PointerEvent<HTMLElement>,
    overlayStart: number,
  ) => {
    if (!textEditedRef.current) {
      setCurrentTime(overlayStart);
    }
    isDraggingRef.current = false;
    scrubModeRef.current = null;
    textDragRef.current = null;
    textEditedRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleScrubPointerUp = (event: PointerEvent<HTMLElement>) => {
    isDraggingRef.current = false;
    scrubModeRef.current = null;
    effectDragRef.current = null;
    imageDragRef.current = null;
    textDragRef.current = null;
    effectEditedRef.current = false;
    imageEditedRef.current = false;
    textEditedRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleCut = () => {
    const added = addCutAtCurrentTime();
    if (!added) {
      toast.error(
        "Impossible de couper ici (trop près d'un cut existant, d'un bord ou d'une zone supprimée)",
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
  const disabled = editedDuration <= 0 || isBusy;

  const playheadPercent =
    editedDuration > 0 ? (sequenceTime / editedDuration) * 100 : 0;
  const playheadMotionStyle = isPlaying
    ? ({ willChange: "left, width" } as const)
    : undefined;
  const selectedSegmentCenterPercent = selectedSegment
    ? (((selectedSegment.sequenceStart + selectedSegment.sequenceEnd) / 2) /
        editedDuration) *
      100
    : 0;
  const selectedZoomEffectCenterPercent = selectedZoomEffect
    ? (((selectedZoomEffect.sequenceStart + selectedZoomEffect.sequenceEnd) /
          2) /
          editedDuration) *
        100
    : 0;

  const selectedImageOverlayCenterPercent = selectedImageOverlay
    ? (((selectedImageOverlay.sequenceStart +
          selectedImageOverlay.sequenceEnd) /
          2) /
          editedDuration) *
        100
    : 0;

  const hasZoomTrack = zoomEffects.length > 0;
  const hasImageTrack = imageOverlays.length > 0;
  const hasTextTrack = textOverlays.length > 0;
  const overlayTrackCount = [hasZoomTrack, hasImageTrack, hasTextTrack].filter(
    Boolean,
  ).length;
  const hasOverlayTracks = overlayTrackCount > 0;
  const overlayTracksMaxHeight =
    overlayTrackCount >= 3
      ? "max-h-[272px]"
      : overlayTrackCount === 2
        ? "max-h-[220px]"
        : "max-h-[168px]";

  const handleImageImport = (src: string, label: string) => {
    const created = addImageOverlay(src, label);
    if (!created) {
      toast.error(
        "Impossible d'ajouter une image ici (hors segment conservé ou durée trop courte)",
      );
    }
  };

  const handleTextTool = () => {
    const existing = findTextOverlayAtTime(textOverlays, currentTime);
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
          editedDuration) *
        100
    : 0;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-secondary-color/50 bg-background-secondary px-4 py-4 md:px-6 md:py-5">
      <div className="flex flex-wrap items-center gap-3">
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
          title="Image — import URL ou fichier"
        >
          <ImagePlus className="size-5" />
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

        <div className="ml-auto flex items-center gap-2">
          <ClipEditorPreviewVolumeSlider />

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
        className={`overflow-visible pr-1 ${
          hasOverlayTracks
            ? `${overlayTracksMaxHeight} overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-secondary-color/80 [&::-webkit-scrollbar-track]:bg-transparent`
            : ""
        }`}
      >
        <div
          ref={trackAreaRef}
          className="relative space-y-2 overflow-visible pb-2 pt-10"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedSegmentId(null);
              setSelectedZoomEffectId(null);
              setSelectedImageOverlayId(null);
              setSelectedTextOverlayId(null);
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

              {editedDuration > 0 &&
                packedZoomEffects.map((effect) => {
                  const left = (effect.sequenceStart / editedDuration) * 100;
                  const width =
                    ((effect.sequenceEnd - effect.sequenceStart) /
                      editedDuration) *
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
                          handleEffectPointerUp(event, effect.start)
                        }
                        onPointerCancel={(event) =>
                          handleEffectPointerUp(event, effect.start)
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

              <div
                className="pointer-events-none absolute top-1/2 z-10 h-8 w-0.5 -translate-y-1/2 bg-main-color/40"
                style={{ left: `${playheadPercent}%`, ...playheadMotionStyle }}
              />
            </div>
          )}

          {hasImageTrack && (
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
              {selectedImageOverlay && !isBusy && (
                <button
                  type="button"
                  data-segment-action="true"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={handleDeleteSelected}
                  className="absolute -top-10 z-30 flex size-9 -translate-x-1/2 items-center justify-center rounded-xl border border-red-400/40 bg-background text-red-400 shadow-lg transition-all hover:scale-105 hover:bg-red-400/10 active:scale-95"
                  style={{ left: `${selectedImageOverlayCenterPercent}%` }}
                  aria-label="Supprimer l'image sélectionnée"
                  title="Supprimer l'image"
                >
                  <Trash2 className="size-4" />
                </button>
              )}

              <span className="pointer-events-none absolute -top-5 left-0 text-[9px] font-extrabold uppercase tracking-wide text-white/30">
                Images
              </span>

              {editedDuration > 0 &&
                packedImageOverlays.map((overlay) => {
                  const left = (overlay.sequenceStart / editedDuration) * 100;
                  const width =
                    ((overlay.sequenceEnd - overlay.sequenceStart) /
                      editedDuration) *
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
                          handleImagePointerUp(event, overlay.start)
                        }
                        onPointerCancel={(event) =>
                          handleImagePointerUp(event, overlay.start)
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

              <div
                className="pointer-events-none absolute top-1/2 z-10 h-8 w-0.5 -translate-y-1/2 bg-main-color/40"
                style={{ left: `${playheadPercent}%`, ...playheadMotionStyle }}
              />
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

              {editedDuration > 0 &&
                packedTextOverlays.map((overlay) => {
                  const left = (overlay.sequenceStart / editedDuration) * 100;
                  const width =
                    ((overlay.sequenceEnd - overlay.sequenceStart) /
                      editedDuration) *
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
                          handleTextPointerUp(event, overlay.start)
                        }
                        onPointerCancel={(event) =>
                          handleTextPointerUp(event, overlay.start)
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

              <div
                className="pointer-events-none absolute top-1/2 z-10 h-8 w-0.5 -translate-y-1/2 bg-main-color/40"
                style={{ left: `${playheadPercent}%`, ...playheadMotionStyle }}
              />
            </div>
          )}

          <div
            ref={trackRef}
            role="slider"
            aria-label="Timeline vidéo"
            aria-valuemin={0}
            aria-valuemax={editedDuration}
            aria-valuenow={sequenceTime}
            tabIndex={0}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleScrubPointerMove}
            onPointerUp={handleScrubPointerUp}
            className="relative h-14 cursor-pointer rounded-xl border border-secondary-color/60 bg-background touch-none select-none"
          >
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
              style={{ width: `${playheadPercent}%`, ...playheadMotionStyle }}
            />

            {editedDuration > 0 &&
              segments.map((segment) => {
                const left = (segment.sequenceStart / editedDuration) * 100;
                const width =
                  ((segment.sequenceEnd - segment.sequenceStart) /
                    editedDuration) *
                  100;
                const isSelected = segment.id === selectedSegmentId;

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
                      setIsPlaying(false);
                      setCurrentTime(segment.start);
                    }}
                    className={`absolute inset-y-1 z-20 rounded-md border transition-all ${
                      isSelected
                        ? "border-main-color bg-main-color/25 ring-1 ring-main-color/50"
                        : "border-transparent bg-white/5 hover:border-main-color/30 hover:bg-main-color/10"
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    aria-label={`Segment ${formatClipTime(segment.sequenceStart)} à ${formatClipTime(segment.sequenceEnd)}`}
                    aria-pressed={isSelected}
                  />
                );
              })}

            {editedDuration > 0 &&
              cutMarkers.map((point) => (
                <div
                  key={point}
                  className="pointer-events-none absolute inset-y-0 z-[25] w-0.5 bg-main-color"
                  style={{ left: `${(point / editedDuration) * 100}%` }}
                />
              ))}

            <div
              data-playhead="true"
              role="slider"
              aria-label="Curseur de lecture"
              aria-valuemin={0}
              aria-valuemax={editedDuration}
              aria-valuenow={sequenceTime}
              tabIndex={
                selectedSegmentId ||
                selectedZoomEffectId ||
                selectedImageOverlayId ||
                selectedTextOverlayId
                  ? -1
                  : 0
              }
              onPointerDown={handlePlayheadPointerDown}
              onPointerMove={handleScrubPointerMove}
              onPointerUp={handleScrubPointerUp}
              className={`absolute top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center touch-none select-none ${
                selectedSegmentId ||
                selectedZoomEffectId ||
                selectedImageOverlayId ||
                selectedTextOverlayId
                  ? "pointer-events-none"
                  : "pointer-events-auto cursor-grab active:cursor-grabbing"
              }`}
              style={{ left: `${playheadPercent}%`, ...playheadMotionStyle }}
            >
              <div className="absolute h-12 w-6" aria-hidden="true" />
              <div className="relative h-9 w-1 rounded-full bg-main-color shadow-[0_0_8px_rgba(205,183,255,0.6)]" />
            </div>
          </div>
        </div>
      </div>

      <ClipImageImportDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onImport={handleImageImport}
      />
    </div>
  );
}
