import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { AppError } from "../../utils.js";
import {
  CLIPS_DIR,
  CLIPS_EXPORTS_DIR,
  CLIPS_PREVIEWS_DIR,
  CLIPS_SOURCES_DIR,
  ensureClipDirectories,
} from "../lib/paths.js";
import {
  cutAndConcatSegments,
  cutAndConcatSegmentsFinal,
  burnAssSubtitles,
  generateVerticalPreview,
  getPreviewPath,
  getVideoMetadata,
  type TimeSegment,
} from "./ffmpeg.service.js";
import { renderExportedComposition } from "./exportRender.service.js";
import type { LayoutExportPayload } from "./export.types.js";
import { downloadTwitchClip } from "./twitch.service.js";
import { clipDebug } from "./clipDebug.js";
import {
  createExportJob,
  updateExportJob,
} from "./clipExportJobs.js";
import type { TClipExportPayload } from "./clips.schema.js";
import {
  generateAssContent,
  remapSubtitleWordsToSequence,
} from "./subtitles.util.js";
import type { SubtitleStylePayload } from "./subtitles.types.js";
import { getApiUrl } from "../config/env.js";

export type ClipImportResult = {
  id: string;
  previewUrl: string;
  sourceUrl: string;
  duration: number;
  width: number;
  height: number;
  sourceType: "upload" | "twitch";
  originalName?: string;
};

export type ClipExportResult = {
  id: string;
  exportUrl: string;
  duration: number;
  width: number;
  height: number;
};

function buildPreviewPublicUrl(id: string): string {
  return `${getApiUrl()}/clips/previews/${id}.mp4`;
}

function buildSourcePublicUrl(id: string): string {
  return `${getApiUrl()}/clips/sources/${id}.mp4`;
}

function buildExportPublicUrl(exportId: string): string {
  return `${getApiUrl()}/clips/exports/${exportId}.mp4`;
}

async function processSourceToPreview(
  sourcePath: string,
  id: string,
  sourceType: "upload" | "twitch",
  originalName?: string,
): Promise<ClipImportResult> {
  ensureClipDirectories();

  const previewPath = getPreviewPath(id, CLIPS_PREVIEWS_DIR);
  clipDebug.log("import", "génération preview verticale", { id, sourcePath });

  const sourceMetadata = await getVideoMetadata(sourcePath);
  await generateVerticalPreview(sourcePath, previewPath);
  const previewMetadata = await getVideoMetadata(previewPath);

  clipDebug.log("import", "preview prête", {
    id,
    sourceDuration: sourceMetadata.duration,
    sourceWidth: sourceMetadata.width,
    sourceHeight: sourceMetadata.height,
    previewWidth: previewMetadata.width,
    previewHeight: previewMetadata.height,
  });

  return {
    id,
    previewUrl: buildPreviewPublicUrl(id),
    sourceUrl: buildSourcePublicUrl(id),
    duration: sourceMetadata.duration,
    width: sourceMetadata.width,
    height: sourceMetadata.height,
    sourceType,
    originalName,
  };
}

export async function importUploadedClip(
  tempPath: string,
  originalName: string,
): Promise<ClipImportResult> {
  ensureClipDirectories();

  const id = randomUUID();
  const sourcePath = path.join(CLIPS_SOURCES_DIR, `${id}.mp4`);

  fs.renameSync(tempPath, sourcePath);

  try {
    return await processSourceToPreview(sourcePath, id, "upload", originalName);
  } catch (error) {
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
    const previewPath = getPreviewPath(id, CLIPS_PREVIEWS_DIR);
    if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);
    throw error;
  }
}

export async function importTwitchClip(
  url: string,
  twitchAccountId?: string,
): Promise<ClipImportResult> {
  ensureClipDirectories();

  const id = randomUUID();
  const sourcePath = path.join(CLIPS_SOURCES_DIR, `${id}.mp4`);

  try {
    await downloadTwitchClip(url, sourcePath, twitchAccountId);
    return await processSourceToPreview(sourcePath, id, "twitch");
  } catch (error) {
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
    const previewPath = getPreviewPath(id, CLIPS_PREVIEWS_DIR);
    if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);
    throw error;
  }
}

