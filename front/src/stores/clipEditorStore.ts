import { create } from "zustand";
import type { ClipImportResult, ClipExportResult } from "../../types";
import {
  canAddCutInKeepSegments,
  cloneKeepSegments,
  cloneTimelineSnapshot,
  MAX_TIMELINE_HISTORY,
  sequenceTimeToSourceTime,
  snapTimeToKeepSegments,
  sourceTimeToSequenceTime,
  splitKeepSegmentAt,
  updateKeepSegmentSpeed,
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
  createZoomEffectAtSequenceTime,
  getActiveZoomEffectForPlayhead,
  type ZoomEffect,
  type ZoomEffectZone,
} from "../lib/clipZoomEffects";
import {
  clampImageOverlayZone,
  cloneImageOverlays,
  createImageOverlayAtTime,
  createImageOverlayAtSequenceTime,
  type CreateImageOverlayOptions,
  type ImageOverlay,
  type ImageOverlayZone,
} from "../lib/clipImageOverlays";
import {
  cloneTextOverlays,
  createTextOverlayAtTime,
  createTextOverlayAtSequenceTime,
  createTextOverlayLabel,
  clampTextOverlayLetterSpacing,
  type TextOverlay,
  type TextOverlayStyle,
} from "../lib/clipTextOverlays";
import {
  clampSoundboardVolume,
  cloneSoundboards,
  createSoundboardAtTime,
  createSoundboardAtSequenceTime,
  type SoundboardClip,
} from "../lib/clipSoundboards";
import { resolveEffectPlacementContext } from "../lib/clipEffectPlacement";
import {
  cloneTimelineVideos,
  createTimelineVideoFromImport,
  getActiveTimelineVideoAtSequence,
  getTimelineVideoSequenceDuration,
  getTotalTimelineDuration,
  resolveTimelineVideoPlacementStart,
  splitTimelineVideoAt,
  canAddCutInTimelineVideo,
  updateTimelineVideoSpeed,
  type TimelineVideoClip,
  type TimelineVideoLayoutMode,
} from "../lib/clipTimelineVideos";
import {
  actualSequenceToNatural,
  buildPackedSegmentsWithInserts,
  getActualBaseEndSequence,
  getTimelineInserts,
  MEME_MAX_DURATION_SEC,
  sequenceTimeToSourceTimeWithInserts,
  shiftSequenceTimedRange,
  sourceTimeToActualSequenceTime,
  type TimelineVideoImportKind,
} from "../lib/clipTimelineInserts";
import { insertMemeAtSequence, removeMemeInsert } from "../lib/clipMemeInsert";
import {
  findImageOverlayIdAtPlayhead,
  findSoundboardIdAtPlayhead,
  findTextOverlayIdAtPlayhead,
  findZoomEffectIdAtPlayhead,
  splitImageOverlayAtPlayhead,
  splitSoundboardAtPlayhead,
  splitTextOverlayAtPlayhead,
  splitZoomEffectAtPlayhead,
} from "../lib/clipOverlaySplit";
import {
  createSubtitleWordAtSourceTime,
  createSubtitleWordAtSequenceTime,
  DEFAULT_SUBTITLE_LAYOUT,
  DEFAULT_SUBTITLE_STYLE,
  DEFAULT_SUBTITLE_TIMING,
  getSubtitleTimelineDuration,
  normalizeSubtitleLayout,
  normalizeTranscribedWords,
  filterSubtitleWordsOutsideMemeRanges,
  isWordInsideKeepSegments,
  sortSubtitleWords,
  SUBTITLE_PREVIEW_REF_WIDTH,
  updateSubtitleWordBounds,
  type SubtitleLayout,
  type SubtitleStyle,
  type SubtitleTiming,
  type SubtitleWord,
} from "../lib/clipSubtitles";
import type { ClipTemplatePayloadV1 } from "../lib/clipTemplate";
import type { SavedClipEditorStateV1 } from "../lib/savedClip";
import { followStickerToDataUrl } from "../lib/followSticker";

export type ClipEditorStep = "layout" | "montage" | "subtitles" | "export";

