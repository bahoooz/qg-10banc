import ffmpeg, { type FfmpegCommand } from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { clipDebug } from "./clipDebug.js";

export type VideoMetadata = {
  duration: number;
  width: number;
  height: number;
};

export function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, metadata) => {
      if (error) return reject(error);

      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      const duration = Number(metadata.format.duration ?? 0);
      const width = videoStream?.width ?? 0;
      const height = videoStream?.height ?? 0;

      resolve({ duration, width, height });
    });
  });
}

/**
 * Génère une preview verticale 9:16 (1080×1920) via crop centré + encodage H.264.
 */
export function generateVerticalPreview(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  clipDebug.log("ffmpeg", "generateVerticalPreview", { inputPath, outputPath });

  return new Promise((resolve, reject) => {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    ffmpeg(inputPath)
      .videoFilters([
        "setsar=1",
        "scale=1080:1920:force_original_aspect_ratio=increase",
        "crop=1080:1920",
      ])
      .outputOptions([...PREVIEW_ENCODE_OPTIONS])
      .output(outputPath)
      .on("end", () => {
        clipDebug.log("ffmpeg", "generateVerticalPreview terminé", { outputPath });
        resolve();
      })
      .on("error", (error) => {
        clipDebug.error("ffmpeg", "generateVerticalPreview échoué", {
          message: error.message,
        });
        reject(error);
      })
      .run();
  });
}

export function buildPreviewFilename(sourceId: string): string {
  return `${sourceId}.mp4`;
}

export function getPreviewPath(sourceId: string, previewsDir: string): string {
  return path.join(previewsDir, buildPreviewFilename(sourceId));
}

const PREVIEW_ENCODE_OPTIONS = [
  "-c:v libx264",
  "-preset fast",
  "-crf 22",
  "-c:a aac",
  "-b:a 128k",
  "-movflags +faststart",
  "-y",
] as const;

/** Copy stream sans ré-encodage — quasi instantané, précision au keyframe près. */
const PREVIEW_CUT_COPY_OPTIONS = [
  "-c copy",
  "-avoid_negative_ts make_zero",
  "-movflags +faststart",
  "-y",
] as const;

function trimSegmentToFile(
  inputPath: string,
  outputPath: string,
  start: number,
  duration: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions([`-ss ${start}`])
      .duration(duration)
      .outputOptions([...PREVIEW_CUT_COPY_OPTIONS])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (error) => reject(error))
      .run();
  });
}

function concatSegmentFiles(
  partPaths: string[],
  outputPath: string,
  listFilePath: string,
): Promise<void> {
  const listContent = partPaths
    .map((part) => `file '${part.replace(/\\/g, "/")}'`)
    .join("\n");

  fs.writeFileSync(listFilePath, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFilePath)
      .inputOptions(["-f concat", "-safe", "0"])
      .outputOptions([...PREVIEW_CUT_COPY_OPTIONS])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (error) => reject(error))
      .run();
  });
}

/**
 * Fallback ré-encodage (plus lent, coupe frame-précise).
 * Utilisé si -c copy échoue (codecs incompatibles, etc.).
 */
async function trimSegmentWithFallback(
  inputPath: string,
  outputPath: string,
  start: number,
  duration: number,
): Promise<void> {
  try {
    await trimSegmentToFile(inputPath, outputPath, start, duration);
  } catch {
    await trimSegmentToFileReencode(inputPath, outputPath, start, duration);
  }
}

async function concatSegmentFilesWithFallback(
  partPaths: string[],
  outputPath: string,
  listFilePath: string,
): Promise<void> {
  try {
    await concatSegmentFiles(partPaths, outputPath, listFilePath);
  } catch {
    await concatSegmentFilesReencode(partPaths, outputPath, listFilePath);
  }
}

function trimSegmentToFileReencode(
  inputPath: string,
  outputPath: string,
  start: number,
  duration: number,
  onProgress?: FfmpegProgressCallback,
): Promise<void> {
  const command = ffmpeg(inputPath)
    .setStartTime(start)
    .duration(duration)
    .outputOptions([...PREVIEW_ENCODE_OPTIONS])
    .output(outputPath);

  return runFfmpegWithProgress(command, onProgress);
}

export function concatSegmentFilesReencode(
  partPaths: string[],
  outputPath: string,
  listFilePath: string,
  onProgress?: FfmpegProgressCallback,
): Promise<void> {
  const listContent = partPaths
    .map((part) => `file '${part.replace(/\\/g, "/")}'`)
    .join("\n");

  fs.writeFileSync(listFilePath, listContent);

  const command = ffmpeg()
    .input(listFilePath)
    .inputOptions(["-f concat", "-safe", "0"])
    .outputOptions([...PREVIEW_ENCODE_OPTIONS])
    .output(outputPath);

  return runFfmpegWithProgress(command, onProgress);
}

export type TimeSegment = {
  start: number;
  end: number;
};

export type FfmpegProgressCallback = (percent: number) => void;

