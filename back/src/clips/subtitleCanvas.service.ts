import { spawn } from "node:child_process";
import fs from "node:fs";
import type { SKRSContext2D } from "@napi-rs/canvas";
import { createCanvas } from "@napi-rs/canvas";
import {
  EXPORT_CANVAS_HEIGHT,
  EXPORT_CANVAS_WIDTH,
  buildCompositionFrameState,
  computeWordActivationTimes,
  type CompositionFrameState,
  type TextWidthMeasurer,
} from "@qg/subtitle-composition";
import { clipDebug } from "./clipDebug.js";
import type { FfmpegProgressCallback } from "./ffmpeg.service.js";
import {
  buildCanvasFont,
  ensureSubtitleCanvasFontsRegistered,
} from "./subtitleCanvasFonts.js";
import {
  clearSubtitleCanvas,
  drawSubtitleWord,
  drawTextOverlayCommand,
} from "./subtitleCanvasRenderer.js";

const EXPORT_FPS = 60;

export type CanvasCompositionInput = {
  sequenceWords: Parameters<typeof buildCompositionFrameState>[0]["sequenceWords"];
  subtitleStyle: Parameters<typeof buildCompositionFrameState>[0]["subtitleStyle"];
  textOverlays: Parameters<typeof buildCompositionFrameState>[0]["textOverlays"];
};

function createTextMeasurer(ctx: SKRSContext2D | null): TextWidthMeasurer {
  return (text, fontSize, fontFamily, fontWeight) => {
    if (!ctx) return text.length * fontSize * 0.52;
    ctx.font = buildCanvasFont(fontWeight, fontSize, fontFamily);
    return ctx.measureText(text).width;
  };
}

function renderFrameState(
  ctx: SKRSContext2D | null,
  frame: CompositionFrameState,
): void {
  if (!ctx) return;

  clearSubtitleCanvas(ctx);

  if (frame.subtitles) {
    for (const word of frame.subtitles.words) {
      drawSubtitleWord(ctx, word, frame.subtitles.style);
    }
  }

  for (const overlay of frame.textOverlays) {
    drawTextOverlayCommand(ctx, overlay);
  }
}

/** Burn-in des sous-titres via rendu Canvas frame-par-frame (Streamladder-like). */
export async function burnCanvasSubtitles(
  inputPath: string,
  outputPath: string,
  composition: CanvasCompositionInput,
  durationSec: number,
  onProgress?: FfmpegProgressCallback,
): Promise<void> {
  ensureSubtitleCanvasFontsRegistered();

  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const totalFrames = Math.max(1, Math.ceil(durationSec * EXPORT_FPS));
  const canvas = createCanvas(EXPORT_CANVAS_WIDTH, EXPORT_CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");
  const measure = createTextMeasurer(ctx);
  const activationTimes =
    composition.sequenceWords.length > 0
      ? computeWordActivationTimes(composition.sequenceWords)
      : undefined;

  clipDebug.log("subtitle-canvas", "burnCanvasSubtitles démarrage", {
    inputPath,
    outputPath,
    totalFrames,
    durationSec,
  });

  await new Promise<void>((resolve, reject) => {
    const ffArgs = [
      "-y",
      "-i",
      inputPath,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-s",
      `${EXPORT_CANVAS_WIDTH}x${EXPORT_CANVAS_HEIGHT}`,
      "-r",
      String(EXPORT_FPS),
      "-i",
      "pipe:0",
      "-filter_complex",
      "[1:v]format=yuva420p[sub];[0:v][sub]overlay=0:0:shortest=1[outv]",
      "-map",
      "[outv]",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "copy",
      "-movflags",
      "+faststart",
      outputPath,
    ];

    const ffmpeg = spawn("ffmpeg", ffArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stderr = "";
    ffmpeg.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`FFmpeg canvas burn a échoué (${code}): ${stderr}`));
    });

    if (!ffmpeg.stdin) {
      reject(new Error("FFmpeg stdin indisponible"));
      return;
    }

    const stdin = ffmpeg.stdin;
    let frameIndex = 0;

    const writeNextFrame = () => {
      if (frameIndex >= totalFrames) {
        stdin.end();
        return;
      }

      const sequenceTime = frameIndex / EXPORT_FPS;
      const frameState = buildCompositionFrameState({
        sequenceWords: composition.sequenceWords,
        subtitleStyle: composition.subtitleStyle,
        textOverlays: composition.textOverlays,
        sequenceTime,
        measure,
        activationTimes,
      });

      renderFrameState(ctx, frameState);

      const buffer = canvas.data();
      const canContinue = stdin.write(buffer);
      frameIndex += 1;
      onProgress?.(Math.round((frameIndex / totalFrames) * 100));

      if (canContinue) {
        setImmediate(writeNextFrame);
      } else {
        stdin.once("drain", writeNextFrame);
      }
    };

    writeNextFrame();
  });

  clipDebug.log("subtitle-canvas", "burnCanvasSubtitles terminé", { outputPath });
}
