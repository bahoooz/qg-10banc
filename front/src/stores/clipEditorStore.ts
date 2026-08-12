import { create } from "zustand";
import type { ClipImportResult, ClipExportResult } from "../../types";
import {
  canAddCutInKeepSegments,
  cloneKeepSegments,
  cloneTimelineSnapshot,
  MAX_TIMELINE_HISTORY,
  snapTimeToKeepSegments,
  splitKeepSegmentAt,
  type TimelineSnapshot,
  type TimeRange,
} from "../lib/clipTime";
import {
  DEFAULT_LAYOUT,
  type CamShape,
  type CamZone,
  type ClipLayoutState,
  type NormalizedPoint,
} from "../lib/clipLayout";
import { clipDebug } from "../lib/clipDebug";
import {
  clampZoomZone,
  cloneZoomEffects,
  createZoomEffectAtTime,
  findZoomEffectAtTime,
  type ZoomEffect,
  type ZoomEffectZone,
} from "../lib/clipZoomEffects";
import {
  clampImageOverlayZone,
  cloneImageOverlays,
  createImageOverlayAtTime,
  type ImageOverlay,
  type ImageOverlayZone,
} from "../lib/clipImageOverlays";
import {
  cloneTextOverlays,
  createTextOverlayAtTime,
  createTextOverlayLabel,
  clampTextOverlayLetterSpacing,
  type TextOverlay,
  type TextOverlayStyle,
} from "../lib/clipTextOverlays";
import {
  createSubtitleWordAtSourceTime,
  DEFAULT_SUBTITLE_LAYOUT,
  DEFAULT_SUBTITLE_STYLE,
  DEFAULT_SUBTITLE_TIMING,
  normalizeSubtitleLayout,
  normalizeTranscribedWords,
  sortSubtitleWords,
  SUBTITLE_PREVIEW_REF_WIDTH,
  updateSubtitleWordBounds,
  type SubtitleLayout,
  type SubtitleStyle,
  type SubtitleTiming,
  type SubtitleWord,
} from "../lib/clipSubtitles";

export type ClipEditorStep = "layout" | "montage" | "subtitles" | "export";

