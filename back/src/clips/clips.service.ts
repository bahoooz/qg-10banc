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
  generateVerticalPreview,
  getPreviewPath,
  getVideoMetadata,
  type TimeSegment,
} from "./ffmpeg.service.js";
import {
  applyImageOverlaysToExportVideo,
  mergeTimelineVideosIntoExport,
  renderExportedComposition,
} from "./exportRender.service.js";
import type { LayoutExportPayload } from "./export.types.js";
import { downloadTwitchClip, fetchTwitchClipByUrl } from "./twitch.service.js";
import { clipDebug, clipLog } from "./clipDebug.js";
import {
  createExportJob,
  updateExportJob,
} from "./clipExportJobs.js";
import {
  updateImportJob,
} from "./clipImportJobs.js";
import type { TClipExportPayload } from "./clips.schema.js";
import {
  buildTextOverlaySequenceItems,
  remapSubtitleWordsToSequence,
  resolveSubtitleRenderStyleFromExportPayload,
} from "@qg/subtitle-composition";
import { remapFullTimelineSubtitleWords } from "./subtitles.util.js";
import { burnCanvasSubtitles } from "./subtitleCanvas.service.js";
import { getApiUrl } from "../config/env.js";
import { assertClipsStorageQuota } from "./clipsStorage.service.js";

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
  onProgress?: (update: ImportProgressUpdate) => void,
): Promise<ClipImportResult> {
  ensureClipDirectories();

  const sourceSize = fs.statSync(sourcePath).size;
  assertClipsStorageQuota(sourceSize);

  const previewPath = getPreviewPath(id, CLIPS_PREVIEWS_DIR);
  clipDebug.log("import", "génération preview verticale", { id, sourcePath });

  onProgress?.({ progress: 8, phase: "Analyse de la vidéo…" });
  const sourceMetadata = await getVideoMetadata(sourcePath);

  onProgress?.({ progress: 15, phase: "Conversion en vertical 9:16…" });
  await generateVerticalPreview(sourcePath, previewPath, (ffmpegPercent) => {
    const mapped = 15 + Math.round(ffmpegPercent * 0.75);
    onProgress?.({
      progress: mapped,
      phase: "Conversion en vertical 9:16…",
    });
  });

  onProgress?.({ progress: 92, phase: "Finalisation…" });
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

  const helixClip = await fetchTwitchClipByUrl(url);
  const id = randomUUID();
  const sourcePath = path.join(CLIPS_SOURCES_DIR, `${id}.mp4`);

  try {
    await downloadTwitchClip(url, sourcePath, twitchAccountId);
    return await processSourceToPreview(
      sourcePath,
      id,
      "twitch",
      helixClip.title,
    );
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

export type ImportProgressUpdate = {
  progress: number;
  phase: string;
};

export async function runImportUploadJob(
  jobId: string,
  tempPath: string,
  originalName: string,
): Promise<void> {
  clipLog.info("import", "Job upload en cours", { jobId, originalName });

  updateImportJob(jobId, {
    status: "running",
    progress: 0,
    phase: "Préparation",
  });

  ensureClipDirectories();

  const id = randomUUID();
  const sourcePath = path.join(CLIPS_SOURCES_DIR, `${id}.mp4`);

  try {
    updateImportJob(jobId, { progress: 5, phase: "Enregistrement du fichier…" });
    fs.renameSync(tempPath, sourcePath);

    const result = await processSourceToPreview(
      sourcePath,
      id,
      "upload",
      originalName,
      (update) => {
        updateImportJob(jobId, {
          status: "running",
          progress: update.progress,
          phase: update.phase,
        });
      },
    );

    updateImportJob(jobId, {
      status: "completed",
      progress: 100,
      phase: "Terminé",
      result,
      error: null,
    });
  } catch (error) {
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
    const previewPath = getPreviewPath(id, CLIPS_PREVIEWS_DIR);
    if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    const message =
      error instanceof Error ? error.message : "Échec de l'import du clip";

    clipLog.error("import", "Job upload échoué", { jobId, message });
    updateImportJob(jobId, {
      status: "failed",
      phase: "Erreur",
      error: message,
    });
  }
}

export async function runImportTwitchJob(
  jobId: string,
  url: string,
  twitchAccountId?: string,
): Promise<void> {
  clipLog.info("import", "Job Twitch en cours", { jobId, url });

  updateImportJob(jobId, {
    status: "running",
    progress: 0,
    phase: "Préparation",
  });

  ensureClipDirectories();

  const id = randomUUID();
  const sourcePath = path.join(CLIPS_SOURCES_DIR, `${id}.mp4`);

  try {
    updateImportJob(jobId, { progress: 5, phase: "Téléchargement Twitch…" });
    const helixClip = await fetchTwitchClipByUrl(url);
    await downloadTwitchClip(url, sourcePath, twitchAccountId);

    const result = await processSourceToPreview(
      sourcePath,
      id,
      "twitch",
      helixClip.title,
      (update) => {
        updateImportJob(jobId, {
          status: "running",
          progress: update.progress,
          phase: update.phase,
        });
      },
    );

    updateImportJob(jobId, {
      status: "completed",
      progress: 100,
      phase: "Terminé",
      result,
      error: null,
    });
  } catch (error) {
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
    const previewPath = getPreviewPath(id, CLIPS_PREVIEWS_DIR);
    if (fs.existsSync(previewPath)) fs.unlinkSync(previewPath);

    const message =
      error instanceof Error ? error.message : "Échec de l'import Twitch";

    clipLog.error("import", "Job Twitch échoué", { jobId, message });
    updateImportJob(jobId, {
      status: "failed",
      phase: "Erreur",
      error: message,
    });
  }
}

export async function runExportJob(
  jobId: string,
  clipId: string,
  payload: TClipExportPayload,
): Promise<void> {
  clipLog.info("export", "Job export en cours", { jobId, clipId });

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

    clipLog.error("export", "Job export échoué", { jobId, clipId, message });
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
    timelineVideos = [],
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

  try {
    onProgress?.({ progress: 2, phase: "Découpe du montage" });
    await cutAndConcatSegmentsFinal(sourcePath, cutTempPath, sortedSegments, (cutPercent) => {
      onProgress?.({
        progress: 5 + (cutPercent / 100) * 35,
        phase: "Découpe du montage",
      });
    });

    const deferImageOverlays =
      timelineVideos.length > 0 && imageOverlays.length > 0;

    onProgress?.({ progress: 42, phase: "Composition verticale" });
    await renderExportedComposition(
      cutTempPath,
      composedTempPath,
      sourceMetadata.width,
      sourceMetadata.height,
      exportLayout,
      zoomEffects,
      deferImageOverlays ? [] : imageOverlays,
      (renderPercent) => {
        onProgress?.({
          progress: 42 + (renderPercent / 100) * 26,
          phase: "Composition verticale",
        });
      },
    );

    if (timelineVideos.length > 0) {
      const composedMetadata = await getVideoMetadata(composedTempPath);
      const mergedTempPath = `${composedTempPath}.merged.tmp.mp4`;
      await mergeTimelineVideosIntoExport(
        composedTempPath,
        composedMetadata.duration,
        exportLayout,
        timelineVideos,
        CLIPS_SOURCES_DIR,
        mergedTempPath,
        (update) => {
          onProgress?.({
            progress: 68 + (update.percent / 100) * 18,
            phase: update.phase,
          });
        },
      );
      if (fs.existsSync(composedTempPath)) fs.unlinkSync(composedTempPath);
      fs.renameSync(mergedTempPath, composedTempPath);
    }

    if (deferImageOverlays) {
      onProgress?.({ progress: 87, phase: "Stickers et images" });
      const overlayTempPath = `${composedTempPath}.overlay.tmp.mp4`;
      await applyImageOverlaysToExportVideo(
        composedTempPath,
        overlayTempPath,
        imageOverlays,
        (overlayPercent) => {
          onProgress?.({
            progress: 87 + (overlayPercent / 100) * 3,
            phase: "Stickers et images",
          });
        },
      );
      if (fs.existsSync(composedTempPath)) fs.unlinkSync(composedTempPath);
      fs.renameSync(overlayTempPath, composedTempPath);
    }

    if (fs.existsSync(cutTempPath)) fs.unlinkSync(cutTempPath);

    const hasSubtitles =
      (subtitleWords !== undefined &&
        subtitleWords.length > 0 &&
        subtitleStyle !== undefined) ||
      textOverlays.length > 0;

    if (hasSubtitles) {
      onProgress?.({ progress: 91, phase: "Préparation des sous-titres" });

      const previewContainerWidth =
        payload.previewContainerWidth ??
        subtitleStyle?.previewContainerWidth ??
        360;

      const sequenceWords =
        subtitleWords && subtitleWords.length > 0
          ? timelineVideos.length > 0
            ? remapFullTimelineSubtitleWords(subtitleWords, subtitleTiming)
            : remapSubtitleWordsToSequence(
                subtitleWords,
                sortedSegments,
                subtitleTiming,
              )
          : [];

      const resolvedSubtitleStyle =
        subtitleStyle && sequenceWords.length > 0
          ? resolveSubtitleRenderStyleFromExportPayload(
              subtitleStyle,
              previewContainerWidth,
            )
          : null;

      const textOverlayItems = buildTextOverlaySequenceItems(
        textOverlays,
        previewContainerWidth,
      );

      const composedMetadata = await getVideoMetadata(composedTempPath);

      onProgress?.({ progress: 93, phase: "Encodage des sous-titres" });
      await burnCanvasSubtitles(
        composedTempPath,
        burnTempPath,
        {
          sequenceWords,
          subtitleStyle: resolvedSubtitleStyle,
          textOverlays: textOverlayItems,
        },
        composedMetadata.duration,
        (burnPercent) => {
          onProgress?.({
            progress: 93 + (burnPercent / 100) * 5,
            phase: "Encodage des sous-titres",
          });
        },
      );
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
  }
}
