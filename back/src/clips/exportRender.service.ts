import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { clipDebug } from "./clipDebug.js";
import {
  buildBgCropScaleFilter,
  getVerticalCropRegion,
  makeEven,
  regionToPixelCrop,
  type CamZone,
  type LayoutPayload,
  type NormalizedRegion,
} from "./layout.util.js";
import {
  concatSegmentFilesReencode,
  runFfmpegWithProgress,
  type FfmpegProgressCallback,
} from "./ffmpeg.service.js";

export type ZoomEffectPayload = {
  sequenceStart: number;
  sequenceEnd: number;
  zone: CamZone;
};

export type ImageOverlayPayload = {
  sequenceStart: number;
  sequenceEnd: number;
  src: string;
  zone: CamZone;
};

type CompositionInterval = {
  seqStart: number;
  seqEnd: number;
  bgRegion: NormalizedRegion;
  showPip: boolean;
  images: ImageOverlayPayload[];
};

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;

function collectBoundaries(
  duration: number,
  zoomEffects: ZoomEffectPayload[],
  imageOverlays: ImageOverlayPayload[],
): number[] {
  const boundaries = new Set<number>([0, duration]);

  for (const effect of zoomEffects) {
    boundaries.add(Math.max(0, effect.sequenceStart));
    boundaries.add(Math.min(duration, effect.sequenceEnd));
  }

  for (const overlay of imageOverlays) {
    boundaries.add(Math.max(0, overlay.sequenceStart));
    boundaries.add(Math.min(duration, overlay.sequenceEnd));
  }

  return [...boundaries].sort((a, b) => a - b);
}

function buildCompositionIntervals(
  duration: number,
  layout: LayoutPayload,
  videoWidth: number,
  videoHeight: number,
  zoomEffects: ZoomEffectPayload[],
  imageOverlays: ImageOverlayPayload[],
): CompositionInterval[] {
  const boundaries = collectBoundaries(duration, zoomEffects, imageOverlays);
  const defaultRegion = getVerticalCropRegion(
    videoWidth,
    videoHeight,
    layout.verticalCropPan,
  );

  const intervals: CompositionInterval[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const seqStart = boundaries[index];
    const seqEnd = boundaries[index + 1];
    if (seqEnd - seqStart < 0.02) continue;

    const mid = (seqStart + seqEnd) / 2;
    const activeZoom = zoomEffects.find(
      (effect) => mid >= effect.sequenceStart && mid < effect.sequenceEnd,
    );

    const activeImages = imageOverlays.filter(
      (overlay) =>
        overlay.sequenceEnd > seqStart && overlay.sequenceStart < seqEnd,
    );

    intervals.push({
      seqStart,
      seqEnd,
      bgRegion: activeZoom
        ? {
            x: activeZoom.zone.x,
            y: activeZoom.zone.y,
            width: activeZoom.zone.width,
            height: activeZoom.zone.height,
          }
        : defaultRegion,
      showPip: !activeZoom,
      images: activeImages,
    });
  }

  if (intervals.length === 0) {
    intervals.push({
      seqStart: 0,
      seqEnd: duration,
      bgRegion: defaultRegion,
      showPip: true,
      images: imageOverlays,
    });
  }

  return intervals;
}