export async function applyClipCutService(
  clipId: string,
  keepSegments: TimeSegment[],
): Promise<ClipImportResult> {
  ensureClipDirectories();

  const previewPath = getPreviewPath(clipId, CLIPS_PREVIEWS_DIR);

  if (!fs.existsSync(previewPath)) {
    clipDebug.warn("cut", "preview introuvable", { clipId });
    throw new AppError(404, "CLIP_NOT_FOUND", "Preview introuvable");
  }

  const sortedSegments = [...keepSegments].sort((a, b) => a.start - b.start);
  clipDebug.log("cut", "démarrage cut FFmpeg (-c copy)", {
    clipId,
    segmentCount: sortedSegments.length,
  });

  const tempOutput = `${previewPath}.tmp.mp4`;

  try {
    await cutAndConcatSegments(previewPath, tempOutput, sortedSegments);
    fs.renameSync(tempOutput, previewPath);

    const metadata = await getVideoMetadata(previewPath);
    const sourcePath = path.join(CLIPS_SOURCES_DIR, `${clipId}.mp4`);
    const sourceMetadata = fs.existsSync(sourcePath)
      ? await getVideoMetadata(sourcePath)
      : metadata;

    clipDebug.log("cut", "cut terminé", {
      clipId,
      duration: metadata.duration,
    });

    return {
      id: clipId,
      previewUrl: `${buildPreviewPublicUrl(clipId)}?v=${Date.now()}`,
      sourceUrl: buildSourcePublicUrl(clipId),
      duration: metadata.duration,
      width: sourceMetadata.width,
      height: sourceMetadata.height,
      sourceType: "upload",
    };
  } catch (error) {
    clipDebug.error("cut", "échec cut FFmpeg", {
      clipId,
      error: error instanceof Error ? error.message : String(error),
    });
    if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    throw error;
  }
}

export type ClipExportJobStartResult = {
  jobId: string;
};

export type ExportProgressUpdate = {
  progress: number;
  phase: string;
};

