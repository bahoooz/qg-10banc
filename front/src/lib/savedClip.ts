import type { ClipEditorStep } from "../stores/clipEditorStore";
import type { ClipLayoutState } from "./clipLayout";
import type { ImageOverlay } from "./clipImageOverlays";
import type { TextOverlay } from "./clipTextOverlays";
import type { SoundboardClip } from "./clipSoundboards";
import type { TimelineVideoClip } from "./clipTimelineVideos";
import type {
  SubtitleLayout,
  SubtitleStyle,
  SubtitleTiming,
  SubtitleWord,
} from "./clipSubtitles";
import type { TimeRange } from "./clipTime";
import type { ZoomEffect } from "./clipZoomEffects";
import type { ClipExportResult, ClipImportResult } from "../../types";
import { DEFAULT_LAYOUT } from "./clipLayout";
import {
  DEFAULT_SUBTITLE_LAYOUT,
  DEFAULT_SUBTITLE_STYLE,
  DEFAULT_SUBTITLE_TIMING,
  SUBTITLE_PREVIEW_REF_WIDTH,
} from "./clipSubtitles";
import { DEFAULT_SEGMENT_SPEED } from "./clipTime";
import { useClipEditorStore } from "../stores/clipEditorStore";

export type SavedClipEditorStateV1 = {
  version: 1;
  editorStep?: ClipEditorStep;
  layout: ClipLayoutState;
  keepSegments: TimeRange[];
  lastFfmpegCutPayload: TimeRange[] | null;
  zoomEffects: ZoomEffect[];
  imageOverlays: ImageOverlay[];
  textOverlays: TextOverlay[];
  soundboards: SoundboardClip[];
  timelineVideos: TimelineVideoClip[];
  subtitleWords: SubtitleWord[];
  subtitleStyle: SubtitleStyle;
  subtitleTiming: SubtitleTiming;
  subtitleLayout: SubtitleLayout;
  subtitleLanguage: string | null;
  previewContainerWidth: number;
  exportUrl?: string | null;
  exportResult?: ClipExportResult | null;
};

async function resolveImageSrcForPersist(src: string): Promise<string> {
  if (src.startsWith("blob:")) {
    const response = await fetch(src);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Impossible de lire l'image importée"));
        }
      };
      reader.onerror = () =>
        reject(new Error("Impossible de lire l'image importée"));
      reader.readAsDataURL(blob);
    });
  }

  return src;
}

async function resolveAudioSrcForPersist(src: string): Promise<string> {
  if (!src.startsWith("blob:")) {
    return src;
  }

  const response = await fetch(src);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Impossible de lire l'audio importé"));
      }
    };
    reader.onerror = () =>
      reject(new Error("Impossible de lire l'audio importé"));
    reader.readAsDataURL(blob);
  });
}

export function buildInitialEditorState(
  clip: ClipImportResult,
): SavedClipEditorStateV1 {
  return {
    version: 1,
    editorStep: "layout",
    layout: { ...DEFAULT_LAYOUT },
    keepSegments: [{ start: 0, end: clip.duration, speed: DEFAULT_SEGMENT_SPEED }],
    lastFfmpegCutPayload: null,
    zoomEffects: [],
    imageOverlays: [],
    textOverlays: [],
    soundboards: [],
    timelineVideos: [],
    subtitleWords: [],
    subtitleStyle: { ...DEFAULT_SUBTITLE_STYLE },
    subtitleTiming: { ...DEFAULT_SUBTITLE_TIMING },
    subtitleLayout: { ...DEFAULT_SUBTITLE_LAYOUT },
    subtitleLanguage: null,
    previewContainerWidth: SUBTITLE_PREVIEW_REF_WIDTH,
    exportUrl: null,
    exportResult: null,
  };
}

export async function buildSavedClipEditorStateAsync(): Promise<SavedClipEditorStateV1> {
  const state = useClipEditorStore.getState();

  const imageOverlays = await Promise.all(
    state.imageOverlays.map(async (overlay) => ({
      ...overlay,
      zone: { ...overlay.zone },
      src: overlay.sticker ? overlay.src : await resolveImageSrcForPersist(overlay.src),
      ...(overlay.sticker ? { sticker: { ...overlay.sticker } } : {}),
    })),
  );

  const soundboards = await Promise.all(
    state.soundboards.map(async (clip) => ({
      ...clip,
      src: await resolveAudioSrcForPersist(clip.src),
    })),
  );

  return {
    version: 1,
    editorStep: state.editorStep,
    layout: {
      camShape: state.layout.camShape,
      sourceCam: { ...state.layout.sourceCam },
      verticalCam: { ...state.layout.verticalCam },
      verticalCamZone: { ...state.layout.verticalCamZone },
      verticalCropPan: state.layout.verticalCropPan,
    },
    keepSegments: state.keepSegments.map((segment) => ({ ...segment })),
    lastFfmpegCutPayload: state.lastFfmpegCutPayload
      ? state.lastFfmpegCutPayload.map((segment) => ({ ...segment }))
      : null,
    zoomEffects: state.zoomEffects.map((effect) => ({
      ...effect,
      zone: { ...effect.zone },
    })),
    imageOverlays,
    textOverlays: state.textOverlays.map((overlay) => ({
      ...overlay,
      style: { ...overlay.style },
      layout: { ...overlay.layout },
    })),
    soundboards,
    timelineVideos: state.timelineVideos.map((clip) => ({ ...clip })),
    subtitleWords: state.subtitleWords.map((word) => ({ ...word })),
    subtitleStyle: { ...state.subtitleStyle },
    subtitleTiming: { ...state.subtitleTiming },
    subtitleLayout: { ...state.subtitleLayout },
    subtitleLanguage: state.subtitleLanguage,
    previewContainerWidth: state.previewContainerWidth,
    exportUrl: state.exportUrl,
    exportResult: state.exportResult,
  };
}

export type SavedClipListItem = {
  id: string;
  name: string;
  clipId: string;
  previewUrl: string;
  sourceUrl: string;
  sourceDuration: number;
  sourceType: "upload" | "twitch";
  hasExport: boolean;
  updatedAt: string;
  createdAt: string;
};

export type SavedClipDetail = SavedClipListItem & {
  sourceWidth: number;
  sourceHeight: number;
  originalName: string | null;
  editorState: SavedClipEditorStateV1;
};

export type SavedClipsPageResult = {
  items: SavedClipListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ClipsStorageStats = {
  usedBytes: number;
  quotaBytes: number;
  usedPercent: number;
};

export type CreateSavedClipInput = {
  name: string;
  clipId: string;
  sourceType: "upload" | "twitch";
  originalName?: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceDuration: number;
  editorState: SavedClipEditorStateV1;
};

export function savedClipToImportResult(detail: SavedClipDetail): ClipImportResult {
  const maxSegmentEnd = Math.max(
    0,
    ...detail.editorState.keepSegments.map((segment) => segment.end),
  );

  return {
    id: detail.clipId,
    previewUrl: detail.previewUrl,
    sourceUrl: detail.sourceUrl,
    duration: Math.max(detail.sourceDuration, maxSegmentEnd),
    width: detail.sourceWidth,
    height: detail.sourceHeight,
    sourceType: detail.sourceType,
    originalName: detail.originalName ?? undefined,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(1)} Go`;
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(0)} Mo`;
  }
  return `${(bytes / 1024).toFixed(0)} Ko`;
}