async function resolveImageToPath(
  src: string,
  tempDir: string,
  fileId: string,
): Promise<string> {
  const dataMatch = src.match(/^data:image\/(\w+);base64,(.+)$/);
  if (dataMatch) {
    const ext = dataMatch[1] === "jpeg" ? "jpg" : dataMatch[1];
    const outputPath = path.join(tempDir, `${fileId}.${ext}`);
    fs.writeFileSync(outputPath, Buffer.from(dataMatch[2], "base64"));
    return outputPath;
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Impossible de télécharger l'image : ${src}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "image/png";
    const ext = contentType.includes("jpeg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : "png";
    const outputPath = path.join(tempDir, `${fileId}.${ext}`);
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }

  throw new Error("Format d'image non supporté pour l'export");
}

function buildPipShapeFilter(
  inputLabel: string,
  outputLabel: string,
  shape: LayoutPayload["camShape"],
): string {
  if (shape === "circle") {
    return `[${inputLabel}]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(pow(X-W/2,2)+pow(Y-H/2,2),pow(min(W,H)/2,2)),255,0)'[${outputLabel}]`;
  }

  if (shape === "rounded") {
    const alphaExpr =
      "if(gte(min(min(X,W-1-X),min(Y,H-1-Y)),min(W,H)*0.14),255," +
      "if(lte(hypot(X-min(W,H)*0.14,Y-min(W,H)*0.14),min(W,H)*0.14)+" +
      "lte(hypot(X-(W-min(W,H)*0.14),Y-min(W,H)*0.14),min(W,H)*0.14)+" +
      "lte(hypot(X-min(W,H)*0.14,Y-(H-min(W,H)*0.14)),min(W,H)*0.14)+" +
      "lte(hypot(X-(W-min(W,H)*0.14),Y-(H-min(W,H)*0.14)),min(W,H)*0.14),255,0))";

    return `[${inputLabel}]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaExpr}'[${outputLabel}]`;
  }

  return `[${inputLabel}]copy[${outputLabel}]`;
}

function buildPipOverlayFilter(
  layout: LayoutPayload,
  videoWidth: number,
  videoHeight: number,
  inputLabel: string,
): { filter: string; outputLabel: string } {
  const pipCrop = regionToPixelCrop(
    {
      x: layout.sourceCam.x,
      y: layout.sourceCam.y,
      width: layout.sourceCam.width,
      height: layout.sourceCam.height,
    },
    videoWidth,
    videoHeight,
  );

  const pipWidth = makeEven(layout.verticalCamZone.width * OUTPUT_WIDTH);
  const pipHeight = makeEven(layout.verticalCamZone.height * OUTPUT_HEIGHT);
  const overlayX = Math.round(
    layout.verticalCam.x * OUTPUT_WIDTH - pipWidth / 2,
  );
  const overlayY = Math.round(
    layout.verticalCam.y * OUTPUT_HEIGHT - pipHeight / 2,
  );

  const pipShapeFilter = buildPipShapeFilter("pipraw", "pipshaped", layout.camShape);

  const filter =
    `[${inputLabel}]split=2[vbase][vpip];` +
    `[vbase]__BG__[bg];` +
    `[vpip]crop=${pipCrop.width}:${pipCrop.height}:${pipCrop.x}:${pipCrop.y},scale=${pipWidth}:${pipHeight}:flags=lanczos[pipraw];` +
    `${pipShapeFilter};` +
    `[bg][pipshaped]overlay=${overlayX}:${overlayY}:format=auto[withpip]`;

  return { filter, outputLabel: "withpip" };
}

function buildImageOverlayChain(
  images: ImageOverlayPayload[],
  startInputIndex: number,
  baseLabel: string,
): { filters: string[]; outputLabel: string; imagePaths: string[] } {
  if (images.length === 0) {
    return { filters: [], outputLabel: baseLabel, imagePaths: [] };
  }

  const filters: string[] = [];
  let currentLabel = baseLabel;

  images.forEach((overlay, index) => {
    const inputIndex = startInputIndex + index;
    const imgWidth = makeEven(overlay.zone.width * OUTPUT_WIDTH);
    const imgHeight = makeEven(overlay.zone.height * OUTPUT_HEIGHT);
    const overlayX = Math.round(overlay.zone.x * OUTPUT_WIDTH);
    const overlayY = Math.round(overlay.zone.y * OUTPUT_HEIGHT);
    const nextLabel = index === images.length - 1 ? "outv" : `imgout${index}`;

    filters.push(
      `[${inputIndex}:v]scale=${imgWidth}:${imgHeight}:flags=lanczos[img${index}]`,
    );
    filters.push(
      `[${currentLabel}][img${index}]overlay=${overlayX}:${overlayY}[${nextLabel}]`,
    );
    currentLabel = nextLabel;
  });

  return {
    filters,
    outputLabel: currentLabel,
    imagePaths: images.map((overlay) => overlay.src),
  };
}

async function renderCompositionInterval(
  inputPath: string,
  outputPath: string,
  interval: CompositionInterval,
  layout: LayoutPayload,
  videoWidth: number,
  videoHeight: number,
  imagePathBySrc: Map<string, string>,
): Promise<void> {
  const duration = interval.seqEnd - interval.seqStart;
  const bgFilter = buildBgCropScaleFilter(
    interval.bgRegion,
    videoWidth,
    videoHeight,
  );

  const imageInputs = interval.images.map((overlay) => {
    const resolved = imagePathBySrc.get(overlay.src);
    if (!resolved) {
      throw new Error("Image overlay introuvable pour l'export");
    }
    return resolved;
  });

  let videoFilter: string;
  let outputVideoLabel = "outv";

  if (interval.showPip) {
    const pip = buildPipOverlayFilter(
      layout,
      videoWidth,
      videoHeight,
      "0:v",
    );
    videoFilter = pip.filter.replace("__BG__", bgFilter);
    outputVideoLabel = pip.outputLabel;

    if (interval.images.length > 0) {
      const chain = buildImageOverlayChain(
        interval.images,
        1,
        outputVideoLabel,
      );
      videoFilter = `${videoFilter};${chain.filters.join(";")}`;
      outputVideoLabel = chain.outputLabel;
    }
  } else {
    videoFilter = `[0:v]${bgFilter}[bgbase]`;
    outputVideoLabel = "bgbase";

    if (interval.images.length > 0) {
      const chain = buildImageOverlayChain(interval.images, 1, outputVideoLabel);
      videoFilter = `${videoFilter};${chain.filters.join(";")}`;
      outputVideoLabel = chain.outputLabel;
    }
  }

  const command = ffmpeg(inputPath);
  for (const imagePath of imageInputs) {
    command.input(imagePath).inputOptions(["-loop", "1", "-t", String(duration)]);
  }

  return new Promise((resolve, reject) => {
    command
      .setStartTime(interval.seqStart)
      .duration(duration)
      .complexFilter(`${videoFilter};[${outputVideoLabel}]format=yuv420p[vout]`)
      .outputOptions([
        "-map",
        "[vout]",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "22",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-shortest",
        "-y",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (error) => reject(error))
      .run();
  });
}

export async function renderExportedComposition(
  inputPath: string,
  outputPath: string,
  videoWidth: number,
  videoHeight: number,
  layout: LayoutPayload,
  zoomEffects: ZoomEffectPayload[],
  imageOverlays: ImageOverlayPayload[],
  onProgress?: FfmpegProgressCallback,
): Promise<void> {
  const metadataDuration = await new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (error, data) => {
      if (error) return reject(error);
      resolve(Number(data.format.duration ?? 0));
    });
  });

  const intervals = buildCompositionIntervals(
    metadataDuration,
    layout,
    videoWidth,
    videoHeight,
    zoomEffects,
    imageOverlays,
  );

  clipDebug.log("export-render", "intervalles composition", {
    intervalCount: intervals.length,
    duration: metadataDuration,
  });

  if (intervals.length === 1 && intervals[0].images.length === 0) {
    const interval = intervals[0];
    const bgFilter = buildBgCropScaleFilter(
      interval.bgRegion,
      videoWidth,
      videoHeight,
    );

    let filter: string;
    if (interval.showPip) {
      const pip = buildPipOverlayFilter(layout, videoWidth, videoHeight, "0:v");
      filter = `${pip.filter.replace("__BG__", bgFilter)};[withpip]format=yuv420p[vout]`;
    } else {
      filter = `[0:v]${bgFilter},format=yuv420p[vout]`;
    }

    const command = ffmpeg(inputPath)
      .complexFilter(filter)
      .outputOptions([
        "-map",
        "[vout]",
        "-map",
        "0:a?",
        ...PREVIEW_ENCODE_OPTIONS,
        "-y",
      ])
      .output(outputPath);

    await runFfmpegWithProgress(command, onProgress);
    return;
  }

  const tempDir = path.join(
    path.dirname(outputPath),
    `render_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  );
  fs.mkdirSync(tempDir, { recursive: true });

  const uniqueImageSrcs = [
    ...new Set(imageOverlays.map((overlay) => overlay.src)),
  ];
  const imagePathBySrc = new Map<string, string>();

  try {
    for (let index = 0; index < uniqueImageSrcs.length; index += 1) {
      const src = uniqueImageSrcs[index];
      const resolved = await resolveImageToPath(src, tempDir, `img_${index}`);
      imagePathBySrc.set(src, resolved);
    }

    const partPaths: string[] = [];
    const intervalShare = 90 / intervals.length;

    for (let index = 0; index < intervals.length; index += 1) {
      const interval = intervals[index];
      const partPath = path.join(tempDir, `part_${index}.mp4`);
      await renderCompositionInterval(
        inputPath,
        partPath,
        interval,
        layout,
        videoWidth,
        videoHeight,
        imagePathBySrc,
      );
      partPaths.push(partPath);
      onProgress?.(
        Math.min(90, Math.round((index + 1) * intervalShare)),
      );
    }

    const listFilePath = path.join(tempDir, "concat.txt");
    await concatSegmentFilesReencode(
      partPaths,
      outputPath,
      listFilePath,
      (percent) => onProgress?.(90 + (percent / 100) * 10),
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const PREVIEW_ENCODE_OPTIONS = [
  "-c:v",
  "libx264",
  "-preset",
  "fast",
  "-crf",
  "22",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-movflags",
  "+faststart",
] as const;