export type ClipSaveStatus = "idle" | "saving" | "saved" | "error";

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
  soundboards: SoundboardClip[];
  selectedSoundboardId: string | null;
  isSoundboardToolActive: boolean;
  timelineVideos: TimelineVideoClip[];
  selectedTimelineVideoId: string | null;
  sequencePlayhead: number;
  isSpeedToolActive: boolean;
  /** Volume preview local 0–1 (n'affecte pas l'export). */
  previewVolume: number;
  /** Zoom horizontal de la timeline (1 = 100 %). */
  timelineZoom: number;
  /** Largeur px du conteneur preview 9:16 (pour caler l'export). */
  previewContainerWidth: number;
  savedClipId: string | null;
  savedClipName: string;
  saveStatus: ClipSaveStatus;

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
  setTimelineZoom: (zoom: number) => void;
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
  addSubtitleWordAtSequenceTime: (sequenceTime: number) => SubtitleWord | null;
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
  addImageOverlay: (
    src: string,
    label: string,
    options?: CreateImageOverlayOptions,
  ) => ImageOverlay | null;
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
  toggleSoundboardTool: () => void;
  addSoundboardClip: (
    src: string,
    label: string,
    durationSec?: number,
    volume?: number,
  ) => SoundboardClip | null;
  setSelectedSoundboardId: (id: string | null) => void;
  updateSoundboard: (id: string, patch: Partial<SoundboardClip>) => void;
  deleteSelectedSoundboard: () => void;
  addTimelineVideo: (
    importResult: ClipImportResult,
    layoutMode: TimelineVideoLayoutMode,
    sequenceStart: number,
    importKind?: TimelineVideoImportKind,
  ) => TimelineVideoClip | null;
  setSelectedTimelineVideoId: (id: string | null) => void;
  updateTimelineVideo: (id: string, patch: Partial<TimelineVideoClip>) => void;
  moveMemeTimelineVideo: (clipId: string, targetSequenceStart: number) => boolean;
  deleteSelectedTimelineVideo: () => void;
  setSequencePlayhead: (time: number) => void;
  reconcileSequencePlayback: () => void;
  toggleSpeedTool: () => void;
  openSpeedTool: () => void;
  closeSpeedTool: () => void;
  applySegmentSpeed: (speed: number) => boolean;
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
  applyClipTemplate: (payload: ClipTemplatePayloadV1) => void;
  setSavedClipMeta: (id: string, name: string) => void;
  setSaveStatus: (status: ClipSaveStatus) => void;
  hydrateFromSaved: (state: SavedClipEditorStateV1) => void;
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
    soundboards: cloneSoundboards(state.soundboards),
    timelineVideos: cloneTimelineVideos(state.timelineVideos),
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
  soundboards: [] as SoundboardClip[],
  selectedSoundboardId: null as string | null,
  isSoundboardToolActive: false,
  timelineVideos: [] as TimelineVideoClip[],
  selectedTimelineVideoId: null as string | null,
  sequencePlayhead: 0,
  isSpeedToolActive: false,
  previewVolume: 0.5,
  timelineZoom: 1,
  previewContainerWidth: SUBTITLE_PREVIEW_REF_WIDTH,
  savedClipId: null as string | null,
  savedClipName: "",
  saveStatus: "idle" as ClipSaveStatus,
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
      keepSegments: [{ start: 0, end: clip.duration, speed: 0 }],
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
    const state = get();
    const clamped = Math.max(0, Math.min(time, state.sourceDuration || 0));
    const nextSequencePlayhead = sourceTimeToActualSequenceTime(
      clamped,
      state.keepSegments,
      state.timelineVideos,
    );

    if (
      Math.abs(clamped - state.currentTime) < 0.001 &&
      Math.abs(nextSequencePlayhead - state.sequencePlayhead) < 0.001
    ) {
      return;
    }

    set({ currentTime: clamped, sequencePlayhead: nextSequencePlayhead });
  },

  setSequencePlayhead: (time) => {
    const state = get();
    const totalDuration = getTotalTimelineDuration(
      state.keepSegments,
      state.timelineVideos,
    );
    const clamped = Math.max(0, Math.min(time, totalDuration));
    const activeClip = getActiveTimelineVideoAtSequence(
      clamped,
      state.timelineVideos,
    );

    if (activeClip) {
      if (Math.abs(clamped - state.sequencePlayhead) < 0.001) return;
      set({ sequencePlayhead: clamped });
      return;
    }

    const sourceTime = sequenceTimeToSourceTimeWithInserts(
      clamped,
      state.keepSegments,
      state.timelineVideos,
    );

    if (sourceTime !== null) {
      set({
        sequencePlayhead: clamped,
        currentTime: snapTimeToKeepSegments(sourceTime, state.keepSegments),
      });
      return;
    }

    if (Math.abs(clamped - state.sequencePlayhead) < 0.001) return;
    set({ sequencePlayhead: clamped });
  },

  reconcileSequencePlayback: () => {
    const state = get();
    if (state.timelineVideos.length === 0) return;

    const activeClip = getActiveTimelineVideoAtSequence(
      state.sequencePlayhead,
      state.timelineVideos,
    );

    if (activeClip) return;

    const actualBaseEnd = getActualBaseEndSequence(
      state.keepSegments,
      state.timelineVideos,
    );
    if (state.sequencePlayhead > actualBaseEnd + 0.001) return;

    const sourceTime = sequenceTimeToSourceTimeWithInserts(
      state.sequencePlayhead,
      state.keepSegments,
      state.timelineVideos,
    );
    if (sourceTime === null) return;

    const snapped = snapTimeToKeepSegments(sourceTime, state.keepSegments);
    const nextSequence = sourceTimeToActualSequenceTime(
      snapped,
      state.keepSegments,
      state.timelineVideos,
    );

    if (
      Math.abs(snapped - state.currentTime) < 0.01 &&
      Math.abs(nextSequence - state.sequencePlayhead) < 0.01
    ) {
      return;
    }

    set({ currentTime: snapped, sequencePlayhead: nextSequence });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setPreviewVolume: (volume) =>
    set({ previewVolume: Math.max(0, Math.min(1, volume)) }),

  setTimelineZoom: (zoom) =>
    set({ timelineZoom: Math.max(1, Math.min(8, zoom)) }),

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

  addSubtitleWordAtSequenceTime: (sequenceTime) => {
    const {
      keepSegments,
      timelineVideos,
      subtitleWords,
      subtitleTiming,
    } = get();
    const totalDuration = getSubtitleTimelineDuration(
      keepSegments,
      timelineVideos,
    );
    const created = createSubtitleWordAtSequenceTime(
      sequenceTime,
      totalDuration,
      subtitleTiming,
    );
    if (!created) return null;

    set({
      subtitleWords: sortSubtitleWords([...subtitleWords, created]),
      selectedSubtitleWordId: created.id,
      sequencePlayhead: sequenceTime,
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

    const placement = resolveEffectPlacementContext({
      sequencePlayhead: state.sequencePlayhead,
      currentTime: state.currentTime,
      keepSegments: state.keepSegments,
      timelineVideos: state.timelineVideos,
    });

    const existing = getActiveZoomEffectForPlayhead(
      state.zoomEffects,
      placement.sequenceTime,
      placement.mode === "source" ? placement.sourceTime : state.currentTime,
    );
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

    const created =
      placement.mode === "sequence"
        ? createZoomEffectAtSequenceTime(
            placement.sequenceTime,
            placement.timelineDuration,
            state.sourceWidth,
            state.sourceHeight,
          )
        : createZoomEffectAtTime(
            placement.sourceTime,
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
            selectedSoundboardId: null,
            isSoundboardToolActive: false,
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

  addImageOverlay: (src, label, options) => {
    const state = get();
    const timelineDuration = getTotalTimelineDuration(
      state.keepSegments,
      state.timelineVideos,
    );
    const sequenceTime =
      state.timelineVideos.length > 0
        ? state.sequencePlayhead
        : sourceTimeToSequenceTime(state.currentTime, state.keepSegments);

    const created = options?.sticker
      ? createImageOverlayAtSequenceTime(
          sequenceTime,
          timelineDuration,
          src,
          label,
          options,
        )
      : (() => {
          const placement = resolveEffectPlacementContext({
            sequencePlayhead: state.sequencePlayhead,
            currentTime: state.currentTime,
            keepSegments: state.keepSegments,
            timelineVideos: state.timelineVideos,
          });

          return placement.mode === "sequence"
            ? createImageOverlayAtSequenceTime(
                placement.sequenceTime,
                placement.timelineDuration,
                src,
                label,
                options,
              )
            : createImageOverlayAtTime(
                placement.sourceTime,
                state.keepSegments,
                src,
                label,
                options,
              );
        })();
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
            selectedSoundboardId: null,
            isSoundboardToolActive: false,
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
    const placement = resolveEffectPlacementContext({
      sequencePlayhead: state.sequencePlayhead,
      currentTime: state.currentTime,
      keepSegments: state.keepSegments,
      timelineVideos: state.timelineVideos,
    });

    const created =
      placement.mode === "sequence"
        ? createTextOverlayAtSequenceTime(
            placement.sequenceTime,
            placement.timelineDuration,
            text,
          )
        : createTextOverlayAtTime(
            placement.sourceTime,
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
      selectedSoundboardId: null,
      isSoundboardToolActive: false,
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
            selectedSoundboardId: null,
            isSoundboardToolActive: false,
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

  toggleSoundboardTool: () => {
    set((state) => {
      const nextActive = !state.isSoundboardToolActive;
      return {
        isSoundboardToolActive: nextActive,
        ...(nextActive
          ? {
              selectedSegmentId: null,
              selectedZoomEffectId: null,
              isZoomToolActive: false,
              selectedImageOverlayId: null,
              isImageToolActive: false,
              selectedTextOverlayId: null,
              isTextToolActive: false,
              isSpeedToolActive: false,
            }
          : { selectedSoundboardId: null }),
      };
    });
  },

  addSoundboardClip: (src, label, durationSec, volume) => {
    const state = get();
    const placement = resolveEffectPlacementContext({
      sequencePlayhead: state.sequencePlayhead,
      currentTime: state.currentTime,
      keepSegments: state.keepSegments,
      timelineVideos: state.timelineVideos,
    });

    const created =
      placement.mode === "sequence"
        ? createSoundboardAtSequenceTime(
            placement.sequenceTime,
            placement.timelineDuration,
            src,
            label,
            durationSec,
            volume,
          )
        : createSoundboardAtTime(
            placement.sourceTime,
            state.keepSegments,
            src,
            label,
            durationSec,
            volume,
          );
    if (!created) return null;

    set((current) => ({
      isSoundboardToolActive: true,
      selectedSoundboardId: created.id,
      selectedSegmentId: null,
      selectedZoomEffectId: null,
      isZoomToolActive: false,
      selectedImageOverlayId: null,
      isImageToolActive: false,
      selectedTextOverlayId: null,
      isTextToolActive: false,
      soundboards: [...current.soundboards, created].sort(
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

  setSelectedSoundboardId: (selectedSoundboardId) =>
    set({
      selectedSoundboardId,
      isSoundboardToolActive: selectedSoundboardId !== null,
      ...(selectedSoundboardId !== null
        ? {
            selectedSegmentId: null,
            selectedZoomEffectId: null,
            isZoomToolActive: false,
            selectedImageOverlayId: null,
            isImageToolActive: false,
            selectedTextOverlayId: null,
            isTextToolActive: false,
          }
        : {}),
    }),

  updateSoundboard: (id, patch) => {
    set((state) => ({
      soundboards: state.soundboards
        .map((clip) => {
          if (clip.id !== id) return clip;
          const next = { ...clip, ...patch };
          if (patch.label !== undefined) {
            next.label = patch.label.trim() || "Son";
          }
          if (patch.volume !== undefined) {
            next.volume = clampSoundboardVolume(patch.volume);
          }
          return next;
        })
        .sort((a, b) => a.start - b.start),
    }));
  },

  deleteSelectedSoundboard: () => {
    const { selectedSoundboardId, soundboards } = get();
    if (!selectedSoundboardId) return;

    set((state) => ({
      soundboards: soundboards.filter(
        (clip) => clip.id !== selectedSoundboardId,
      ),
      selectedSoundboardId: null,
      isSoundboardToolActive: false,
      timelineUndoStack: [
        ...state.timelineUndoStack,
        createTimelineSnapshot(state),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));
  },

  addTimelineVideo: (importResult, layoutMode, sequenceStart, importKind = "clip") => {
    const state = get();

    if (importKind === "meme") {
      if (importResult.duration > MEME_MAX_DURATION_SEC + 0.01) {
        return null;
      }

      const activeAtPlayhead = getActiveTimelineVideoAtSequence(
        sequenceStart,
        state.timelineVideos,
      );
      if (activeAtPlayhead) return null;

      const inserts = getTimelineInserts(state.timelineVideos);
      const naturalAtPlayhead = actualSequenceToNatural(sequenceStart, inserts);
      if (naturalAtPlayhead === null) return null;

      const sourceCutTime = sequenceTimeToSourceTime(
        naturalAtPlayhead,
        state.keepSegments,
      );
      if (!canAddCutInKeepSegments(sourceCutTime, state.keepSegments)) {
        return null;
      }

      const nextKeepSegments = splitKeepSegmentAt(
        state.keepSegments,
        sourceCutTime,
      );
      if (!nextKeepSegments) return null;

      const draft = createTimelineVideoFromImport(
        importResult,
        sequenceStart,
        layoutMode,
        "meme",
      );
      const memeDuration = getTimelineVideoSequenceDuration(draft);
      const created = {
        ...draft,
        sequenceStart,
        naturalInsertStart: naturalAtPlayhead,
      };

      const shiftItems = <T extends { start: number; end: number; usesSequenceTime?: boolean }>(
        items: T[],
      ): T[] =>
        items.map((item) =>
          item.usesSequenceTime
            ? shiftSequenceTimedRange(item, sequenceStart, memeDuration)
            : item,
        );

      set((current) => ({
        keepSegments: nextKeepSegments,
        selectedTimelineVideoId: created.id,
        selectedSegmentId: null,
        selectedZoomEffectId: null,
        isZoomToolActive: false,
        selectedImageOverlayId: null,
        isImageToolActive: false,
        selectedTextOverlayId: null,
        isTextToolActive: false,
        selectedSoundboardId: null,
        isSoundboardToolActive: false,
        isSpeedToolActive: false,
        timelineVideos: [
          ...current.timelineVideos.map((clip) =>
            clip.sequenceStart > sequenceStart + 0.001
              ? { ...clip, sequenceStart: clip.sequenceStart + memeDuration }
              : clip,
          ),
          created,
        ].sort((a, b) => a.sequenceStart - b.sequenceStart),
        zoomEffects: shiftItems(current.zoomEffects),
        imageOverlays: shiftItems(current.imageOverlays),
        textOverlays: shiftItems(current.textOverlays),
        soundboards: shiftItems(current.soundboards),
        timelineUndoStack: [
          ...current.timelineUndoStack,
          createTimelineSnapshot(current),
        ].slice(-MAX_TIMELINE_HISTORY),
        timelineRedoStack: [],
      }));

      get().reconcileSequencePlayback();
      return created;
    }

    const actualBaseEnd = getActualBaseEndSequence(
      state.keepSegments,
      state.timelineVideos,
    );
    const draft = createTimelineVideoFromImport(
      importResult,
      sequenceStart,
      layoutMode,
      "clip",
    );
    const resolvedStart = resolveTimelineVideoPlacementStart(
      draft,
      sequenceStart,
      actualBaseEnd,
      state.timelineVideos,
    );
    const created = { ...draft, sequenceStart: resolvedStart };

    set((current) => ({
      selectedTimelineVideoId: created.id,
      selectedSegmentId: null,
      selectedZoomEffectId: null,
      isZoomToolActive: false,
      selectedImageOverlayId: null,
      isImageToolActive: false,
      selectedTextOverlayId: null,
      isTextToolActive: false,
      selectedSoundboardId: null,
      isSoundboardToolActive: false,
      isSpeedToolActive: false,
      timelineVideos: [...current.timelineVideos, created].sort(
        (a, b) => a.sequenceStart - b.sequenceStart,
      ),
      timelineUndoStack: [
        ...current.timelineUndoStack,
        createTimelineSnapshot(current),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));

    get().reconcileSequencePlayback();
    return created;
  },

  setSelectedTimelineVideoId: (selectedTimelineVideoId) =>
    set({
      selectedTimelineVideoId,
      ...(selectedTimelineVideoId
        ? {
            selectedSegmentId: null,
            selectedZoomEffectId: null,
            isZoomToolActive: false,
            selectedImageOverlayId: null,
            isImageToolActive: false,
            selectedTextOverlayId: null,
            isTextToolActive: false,
            selectedSoundboardId: null,
            isSoundboardToolActive: false,
          }
        : {
            isSpeedToolActive: false,
          }),
    }),

  updateTimelineVideo: (id, patch) => {
    set((state) => ({
      timelineVideos: state.timelineVideos
        .map((clip) => (clip.id === id ? { ...clip, ...patch } : clip))
        .sort((a, b) => a.sequenceStart - b.sequenceStart),
    }));
  },

  moveMemeTimelineVideo: (clipId, targetSequenceStart) => {
    const state = get();
    const clip = state.timelineVideos.find((item) => item.id === clipId);
    if (!clip || clip.importKind !== "meme") return false;

    if (Math.abs(targetSequenceStart - clip.sequenceStart) < 0.05) {
      return true;
    }

    const removed = removeMemeInsert(state, clipId);
    if (!removed) return false;

    let collapsedTarget = targetSequenceStart;
    if (targetSequenceStart > removed.oldSequenceStart + 0.001) {
      collapsedTarget = targetSequenceStart - removed.memeDuration;
    }

    const inserted = insertMemeAtSequence(
      {
        keepSegments: removed.keepSegments,
        timelineVideos: removed.timelineVideos,
        zoomEffects: removed.zoomEffects,
        imageOverlays: removed.imageOverlays,
        textOverlays: removed.textOverlays,
        soundboards: removed.soundboards,
      },
      removed.removedMeme,
      collapsedTarget,
    );
    if (!inserted) return false;

    set({
      ...inserted,
      selectedTimelineVideoId: clipId,
    });

    get().reconcileSequencePlayback();
    return true;
  },

  deleteSelectedTimelineVideo: () => {
    const { selectedTimelineVideoId, timelineVideos } = get();
    if (!selectedTimelineVideoId) return;

    set((state) => ({
      timelineVideos: timelineVideos.filter(
        (clip) => clip.id !== selectedTimelineVideoId,
      ),
      selectedTimelineVideoId: null,
      timelineUndoStack: [
        ...state.timelineUndoStack,
        createTimelineSnapshot(state),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));

    get().reconcileSequencePlayback();
  },

  toggleSpeedTool: () => {
    const state = get();
    if (state.isSpeedToolActive) {
      set({ isSpeedToolActive: false });
      return;
    }
    get().openSpeedTool();
  },

  openSpeedTool: () => {
    const state = get();
    if (!state.selectedSegmentId && !state.selectedTimelineVideoId) return;

    set({
      isSpeedToolActive: true,
      selectedZoomEffectId: null,
      isZoomToolActive: false,
      selectedImageOverlayId: null,
      isImageToolActive: false,
      selectedTextOverlayId: null,
      isTextToolActive: false,
      selectedSoundboardId: null,
      isSoundboardToolActive: false,
    });
  },

  closeSpeedTool: () => set({ isSpeedToolActive: false }),

  applySegmentSpeed: (speed) => {
    const state = get();

    if (state.selectedTimelineVideoId) {
      const nextVideos = updateTimelineVideoSpeed(
        state.timelineVideos,
        state.selectedTimelineVideoId,
        speed,
      );
      if (!nextVideos) return false;

      set((current) => ({
        timelineVideos: nextVideos,
        isSpeedToolActive: true,
        timelineUndoStack: [
          ...current.timelineUndoStack,
          createTimelineSnapshot(current),
        ].slice(-MAX_TIMELINE_HISTORY),
        timelineRedoStack: [],
      }));

      return true;
    }

    const { selectedSegmentId, keepSegments } = state;
    if (!selectedSegmentId) return false;

    const nextSegments = updateKeepSegmentSpeed(
      keepSegments,
      selectedSegmentId,
      speed,
    );
    if (!nextSegments) return false;

    set((state) => ({
      keepSegments: nextSegments,
      isSpeedToolActive: true,
      timelineUndoStack: [
        ...state.timelineUndoStack,
        createTimelineSnapshot(state),
      ].slice(-MAX_TIMELINE_HISTORY),
      timelineRedoStack: [],
    }));

    return true;
  },

  applyTranscriptionResult: (rawWords, language) => {
    const state = get();
    const normalized = normalizeTranscribedWords(rawWords);
    const inMontageRange =
      state.timelineVideos.length > 0
        ? normalized
        : normalized.filter((word) =>
            isWordInsideKeepSegments(word, state.keepSegments),
          );
    set({
      subtitleWords: filterSubtitleWordsOutsideMemeRanges(
        inMontageRange,
        state.timelineVideos,
        state.keepSegments,
      ),
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
            selectedTimelineVideoId: null,
            selectedZoomEffectId: null,
            isZoomToolActive: false,
            selectedImageOverlayId: null,
            isImageToolActive: false,
            selectedTextOverlayId: null,
            isTextToolActive: false,
            selectedSoundboardId: null,
            isSoundboardToolActive: false,
          }
        : {
            isSpeedToolActive: false,
          }),
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
    const state = get();
    const { sequencePlayhead } = state;
    const sourceTime = sequenceTimeToSourceTimeWithInserts(
      sequencePlayhead,
      state.keepSegments,
      state.timelineVideos,
    );

    const recordCut = (patch: Partial<TimelineSnapshot> & Record<string, unknown>) => {
      set((current) => ({
        ...patch,
        timelineUndoStack: [
          ...current.timelineUndoStack,
          createTimelineSnapshot(current),
        ].slice(-MAX_TIMELINE_HISTORY),
        timelineRedoStack: [],
      }));
      return true;
    };

    const trySplitTimelineVideo = (clipId: string): boolean => {
      const clip = state.timelineVideos.find((item) => item.id === clipId);
      if (
        !clip ||
        !canAddCutInTimelineVideo(sequencePlayhead, clip)
      ) {
        return false;
      }

      const nextVideos = splitTimelineVideoAt(
        state.timelineVideos,
        clipId,
        sequencePlayhead,
      );
      if (!nextVideos) return false;

      return recordCut({ timelineVideos: nextVideos });
    };

    const trySplitZoom = (effectId: string): boolean => {
      const next = splitZoomEffectAtPlayhead(
        state.zoomEffects,
        effectId,
        sequencePlayhead,
        state.keepSegments,
      );
      if (!next) return false;
      return recordCut({ zoomEffects: next });
    };

    const trySplitImage = (overlayId: string): boolean => {
      const next = splitImageOverlayAtPlayhead(
        state.imageOverlays,
        overlayId,
        sequencePlayhead,
        state.keepSegments,
      );
      if (!next) return false;
      return recordCut({ imageOverlays: next });
    };

    const trySplitText = (overlayId: string): boolean => {
      const next = splitTextOverlayAtPlayhead(
        state.textOverlays,
        overlayId,
        sequencePlayhead,
        state.keepSegments,
      );
      if (!next) return false;
      return recordCut({ textOverlays: next });
    };

    const trySplitSoundboard = (clipId: string): boolean => {
      const next = splitSoundboardAtPlayhead(
        state.soundboards,
        clipId,
        sequencePlayhead,
        state.keepSegments,
      );
      if (!next) return false;
      return recordCut({ soundboards: next });
    };

    const trySplitKeepSegment = (): boolean => {
      if (sourceTime === null) return false;
      if (!canAddCutInKeepSegments(sourceTime, state.keepSegments)) {
        return false;
      }

      const nextSegments = splitKeepSegmentAt(state.keepSegments, sourceTime);
      if (!nextSegments) return false;

      return recordCut({
        keepSegments: nextSegments,
        selectedSegmentId: null,
        lastFfmpegCutPayload: null,
      });
    };

    const trySplitSelectedKeepSegment = (): boolean => {
      if (!state.selectedSegmentId) return false;

      const packedSegments = buildPackedSegmentsWithInserts(
        state.keepSegments,
        state.timelineVideos,
      );
      const selected = packedSegments.find(
        (segment) => segment.id === state.selectedSegmentId,
      );
      if (!selected) return false;

      const playheadInsideSelected =
        sequencePlayhead >= selected.sequenceStart + 0.001 &&
        sequencePlayhead < selected.sequenceEnd - 0.001;
      if (!playheadInsideSelected) return false;

      return trySplitKeepSegment();
    };

    if (state.selectedTimelineVideoId) {
      if (trySplitTimelineVideo(state.selectedTimelineVideoId)) return true;
    }
    if (state.selectedZoomEffectId) {
      if (trySplitZoom(state.selectedZoomEffectId)) return true;
    }
    if (state.selectedImageOverlayId) {
      if (trySplitImage(state.selectedImageOverlayId)) return true;
    }
    if (state.selectedTextOverlayId) {
      if (trySplitText(state.selectedTextOverlayId)) return true;
    }
    if (state.selectedSoundboardId) {
      if (trySplitSoundboard(state.selectedSoundboardId)) return true;
    }
    if (trySplitSelectedKeepSegment()) return true;

    const activeTimelineVideo = getActiveTimelineVideoAtSequence(
      sequencePlayhead,
      state.timelineVideos,
    );
    if (activeTimelineVideo && trySplitTimelineVideo(activeTimelineVideo.id)) {
      return true;
    }

    // Sans sélection explicite : priorité à la piste vidéo de base (pas aux overlays).
    if (trySplitKeepSegment()) return true;

    const resolvedSourceTime = sourceTime ?? state.currentTime;

    const zoomId = findZoomEffectIdAtPlayhead(
      state.zoomEffects,
      sequencePlayhead,
      resolvedSourceTime,
    );
    if (zoomId && trySplitZoom(zoomId)) return true;

    const imageId = findImageOverlayIdAtPlayhead(
      state.imageOverlays,
      sequencePlayhead,
      resolvedSourceTime,
    );
    if (imageId && trySplitImage(imageId)) return true;

    const textId = findTextOverlayIdAtPlayhead(
      state.textOverlays,
      sequencePlayhead,
      resolvedSourceTime,
    );
    if (textId && trySplitText(textId)) return true;

    const soundboardId = findSoundboardIdAtPlayhead(
      state.soundboards,
      sequencePlayhead,
      resolvedSourceTime,
    );
    if (soundboardId && trySplitSoundboard(soundboardId)) return true;

    return false;
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
        soundboards: cloneSoundboards(previous.soundboards),
        timelineVideos: cloneTimelineVideos(previous.timelineVideos),
        selectedZoomEffectId: null,
        isZoomToolActive: false,
        selectedImageOverlayId: null,
        isImageToolActive: false,
        selectedTextOverlayId: null,
        isTextToolActive: false,
        selectedSoundboardId: null,
        isSoundboardToolActive: false,
        selectedTimelineVideoId: null,
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
      soundboards: cloneSoundboards(next.soundboards),
      timelineVideos: cloneTimelineVideos(next.timelineVideos),
      selectedZoomEffectId: null,
      isZoomToolActive: false,
      selectedImageOverlayId: null,
      isImageToolActive: false,
      selectedTextOverlayId: null,
      isTextToolActive: false,
      selectedSoundboardId: null,
      isSoundboardToolActive: false,
      selectedTimelineVideoId: null,
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

  applyClipTemplate: (payload) => {
    const state = get();
    let textOverlays = cloneTextOverlays(state.textOverlays);
    let imageOverlays = cloneImageOverlays(state.imageOverlays);

    const sortedText = [...textOverlays].sort((a, b) => a.start - b.start);
    const sortedStickers = imageOverlays
      .filter((overlay) => overlay.sticker)
      .sort((a, b) => a.start - b.start);

    if (payload.montage.firstTextOverlay) {
      const data = payload.montage.firstTextOverlay;
      const layout = normalizeSubtitleLayout(data.layout);
      const style = {
        ...data.style,
        letterSpacing: clampTextOverlayLetterSpacing(data.style.letterSpacing),
      };

      if (sortedText[0]) {
        const targetId = sortedText[0].id;
        textOverlays = textOverlays.map((overlay) =>
          overlay.id === targetId
            ? {
                ...overlay,
                text: data.text,
                label: createTextOverlayLabel(data.text),
                style,
                layout,
              }
            : overlay,
        );
      } else {
        const created = createTextOverlayAtTime(
          state.currentTime,
          state.keepSegments,
          data.text,
        );
        if (created) {
          textOverlays.push({ ...created, style, layout });
        }
      }
    }

    imageOverlays = imageOverlays.filter((overlay) => !overlay.sticker);

    if (payload.montage.followSticker) {
      const {
        username,
        platform,
        zone,
        sequenceStart,
        sequenceEnd,
      } = payload.montage.followSticker;
      const sticker = { type: "follow" as const, username, platform };
      const clampedZone = clampImageOverlayZone(zone);
      const src = followStickerToDataUrl(sticker);
      const label = `@${username}`;
      const timelineDuration = getTotalTimelineDuration(
        state.keepSegments,
        state.timelineVideos,
      );
      const stickerStart =
        sequenceStart ?? state.sequencePlayhead ?? state.currentTime;

      const existingSticker = sortedStickers[0];
      if (existingSticker) {
        imageOverlays.push({
          ...existingSticker,
          src,
          label,
          zone: clampedZone,
          sticker,
          start: sequenceStart ?? existingSticker.start,
          end: sequenceEnd ?? existingSticker.end,
          usesSequenceTime: true,
        });
      } else {
        const created = createImageOverlayAtSequenceTime(
          stickerStart,
          timelineDuration,
          src,
          label,
          { sticker, zone: clampedZone },
        );
        if (created) {
          if (sequenceEnd !== undefined) {
            created.end = sequenceEnd;
          }
          imageOverlays.push(created);
        }
      }
    }

    set({
      layout: {
        camShape: payload.layout.camShape,
        sourceCam: { ...payload.layout.sourceCam },
        verticalCam: { ...payload.layout.verticalCam },
        verticalCamZone: { ...payload.layout.verticalCamZone },
        verticalCropPan: payload.layout.verticalCropPan,
      },
      subtitleStyle: { ...payload.subtitles.style },
      subtitleLayout: normalizeSubtitleLayout(payload.subtitles.layout),
      subtitleTiming: { ...payload.subtitles.timing },
      previewContainerWidth: payload.subtitles.previewContainerWidth,
      textOverlays: textOverlays.sort((a, b) => a.start - b.start),
      imageOverlays: imageOverlays.sort((a, b) => a.start - b.start),
    });
  },

  setSavedClipMeta: (id, name) => {
    set({ savedClipId: id, savedClipName: name, saveStatus: "saved" });
  },

  setSaveStatus: (status) => {
    set({ saveStatus: status });
  },

  hydrateFromSaved: (savedState) => {
    set({
      editorStep: savedState.editorStep ?? "layout",
      layout: {
        camShape: savedState.layout.camShape,
        sourceCam: { ...savedState.layout.sourceCam },
        verticalCam: { ...savedState.layout.verticalCam },
        verticalCamZone: { ...savedState.layout.verticalCamZone },
        verticalCropPan: savedState.layout.verticalCropPan,
      },
      keepSegments: cloneKeepSegments(savedState.keepSegments),
      lastFfmpegCutPayload: savedState.lastFfmpegCutPayload
        ? cloneKeepSegments(savedState.lastFfmpegCutPayload)
        : null,
      zoomEffects: cloneZoomEffects(savedState.zoomEffects),
      imageOverlays: cloneImageOverlays(savedState.imageOverlays),
      textOverlays: cloneTextOverlays(savedState.textOverlays),
      soundboards: cloneSoundboards(savedState.soundboards),
      timelineVideos: cloneTimelineVideos(savedState.timelineVideos ?? []),
      subtitleWords: savedState.subtitleWords.map((word) => ({ ...word })),
      subtitleStyle: { ...savedState.subtitleStyle },
      subtitleTiming: { ...savedState.subtitleTiming },
      subtitleLayout: normalizeSubtitleLayout(savedState.subtitleLayout),
      subtitleLanguage: savedState.subtitleLanguage,
      previewContainerWidth: savedState.previewContainerWidth,
      exportUrl: savedState.exportUrl ?? null,
      exportResult: savedState.exportResult ?? null,
      currentTime: 0,
      isPlaying: false,
      selectedSegmentId: null,
      selectedZoomEffectId: null,
      isZoomToolActive: false,
      selectedImageOverlayId: null,
      isImageToolActive: false,
      selectedTextOverlayId: null,
      isTextToolActive: false,
      selectedSoundboardId: null,
      isSoundboardToolActive: false,
      selectedTimelineVideoId: null,
      sequencePlayhead: 0,
      isSpeedToolActive: false,
      selectedSubtitleWordId: null,
      timelineUndoStack: [],
      timelineRedoStack: [],
    });
  },
}));