type ClipEditorState = {
  clipId: string;
  previewUrl: string;
  sourceUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceDuration: number;
  currentTime: number;
  isPlaying: boolean;
  isApplyingCut: boolean;
  isExporting: boolean;
  isTranscribing: boolean;
  editorStep: ClipEditorStep;
  exportUrl: string | null;
  exportResult: ClipExportResult | null;
  exportProgress: number;
  exportPhase: string;
  layout: ClipLayoutState;
  keepSegments: TimeRange[];
  selectedSegmentId: string | null;
  lastFfmpegCutPayload: TimeRange[] | null;
  timelineUndoStack: TimelineSnapshot[];
  timelineRedoStack: TimelineSnapshot[];
  subtitleWords: SubtitleWord[];
  selectedSubtitleWordId: string | null;
  subtitleStyle: SubtitleStyle;
  subtitleTiming: SubtitleTiming;
  subtitleLayout: SubtitleLayout;
  subtitleLanguage: string | null;
  zoomEffects: ZoomEffect[];
  selectedZoomEffectId: string | null;
  isZoomToolActive: boolean;
  imageOverlays: ImageOverlay[];
  selectedImageOverlayId: string | null;
  isImageToolActive: boolean;
  textOverlays: TextOverlay[];
  selectedTextOverlayId: string | null;
  isTextToolActive: boolean;
  /** Volume preview local 0–1 (n'affecte pas l'export). */
  previewVolume: number;
  /** Largeur px du conteneur preview 9:16 (pour caler l'export). */
  previewContainerWidth: number;

  initFromClip: (clip: ClipImportResult) => void;
  reset: () => void;
  setEditorStep: (step: ClipEditorStep) => void;
  setCamShape: (shape: CamShape) => void;
  setSourceCam: (zone: CamZone) => void;
  setVerticalCam: (point: NormalizedPoint) => void;
  setVerticalCamZone: (zone: CamZone) => void;
  setVerticalCropPan: (pan: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPreviewVolume: (volume: number) => void;
  setPreviewContainerWidth: (width: number) => void;
  setIsApplyingCut: (applying: boolean) => void;
  setIsExporting: (exporting: boolean) => void;
  setExportResult: (result: ClipExportResult | null) => void;
  setExportProgress: (progress: number, phase: string) => void;
  setIsTranscribing: (transcribing: boolean) => void;
  setSourceDuration: (duration: number) => void;
  setSelectedSegmentId: (id: string | null) => void;
  setSubtitleWords: (words: SubtitleWord[]) => void;
  setSelectedSubtitleWordId: (id: string | null) => void;
  updateSubtitleWord: (
    id: string,
    patch: Partial<Pick<SubtitleWord, "text" | "start" | "end">>,
  ) => void;
  addSubtitleWordAtSourceTime: (sourceTime: number) => SubtitleWord | null;
  deleteSelectedSubtitleWord: () => void;
  setSubtitleStyle: (style: SubtitleStyle) => void;
  setSubtitleTiming: (timing: SubtitleTiming) => void;
  setSubtitleLayout: (layout: SubtitleLayout) => void;
  setSubtitleLanguage: (language: string | null) => void;
  toggleZoomTool: () => void;
  setSelectedZoomEffectId: (id: string | null) => void;
  updateZoomEffect: (id: string, patch: Partial<ZoomEffect>) => void;
  updateZoomEffectZone: (id: string, zone: ZoomEffectZone) => void;
  deleteSelectedZoomEffect: () => void;
  addImageOverlay: (src: string, label: string) => ImageOverlay | null;
  setSelectedImageOverlayId: (id: string | null) => void;
  updateImageOverlay: (id: string, patch: Partial<ImageOverlay>) => void;
  updateImageOverlayZone: (id: string, zone: ImageOverlayZone) => void;
  deleteSelectedImageOverlay: () => void;
  addTextOverlay: (text?: string) => TextOverlay | null;
  setSelectedTextOverlayId: (id: string | null) => void;
  updateTextOverlay: (id: string, patch: Partial<TextOverlay>) => void;
  updateTextOverlayLayout: (id: string, layout: SubtitleLayout) => void;
  updateTextOverlayStyle: (id: string, patch: Partial<TextOverlayStyle>) => void;
  deleteSelectedTextOverlay: () => void;
  applyTranscriptionResult: (
    words: { text: string; start: number; end: number }[],
    language: string,
  ) => void;
  recordTimelineSnapshot: () => void;
  addCutAtCurrentTime: () => boolean;
  undoTimeline: () => void;
  redoTimeline: () => { keepSegments: TimeRange[]; restoreRedoSnapshot: TimelineSnapshot } | null;
  applyRenderResult: (
    result: ClipImportResult,
    ffmpegKeepSegments?: TimeRange[],
  ) => void;
};

function createTimelineSnapshot(state: ClipEditorState): TimelineSnapshot {
  return {
    keepSegments: cloneKeepSegments(state.keepSegments),
    sourceDuration: state.sourceDuration,
    previewUrl: state.previewUrl,
    currentTime: state.currentTime,
    ffmpegKeepSegments: state.lastFfmpegCutPayload
      ? cloneKeepSegments(state.lastFfmpegCutPayload)
      : null,
    zoomEffects: cloneZoomEffects(state.zoomEffects),
    imageOverlays: cloneImageOverlays(state.imageOverlays),
    textOverlays: cloneTextOverlays(state.textOverlays),
  };
}

const initialState = {
  clipId: "",
  previewUrl: "",
  sourceUrl: "",
  sourceWidth: 0,
  sourceHeight: 0,
  sourceDuration: 0,
  currentTime: 0,
  isPlaying: false,
  isApplyingCut: false,
  isExporting: false,
  isTranscribing: false,
  editorStep: "layout" as ClipEditorStep,
  exportUrl: null as string | null,
  exportResult: null as ClipExportResult | null,
  exportProgress: 0,
  exportPhase: "",
  layout: DEFAULT_LAYOUT,
  keepSegments: [] as TimeRange[],
  selectedSegmentId: null as string | null,
  lastFfmpegCutPayload: null as TimeRange[] | null,
  timelineUndoStack: [] as TimelineSnapshot[],
  timelineRedoStack: [] as TimelineSnapshot[],
  subtitleWords: [] as SubtitleWord[],
  selectedSubtitleWordId: null as string | null,
  subtitleStyle: DEFAULT_SUBTITLE_STYLE,
  subtitleTiming: DEFAULT_SUBTITLE_TIMING,
  subtitleLayout: DEFAULT_SUBTITLE_LAYOUT,
  subtitleLanguage: null as string | null,
  zoomEffects: [] as ZoomEffect[],
  selectedZoomEffectId: null as string | null,
  isZoomToolActive: false,
  imageOverlays: [] as ImageOverlay[],
  selectedImageOverlayId: null as string | null,
  isImageToolActive: false,
  textOverlays: [] as TextOverlay[],
  selectedTextOverlayId: null as string | null,
  isTextToolActive: false,
  previewVolume: 0.5,
  previewContainerWidth: SUBTITLE_PREVIEW_REF_WIDTH,
};

export const useClipEditorStore = create<ClipEditorState>((set, get) => ({
  ...initialState,

  initFromClip: (clip) => {
    clipDebug.log("store", "initFromClip", {
      clipId: clip.id,
      previewUrl: clip.previewUrl,
      sourceUrl: clip.sourceUrl,
      duration: clip.duration,
    });

    if (!clip.previewUrl) {
      clipDebug.warn("store", "previewUrl vide à l'import", clip);
    }

    set({
      ...initialState,
      clipId: clip.id,
      previewUrl: clip.previewUrl,
      sourceUrl: clip.sourceUrl || clip.previewUrl,
      sourceWidth: clip.width,
      sourceHeight: clip.height,
      sourceDuration: clip.duration,
      keepSegments: [{ start: 0, end: clip.duration }],
      editorStep: "layout",
      layout: DEFAULT_LAYOUT,
    });
  },

  reset: () => {
    clipDebug.log("store", "reset");
    set(initialState);
  },

  setEditorStep: (editorStep) => {
    clipDebug.log("store", "setEditorStep", { editorStep });
    set({ editorStep, isPlaying: false });
  },

  setCamShape: (camShape) => {
    clipDebug.log("layout", "setCamShape", { camShape });
    set((state) => {
      const aspect =
        state.sourceWidth / state.sourceHeight || 16 / 9;

      const sourceCam =
        camShape === "free"
          ? state.layout.sourceCam
          : {
              ...state.layout.sourceCam,
              height: state.layout.sourceCam.width * aspect,
            };

      const verticalCamZone =
        camShape === "free"
          ? state.layout.verticalCamZone
          : {
              ...state.layout.verticalCamZone,
              height: state.layout.verticalCamZone.width * (9 / 16),
            };

      return { layout: { ...state.layout, camShape, sourceCam, verticalCamZone } };
    });
  },

  setSourceCam: (sourceCam) => {
    clipDebug.log("layout", "setSourceCam", sourceCam);
    set((state) => ({ layout: { ...state.layout, sourceCam } }));
  },

  setVerticalCam: (verticalCam) => {
    clipDebug.log("layout", "setVerticalCam", verticalCam);
    set((state) => ({ layout: { ...state.layout, verticalCam } }));
  },

  setVerticalCamZone: (verticalCamZone) => {
    clipDebug.log("layout", "setVerticalCamZone", verticalCamZone);
    set((state) => ({ layout: { ...state.layout, verticalCamZone } }));
  },

  setVerticalCropPan: (verticalCropPan) => {
    clipDebug.log("layout", "setVerticalCropPan", { verticalCropPan });
    set((state) => ({ layout: { ...state.layout, verticalCropPan } }));
  },

  setCurrentTime: (time) => {
    const { sourceDuration, currentTime } = get();
    const clamped = Math.max(0, Math.min(time, sourceDuration || 0));
    if (Math.abs(clamped - currentTime) < 0.001) return;
    set({ currentTime: clamped });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setPreviewVolume: (volume) =>
    set({ previewVolume: Math.max(0, Math.min(1, volume)) }),

  setPreviewContainerWidth: (previewContainerWidth) => {
    if (previewContainerWidth <= 0) return;
    set({ previewContainerWidth });
  },

  setIsApplyingCut: (isApplyingCut) => set({ isApplyingCut }),

  setIsExporting: (isExporting) => set({ isExporting }),

  setExportResult: (exportResult) =>
    set({
      exportResult,
      exportUrl: exportResult?.exportUrl ?? null,
      exportProgress: exportResult ? 100 : 0,
      exportPhase: exportResult ? "Terminé" : "",
    }),

  setExportProgress: (exportProgress, exportPhase) =>
    set({ exportProgress, exportPhase }),

  setIsTranscribing: (isTranscribing) => set({ isTranscribing }),

  setSubtitleWords: (subtitleWords) =>
    set({ subtitleWords: sortSubtitleWords(subtitleWords) }),

  setSelectedSubtitleWordId: (selectedSubtitleWordId) =>
    set({ selectedSubtitleWordId }),

  updateSubtitleWord: (id, patch) =>
    set((state) => ({
      subtitleWords: sortSubtitleWords(
        state.subtitleWords.map((word) => {
          if (word.id !== id) return word;

          if (patch.text !== undefined && patch.start === undefined && patch.end === undefined) {
            return { ...word, text: patch.text };
          }

          const updated = updateSubtitleWordBounds(
            word,
            patch,
            state.keepSegments,
          );
          if (!updated) return word;

          return patch.text !== undefined
            ? { ...updated, text: patch.text }
            : updated;
        }),
      ),
    })),

  addSubtitleWordAtSourceTime: (sourceTime) => {
    const { keepSegments, subtitleWords } = get();
    const created = createSubtitleWordAtSourceTime(
      sourceTime,
      keepSegments,
    );
    if (!created) return null;

    set({
      subtitleWords: sortSubtitleWords([...subtitleWords, created]),
      selectedSubtitleWordId: created.id,
      currentTime: created.start,
      isPlaying: false,
    });
    return created;
  },

  deleteSelectedSubtitleWord: () => {
    const { selectedSubtitleWordId, subtitleWords } = get();
    if (!selectedSubtitleWordId) return;

    set({
      subtitleWords: subtitleWords.filter(
        (word) => word.id !== selectedSubtitleWordId,
      ),
      selectedSubtitleWordId: null,
    });
  },

  setSubtitleStyle: (subtitleStyle) =>
    set({
      subtitleStyle: { ...DEFAULT_SUBTITLE_STYLE, ...subtitleStyle },
    }),

  setSubtitleTiming: (subtitleTiming) => set({ subtitleTiming }),

  setSubtitleLayout: (subtitleLayout) =>
    set({ subtitleLayout: normalizeSubtitleLayout(subtitleLayout) }),

  setSubtitleLanguage: (subtitleLanguage) => set({ subtitleLanguage }),

  toggleZoomTool: () => {
    const state = get();
    const nextActive = !state.isZoomToolActive;

    if (!nextActive) {
      set({ isZoomToolActive: false, selectedZoomEffectId: null });
      return;
    }

    const existing = findZoomEffectAtTime(state.zoomEffects, state.currentTime);
    if (existing) {
      set({
        isZoomToolActive: true,
        selectedZoomEffectId: existing.id,
        selectedSegmentId: null,
        selectedImageOverlayId: null,
        isImageToolActive: false,
        selectedTextOverlayId: null,
        isTextToolActive: false,
      });
      return;
    }

    const created = createZoomEffectAtTime(
      state.currentTime,
      state.keepSegments,
      state.sourceWidth,
      state.sourceHeight,
    );
    if (!created) return;

    set((current) => ({
      isZoomToolActive: true,
      selectedZoomEffectId: created.id,
      selectedSegmentId: null,
      selectedImageOverlayId: null,
      isImageToolActive: false,
      selectedTextOverlayId: null,
      isTextToolActive: false,
      zoomEffects: [...current.zoomEffects, created].sort(
        (a, b) => a.start - b.start,
      ),
      timelineUndoStack: [
        ...current.timelineUndoStack,
        createTimelineSnapshot(current),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));
  },

  setSelectedZoomEffectId: (selectedZoomEffectId) =>
    set({
      selectedZoomEffectId,
      isZoomToolActive: selectedZoomEffectId !== null,
      ...(selectedZoomEffectId !== null
        ? {
            selectedSegmentId: null,
            selectedImageOverlayId: null,
            isImageToolActive: false,
            selectedTextOverlayId: null,
            isTextToolActive: false,
          }
        : {}),
    }),

  updateZoomEffect: (id, patch) => {
    set((state) => ({
      zoomEffects: state.zoomEffects
        .map((effect) => (effect.id === id ? { ...effect, ...patch } : effect))
        .sort((a, b) => a.start - b.start),
    }));
  },

  updateZoomEffectZone: (id, zone) => {
    const { sourceWidth, sourceHeight } = get();
    get().updateZoomEffect(id, {
      zone: clampZoomZone(zone, sourceWidth, sourceHeight),
    });
  },

  deleteSelectedZoomEffect: () => {
    const { selectedZoomEffectId, zoomEffects } = get();
    if (!selectedZoomEffectId) return;

    set((state) => ({
      zoomEffects: zoomEffects.filter(
        (effect) => effect.id !== selectedZoomEffectId,
      ),
      selectedZoomEffectId: null,
      isZoomToolActive: false,
      timelineUndoStack: [
        ...state.timelineUndoStack,
        createTimelineSnapshot(state),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));
  },

  addImageOverlay: (src, label) => {
    const state = get();
    const created = createImageOverlayAtTime(
      state.currentTime,
      state.keepSegments,
      src,
      label,
    );
    if (!created) return null;

    set((current) => ({
      isImageToolActive: true,
      selectedImageOverlayId: created.id,
      selectedSegmentId: null,
      selectedZoomEffectId: null,
      isZoomToolActive: false,
      selectedTextOverlayId: null,
      isTextToolActive: false,
      imageOverlays: [...current.imageOverlays, created].sort(
        (a, b) => a.start - b.start,
      ),
      timelineUndoStack: [
        ...current.timelineUndoStack,
        createTimelineSnapshot(current),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));

    return created;
  },

  setSelectedImageOverlayId: (selectedImageOverlayId) =>
    set({
      selectedImageOverlayId,
      isImageToolActive: selectedImageOverlayId !== null,
      ...(selectedImageOverlayId !== null
        ? {
            selectedSegmentId: null,
            selectedZoomEffectId: null,
            isZoomToolActive: false,
            selectedTextOverlayId: null,
            isTextToolActive: false,
          }
        : {}),
    }),

  updateImageOverlay: (id, patch) => {
    set((state) => ({
      imageOverlays: state.imageOverlays
        .map((overlay) =>
          overlay.id === id ? { ...overlay, ...patch } : overlay,
        )
        .sort((a, b) => a.start - b.start),
    }));
  },

  updateImageOverlayZone: (id, zone) => {
    get().updateImageOverlay(id, {
      zone: clampImageOverlayZone(zone),
    });
  },

  deleteSelectedImageOverlay: () => {
    const { selectedImageOverlayId, imageOverlays } = get();
    if (!selectedImageOverlayId) return;

    set((state) => ({
      imageOverlays: imageOverlays.filter(
        (overlay) => overlay.id !== selectedImageOverlayId,
      ),
      selectedImageOverlayId: null,
      isImageToolActive: false,
      timelineUndoStack: [
        ...state.timelineUndoStack,
        createTimelineSnapshot(state),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));
  },

  addTextOverlay: (text) => {
    const state = get();
    const created = createTextOverlayAtTime(
      state.currentTime,
      state.keepSegments,
      text,
    );
    if (!created) return null;

    set((current) => ({
      isTextToolActive: true,
      selectedTextOverlayId: created.id,
      selectedSegmentId: null,
      selectedZoomEffectId: null,
      isZoomToolActive: false,
      selectedImageOverlayId: null,
      isImageToolActive: false,
      textOverlays: [...current.textOverlays, created].sort(
        (a, b) => a.start - b.start,
      ),
      timelineUndoStack: [
        ...current.timelineUndoStack,
        createTimelineSnapshot(current),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));

    return created;
  },

  setSelectedTextOverlayId: (selectedTextOverlayId) =>
    set({
      selectedTextOverlayId,
      isTextToolActive: selectedTextOverlayId !== null,
      ...(selectedTextOverlayId !== null
        ? {
            selectedSegmentId: null,
            selectedZoomEffectId: null,
            isZoomToolActive: false,
            selectedImageOverlayId: null,
            isImageToolActive: false,
          }
        : {}),
    }),

  updateTextOverlay: (id, patch) => {
    set((state) => ({
      textOverlays: state.textOverlays
        .map((overlay) => {
          if (overlay.id !== id) return overlay;
          const next = { ...overlay, ...patch };
          if (patch.text !== undefined) {
            next.label = createTextOverlayLabel(patch.text);
          }
          return next;
        })
        .sort((a, b) => a.start - b.start),
    }));
  },

  updateTextOverlayLayout: (id, layout) => {
    get().updateTextOverlay(id, {
      layout: normalizeSubtitleLayout(layout),
    });
  },

  updateTextOverlayStyle: (id, patch) => {
    const overlay = get().textOverlays.find((item) => item.id === id);
    if (!overlay) return;
    const nextStyle = { ...overlay.style, ...patch };
    if (patch.letterSpacing !== undefined) {
      nextStyle.letterSpacing = clampTextOverlayLetterSpacing(
        patch.letterSpacing,
      );
    }
    get().updateTextOverlay(id, { style: nextStyle });
  },

  deleteSelectedTextOverlay: () => {
    const { selectedTextOverlayId, textOverlays } = get();
    if (!selectedTextOverlayId) return;

    set((state) => ({
      textOverlays: textOverlays.filter(
        (overlay) => overlay.id !== selectedTextOverlayId,
      ),
      selectedTextOverlayId: null,
      isTextToolActive: false,
      timelineUndoStack: [
        ...state.timelineUndoStack,
        createTimelineSnapshot(state),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));
  },

  applyTranscriptionResult: (rawWords, language) => {
    set({
      subtitleWords: normalizeTranscribedWords(rawWords),
      subtitleLanguage: language,
    });
  },

  setSourceDuration: (duration) => {
    const { keepSegments, sourceDuration } = get();
    if (!Number.isFinite(duration) || duration <= 0) {
      clipDebug.warn("store", "setSourceDuration ignoré (durée invalide)", {
        duration,
      });
      return;
    }
    if (sourceDuration > 0) return;
    if (Math.abs(duration - sourceDuration) < 0.01) return;

    set({
      sourceDuration: duration,
      keepSegments:
        keepSegments.length === 0
          ? [{ start: 0, end: duration }]
          : keepSegments,
    });
  },

  setSelectedSegmentId: (selectedSegmentId) =>
    set({
      selectedSegmentId,
      ...(selectedSegmentId
        ? {
            selectedZoomEffectId: null,
            isZoomToolActive: false,
            selectedImageOverlayId: null,
            isImageToolActive: false,
            selectedTextOverlayId: null,
            isTextToolActive: false,
          }
        : {}),
    }),

  recordTimelineSnapshot: () => {
    set((state) => ({
      timelineUndoStack: [
        ...state.timelineUndoStack,
        createTimelineSnapshot(state),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));
  },

  addCutAtCurrentTime: () => {
    const { currentTime, keepSegments } = get();
    if (!canAddCutInKeepSegments(currentTime, keepSegments)) return false;

    const nextSegments = splitKeepSegmentAt(keepSegments, currentTime);
    if (!nextSegments) return false;

    set((state) => ({
      keepSegments: nextSegments,
      selectedSegmentId: null,
      lastFfmpegCutPayload: null,
      timelineUndoStack: [
        ...state.timelineUndoStack,
        createTimelineSnapshot(state),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));
    return true;
  },

  undoTimeline: () => {
    set((state) => {
      if (state.timelineUndoStack.length === 0) return state;

      const previous = cloneTimelineSnapshot(
        state.timelineUndoStack[state.timelineUndoStack.length - 1],
      );
      const nextUndo = state.timelineUndoStack.slice(0, -1);

      return {
        keepSegments: cloneKeepSegments(previous.keepSegments),
        sourceDuration: previous.sourceDuration,
        previewUrl: previous.previewUrl,
        currentTime: snapTimeToKeepSegments(
          previous.currentTime,
          previous.keepSegments,
        ),
        selectedSegmentId: null,
        isPlaying: false,
        lastFfmpegCutPayload: previous.ffmpegKeepSegments
          ? cloneKeepSegments(previous.ffmpegKeepSegments)
          : null,
        zoomEffects: cloneZoomEffects(previous.zoomEffects),
        imageOverlays: cloneImageOverlays(previous.imageOverlays),
        textOverlays: cloneTextOverlays(previous.textOverlays),
        selectedZoomEffectId: null,
        isZoomToolActive: false,
        selectedImageOverlayId: null,
        isImageToolActive: false,
        selectedTextOverlayId: null,
        isTextToolActive: false,
        timelineUndoStack: nextUndo,
        timelineRedoStack: [
          ...state.timelineRedoStack,
          createTimelineSnapshot(state),
        ].slice(-MAX_TIMELINE_HISTORY),
      };
    });
  },

  redoTimeline: (): {
    keepSegments: TimeRange[];
    restoreRedoSnapshot: TimelineSnapshot;
  } | null => {
    const state = get();
    if (state.timelineRedoStack.length === 0) return null;

    const next = cloneTimelineSnapshot(
      state.timelineRedoStack[state.timelineRedoStack.length - 1],
    );
    const nextRedo = state.timelineRedoStack.slice(0, -1);

    if (next.ffmpegKeepSegments && next.ffmpegKeepSegments.length > 0) {
      set({ timelineRedoStack: nextRedo });
      return {
        keepSegments: cloneKeepSegments(next.ffmpegKeepSegments),
        restoreRedoSnapshot: next,
      };
    }

    set({
      timelineRedoStack: nextRedo,
      timelineUndoStack: [
        ...state.timelineUndoStack,
        createTimelineSnapshot(state),
      ].slice(-MAX_TIMELINE_HISTORY),
      keepSegments: cloneKeepSegments(next.keepSegments),
      sourceDuration: next.sourceDuration,
      previewUrl: next.previewUrl,
      currentTime: snapTimeToKeepSegments(next.currentTime, next.keepSegments),
      selectedSegmentId: null,
      isPlaying: false,
      lastFfmpegCutPayload: next.ffmpegKeepSegments
        ? cloneKeepSegments(next.ffmpegKeepSegments)
        : null,
      zoomEffects: cloneZoomEffects(next.zoomEffects),
      imageOverlays: cloneImageOverlays(next.imageOverlays),
      textOverlays: cloneTextOverlays(next.textOverlays),
      selectedZoomEffectId: null,
      isZoomToolActive: false,
      selectedImageOverlayId: null,
      isImageToolActive: false,
      selectedTextOverlayId: null,
      isTextToolActive: false,
    });

    return null;
  },

  applyRenderResult: (result, ffmpegKeepSegments) => {
    const { currentTime, keepSegments } = get();
    const nextKeepSegments = ffmpegKeepSegments
      ? cloneKeepSegments(ffmpegKeepSegments)
      : cloneKeepSegments(keepSegments);

    set({
      previewUrl: result.previewUrl,
      keepSegments: nextKeepSegments,
      selectedSegmentId: null,
      currentTime: snapTimeToKeepSegments(currentTime, nextKeepSegments),
      isPlaying: false,
      lastFfmpegCutPayload: ffmpegKeepSegments
        ? cloneKeepSegments(ffmpegKeepSegments)
        : null,
    });
  },
}));