export function runFfmpegWithProgress(
  command: FfmpegCommand,
  onProgress?: FfmpegProgressCallback,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (onProgress) {
      command.on("progress", (progress) => {
        if (typeof progress.percent === "number" && Number.isFinite(progress.percent)) {
          onProgress(Math.max(0, Math.min(100, progress.percent)));
        }
      });
    }

    command
      .on("end", () => resolve())
      .on("error", (error) => reject(error))
      .run();
  });
}

/** Extrait l'audio mono 44,1 kHz pour la transcription Whisper. */
export function extractAudioForTranscription(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  clipDebug.log("ffmpeg", "extractAudioForTranscription", {
    inputPath,
    outputPath,
  });

  return new Promise((resolve, reject) => {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioFrequency(44100)
      .audioChannels(1)
      .output(outputPath)
      .on("end", () => {
        clipDebug.log("ffmpeg", "extractAudioForTranscription terminé", {
          outputPath,
        });
        resolve();
      })
      .on("error", (error) => {
        clipDebug.error("ffmpeg", "extractAudioForTranscription échoué", {
          message: error.message,
        });
        reject(error);
      })
      .run();
  });
}

function escapeAssPathForFfmpeg(assPath: string): string {
  return assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/** Applique un fichier ASS en burn-in sur une vidéo. */
export function burnAssSubtitles(
  inputPath: string,
  assPath: string,
  outputPath: string,
  onProgress?: FfmpegProgressCallback,
): Promise<void> {
  const escapedAss = escapeAssPathForFfmpeg(assPath);

  clipDebug.log("ffmpeg", "burnAssSubtitles", {
    inputPath,
    assPath,
    outputPath,
  });

  const command = ffmpeg(inputPath)
    .videoFilters([`subtitles='${escapedAss}'`])
    .outputOptions([...PREVIEW_ENCODE_OPTIONS])
    .output(outputPath);

  return runFfmpegWithProgress(command, onProgress).then(() => {
    clipDebug.log("ffmpeg", "burnAssSubtitles terminé", { outputPath });
  });
}

/**
 * Découpe et concatène les segments conservés en un seul mp4.
 */
export async function cutAndConcatSegments(
  inputPath: string,
  outputPath: string,
  segments: TimeSegment[],
): Promise<void> {
  if (segments.length === 0) {
    throw new Error("Aucun segment à conserver");
  }

  if (segments.length === 1) {
    const seg = segments[0];
    await trimSegmentWithFallback(
      inputPath,
      outputPath,
      seg.start,
      seg.end - seg.start,
    );
    return;
  }

  const tempDir = path.join(
    path.dirname(outputPath),
    `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  );
  fs.mkdirSync(tempDir, { recursive: true });

  const partPaths: string[] = [];
  const listFilePath = path.join(tempDir, "concat.txt");

  try {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const partPath = path.join(tempDir, `part_${i}.mp4`);
      await trimSegmentWithFallback(
        inputPath,
        partPath,
        seg.start,
        seg.end - seg.start,
      );
      partPaths.push(partPath);
    }

    await concatSegmentFilesWithFallback(partPaths, outputPath, listFilePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Export final : découpe frame-précise avec ré-encodage H.264.
 */
export async function cutAndConcatSegmentsFinal(
  inputPath: string,
  outputPath: string,
  segments: TimeSegment[],
  onProgress?: FfmpegProgressCallback,
): Promise<void> {
  if (segments.length === 0) {
    throw new Error("Aucun segment à conserver");
  }

  clipDebug.log("ffmpeg", "cutAndConcatSegmentsFinal", {
    inputPath,
    outputPath,
    segmentCount: segments.length,
  });

  const report = (ratio: number) => {
    onProgress?.(Math.max(0, Math.min(100, ratio)));
  };

  if (segments.length === 1) {
    const seg = segments[0];
    await trimSegmentToFileReencode(
      inputPath,
      outputPath,
      seg.start,
      seg.end - seg.start,
      report,
    );
    clipDebug.log("ffmpeg", "cutAndConcatSegmentsFinal terminé", { outputPath });
    return;
  }

  const tempDir = path.join(
    path.dirname(outputPath),
    `temp_export_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  );
  fs.mkdirSync(tempDir, { recursive: true });

  const partPaths: string[] = [];
  const listFilePath = path.join(tempDir, "concat.txt");
  const segmentShare = 85 / segments.length;

  try {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const partPath = path.join(tempDir, `part_${i}.mp4`);
      const baseProgress = i * segmentShare;

      await trimSegmentToFileReencode(
        inputPath,
        partPath,
        seg.start,
        seg.end - seg.start,
        (segmentPercent) => {
          report(baseProgress + (segmentPercent / 100) * segmentShare);
        },
      );
      partPaths.push(partPath);
    }

    await concatSegmentFilesReencode(partPaths, outputPath, listFilePath, (concatPercent) => {
      report(85 + (concatPercent / 100) * 15);
    });
    clipDebug.log("ffmpeg", "cutAndConcatSegmentsFinal terminé", { outputPath });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