export async function runExportJob(
  jobId: string,
  clipId: string,
  payload: TClipExportPayload,
): Promise<void> {
  updateExportJob(jobId, {
    status: "running",
    progress: 0,
    phase: "Préparation",
  });

  try {
    const result = await exportClipService(clipId, payload, (update) => {
      updateExportJob(jobId, {
        status: "running",
        progress: update.progress,
        phase: update.phase,
      });
    });

    updateExportJob(jobId, {
      status: "completed",
      progress: 100,
      phase: "Terminé",
      result,
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec de l'export du clip";

    updateExportJob(jobId, {
      status: "failed",
      phase: "Erreur",
      error: message,
    });
  }
}

export async function exportClipService(
  clipId: string,
  payload: TClipExportPayload,
  onProgress?: (update: ExportProgressUpdate) => void,
): Promise<ClipExportResult> {
  ensureClipDirectories();

  const {
    keepSegments,
    subtitleWords,
    subtitleStyle,
    subtitleTiming,
    layout,
    zoomEffects = [],
    imageOverlays = [],
    textOverlays = [],
  } = payload;

  const sourcePath = path.join(CLIPS_SOURCES_DIR, `${clipId}.mp4`);

  if (!fs.existsSync(sourcePath)) {
    clipDebug.warn("export", "source introuvable", { clipId });
    throw new AppError(404, "CLIP_NOT_FOUND", "Source vidéo introuvable");
  }

  const sourceMetadata = await getVideoMetadata(sourcePath);
  const sortedSegments = [...keepSegments].sort((a, b) => a.start - b.start);
  clipDebug.log("export", "démarrage export FFmpeg", {
    clipId,
    segmentCount: sortedSegments.length,
    segments: sortedSegments,
    subtitleCount: subtitleWords?.length ?? 0,
    zoomCount: zoomEffects.length,
    imageCount: imageOverlays.length,
  });

  const exportLayout: LayoutExportPayload = layout ?? {
    camShape: "rounded",
    sourceCam: { x: 0, y: 0.78, width: 0.2, height: 0.2 * (16 / 9) },
    verticalCam: { x: 0.19, y: 0.19 },
    verticalCamZone: { x: 0, y: 0, width: 0.38, height: 0.38 * (9 / 16) },
    verticalCropPan: 0.5,
  };

  const exportId = `${clipId}_${Date.now()}`;
  const exportPath = path.join(CLIPS_EXPORTS_DIR, `${exportId}.mp4`);
  const cutTempPath = `${exportPath}.cut.tmp.mp4`;
  const composedTempPath = `${exportPath}.composed.tmp.mp4`;
  const burnTempPath = `${exportPath}.burn.tmp.mp4`;
  const assPath = path.join(CLIPS_DIR, "temp", `${exportId}.ass`);

  try {
    onProgress?.({ progress: 2, phase: "Découpe du montage" });
    await cutAndConcatSegmentsFinal(sourcePath, cutTempPath, sortedSegments, (cutPercent) => {
      onProgress?.({
        progress: 5 + (cutPercent / 100) * 35,
        phase: "Découpe du montage",
      });
    });

    onProgress?.({ progress: 42, phase: "Composition verticale" });
    await renderExportedComposition(
      cutTempPath,
      composedTempPath,
      sourceMetadata.width,
      sourceMetadata.height,
      exportLayout,
      zoomEffects,
      imageOverlays,
      (renderPercent) => {
        onProgress?.({
          progress: 42 + (renderPercent / 100) * 28,
          phase: "Composition verticale",
        });
      },
    );

    if (fs.existsSync(cutTempPath)) fs.unlinkSync(cutTempPath);

    const hasSubtitles =
      (subtitleWords !== undefined &&
        subtitleWords.length > 0 &&
        subtitleStyle !== undefined) ||
      textOverlays.length > 0;

    if (hasSubtitles) {
      onProgress?.({ progress: 72, phase: "Préparation des sous-titres" });
      const tempDir = path.dirname(assPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const sequenceWords =
        subtitleWords && subtitleWords.length > 0
          ? remapSubtitleWordsToSequence(
              subtitleWords,
              sortedSegments,
              subtitleTiming,
            )
          : [];

      const defaultStyle: SubtitleStylePayload = {
        preset: "word-pop",
        fontFamily: "Arial Black",
        fontSize: 72,
        fillColor: "#FFFFFF",
        strokeColor: "#000000",
        strokeWidth: 6,
        position: "lower",
      };

      fs.writeFileSync(
        assPath,
        generateAssContent(
          sequenceWords,
          subtitleStyle ?? defaultStyle,
          textOverlays,
          payload.previewContainerWidth ??
            subtitleStyle?.previewContainerWidth,
        ),
        "utf-8",
      );

      onProgress?.({ progress: 76, phase: "Encodage des sous-titres" });
      await burnAssSubtitles(composedTempPath, assPath, burnTempPath, (burnPercent) => {
        onProgress?.({
          progress: 76 + (burnPercent / 100) * 22,
          phase: "Encodage des sous-titres",
        });
      });
      if (fs.existsSync(composedTempPath)) fs.unlinkSync(composedTempPath);
      fs.renameSync(burnTempPath, exportPath);
    } else {
      onProgress?.({ progress: 90, phase: "Finalisation" });
      fs.renameSync(composedTempPath, exportPath);
    }

    onProgress?.({ progress: 96, phase: "Finalisation" });
    const metadata = await getVideoMetadata(exportPath);
    onProgress?.({ progress: 100, phase: "Terminé" });

    clipDebug.log("export", "export terminé", {
      clipId,
      exportId,
      duration: metadata.duration,
    });

    return {
      id: clipId,
      exportUrl: `${buildExportPublicUrl(exportId)}?v=${Date.now()}`,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    clipDebug.error("export", "échec export FFmpeg", {
      clipId,
      error: error instanceof Error ? error.message : String(error),
    });
    if (fs.existsSync(cutTempPath)) fs.unlinkSync(cutTempPath);
    if (fs.existsSync(composedTempPath)) fs.unlinkSync(composedTempPath);
    if (fs.existsSync(burnTempPath)) fs.unlinkSync(burnTempPath);
    throw error;
  } finally {
    if (fs.existsSync(assPath)) fs.unlinkSync(assPath);
  }
}
