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
  concatSegmentFilesPreferCopy,
  concatSegmentFilesReencode,
  getVideoMetadata,
  runFfmpegWithProgress,
  trimSegmentToFileReencode,
  type FfmpegProgressCallback,
} from "./ffmpeg.service.js";
import {
  clampSegmentSpeed,
  DEFAULT_SEGMENT_SPEED,
  getSequenceDurationForSourceDuration,
} from "./segmentSpeed.util.js";

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
  /** Aligne le contenu en bas au centre de la zone (comme la preview sticker). */
  alignBottom?: boolean;
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
        mid >= overlay.sequenceStart && mid < overlay.sequenceEnd,
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
    // ~rounded-xl en preview : ~12 px sur une pip ~380 px → ~3 % du côté court.
    const cornerR = "max(8\\,min(W\\,H)*0.032)";
    const alphaExpr =
      "if(" +
      `(gte(X,${cornerR})*lte(X,W-${cornerR}))+(gte(Y,${cornerR})*lte(Y,H-${cornerR}))+` +
      `lte(hypot(X-${cornerR},Y-${cornerR}),${cornerR})+lte(hypot(X-(W-${cornerR}),Y-${cornerR}),${cornerR})+` +
      `lte(hypot(X-${cornerR},Y-(H-${cornerR})),${cornerR})+lte(hypot(X-(W-${cornerR}),Y-(H-${cornerR})),${cornerR}),` +
      "255,0)";

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

function buildImageScaleFilter(
  inputIndex: number,
  zone: CamZone,
  outputLabel: string,
): string {
  const zoneW = makeEven(zone.width * OUTPUT_WIDTH);
  const zoneH = makeEven(zone.height * OUTPUT_HEIGHT);
  return `[${inputIndex}:v]scale=${zoneW}:${zoneH}:force_original_aspect_ratio=decrease[${outputLabel}]`;
}

function buildImageOverlayPosition(
  zone: CamZone,
  scaledLabel: string,
  alignBottom: boolean,
): { x: string; y: string } {
  const zoneW = makeEven(zone.width * OUTPUT_WIDTH);
  const zoneH = makeEven(zone.height * OUTPUT_HEIGHT);
  const zoneX = Math.round(zone.x * OUTPUT_WIDTH);
  const zoneY = Math.round(zone.y * OUTPUT_HEIGHT);

  if (alignBottom) {
    return {
      x: `${zoneX}+(${zoneW}-w)/2`,
      y: `${zoneY}+(${zoneH}-h)`,
    };
  }

  return {
    x: `${zoneX}+(${zoneW}-w)/2`,
    y: `${zoneY}+(${zoneH}-h)/2`,
  };
}

function buildImageOverlayChain(
  images: ImageOverlayPayload[],
  startInputIndex: number | Map<string, number>,
  baseLabel: string,
  options?: { timed?: boolean },
): { filters: string[]; outputLabel: string; imagePaths: string[] } {
  if (images.length === 0) {
    return { filters: [], outputLabel: baseLabel, imagePaths: [] };
  }

  const filters: string[] = [];
  let currentLabel = baseLabel;
  const timed = options?.timed ?? false;
  const srcToInputIndex =
    startInputIndex instanceof Map ? startInputIndex : null;
  let nextSequentialIndex = typeof startInputIndex === "number" ? startInputIndex : 1;

  images.forEach((overlay, index) => {
    const inputIndex = srcToInputIndex
      ? srcToInputIndex.get(overlay.src)
      : nextSequentialIndex;
    if (inputIndex === undefined) {
      throw new Error("Image overlay introuvable pour l'export");
    }
    if (!srcToInputIndex) {
      nextSequentialIndex += 1;
    }
    const scaledLabel = `scaled${index}`;
    const nextLabel = index === images.length - 1 ? "outv" : `imgout${index}`;
    const position = buildImageOverlayPosition(
      overlay.zone,
      scaledLabel,
      overlay.alignBottom ?? false,
    );

    filters.push(buildImageScaleFilter(inputIndex, overlay.zone, scaledLabel));

    const enableExpr = timed
      ? `:enable='between(t\\,${overlay.sequenceStart}\\,${overlay.sequenceEnd})'`
      : "";

    filters.push(
      `[${currentLabel}][${scaledLabel}]overlay=x=${position.x}:y=${position.y}${enableExpr}[${nextLabel}]`,
    );
    currentLabel = nextLabel;
  });

  return {
    filters,
    outputLabel: currentLabel,
    imagePaths: images.map((overlay) => overlay.src),
  };
}

async function hasAudioStream(inputPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (error, data) => {
      if (error) return reject(error);
      resolve(data.streams.some((stream) => stream.codec_type === "audio"));
    });
  });
}

function buildIntervalVideoFilter(
  interval: CompositionInterval,
  layout: LayoutPayload,
  videoWidth: number,
  videoHeight: number,
  trimLabel: string,
): { filters: string[]; outputLabel: string } {
  const bgFilter = buildBgCropScaleFilter(
    interval.bgRegion,
    videoWidth,
    videoHeight,
  );
  const filters: string[] = [];

  if (interval.showPip) {
    const pip = buildPipOverlayFilter(
      layout,
      videoWidth,
      videoHeight,
      trimLabel,
    );
    filters.push(pip.filter.replace("__BG__", bgFilter));
    return { filters, outputLabel: pip.outputLabel };
  }

  const bgOut = "bgbase";
  filters.push(`[${trimLabel}]${bgFilter}[${bgOut}]`);
  return { filters, outputLabel: bgOut };
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
  const { seqStart, seqEnd } = interval;
  const trimLabel = "trimmed";
  const hasAudio = await hasAudioStream(inputPath);

  const srcToInputIndex = new Map<string, number>();
  let nextInputIndex = 1;
  for (const src of imagePathBySrc.keys()) {
    srcToInputIndex.set(src, nextInputIndex);
    nextInputIndex += 1;
  }

  const trimFilter = `[0:v]trim=start=${seqStart}:end=${seqEnd},setpts=PTS-STARTPTS[${trimLabel}]`;
  const { filters: compositionFilters, outputLabel: compositionOut } =
    buildIntervalVideoFilter(
      interval,
      layout,
      videoWidth,
      videoHeight,
      trimLabel,
    );

  let videoFilter = `${trimFilter};${compositionFilters.join(";")}`;
  let outputVideoLabel = compositionOut;

  if (interval.images.length > 0) {
    const chain = buildImageOverlayChain(
      interval.images,
      srcToInputIndex,
      outputVideoLabel,
    );
    videoFilter = `${videoFilter};${chain.filters.join(";")}`;
    outputVideoLabel = chain.outputLabel;
  }

  const filterParts = [`${videoFilter};[${outputVideoLabel}]format=yuv420p[vout]`];
  const outputMaps = ["-map", "[vout]"];

  if (hasAudio) {
    filterParts.unshift(
      `[0:a]atrim=start=${seqStart}:end=${seqEnd},asetpts=PTS-STARTPTS[aout]`,
    );
    outputMaps.push("-map", "[aout]");
  }

  const command = ffmpeg(inputPath);
  for (const src of imagePathBySrc.keys()) {
    const resolved = imagePathBySrc.get(src);
    if (!resolved) {
      throw new Error("Image overlay introuvable pour l'export");
    }
    command.input(resolved).inputOptions(["-loop", "1", "-t", String(duration)]);
  }

  return runFfmpegWithProgress(
    command
      .complexFilter(filterParts.join(";"))
      .outputOptions([
        ...outputMaps,
        ...PREVIEW_ENCODE_OPTIONS,
        "-shortest",
        "-y",
      ])
      .output(outputPath),
  );
}

async function renderIntervalsSinglePass(
  inputPath: string,
  outputPath: string,
  intervals: CompositionInterval[],
  layout: LayoutPayload,
  videoWidth: number,
  videoHeight: number,
  imagePathBySrc: Map<string, string>,
  onProgress?: FfmpegProgressCallback,
): Promise<void> {
  const metadata = await getVideoMetadata(inputPath);
  const hasAudio = await hasAudioStream(inputPath);
  const intervalCount = intervals.length;

  const srcToInputIndex = new Map<string, number>();
  let nextInputIndex = 1;
  for (const src of imagePathBySrc.keys()) {
    srcToInputIndex.set(src, nextInputIndex);
    nextInputIndex += 1;
  }

  const command = ffmpeg(inputPath);
  for (const src of imagePathBySrc.keys()) {
    const resolved = imagePathBySrc.get(src);
    if (!resolved) {
      throw new Error("Image overlay introuvable pour l'export");
    }
    command
      .input(resolved)
      .inputOptions(["-loop", "1", "-t", String(metadata.duration)]);
  }

  const filterParts: string[] = [];
  const videoPartLabels: string[] = [];

  const splitLabels = intervals.map((_, index) => `vsplit${index}`);
  filterParts.push(
    `[0:v]split=${intervalCount}${splitLabels.map((label) => `[${label}]`).join("")}`,
  );

  for (let index = 0; index < intervals.length; index += 1) {
    const interval = intervals[index];
    const trimLabel = `trimv${index}`;
    const partLabel = `partv${index}`;
    const { seqStart, seqEnd } = interval;

    filterParts.push(
      `[vsplit${index}]trim=start=${seqStart}:end=${seqEnd},setpts=PTS-STARTPTS[${trimLabel}]`,
    );

    const { filters: compositionFilters, outputLabel: compositionOut } =
      buildIntervalVideoFilter(
        interval,
        layout,
        videoWidth,
        videoHeight,
        trimLabel,
      );
    filterParts.push(...compositionFilters);

    let currentLabel = compositionOut;
    if (interval.images.length > 0) {
      const chain = buildImageOverlayChain(
        interval.images,
        srcToInputIndex,
        currentLabel,
      );
      filterParts.push(...chain.filters);
      currentLabel = chain.outputLabel;
    }

    filterParts.push(
      `[${currentLabel}]settb=AVTB,setpts=PTS-STARTPTS[${partLabel}]`,
    );
    videoPartLabels.push(partLabel);
  }

  filterParts.push(
    `${videoPartLabels.map((label) => `[${label}]`).join("")}concat=n=${intervalCount}:v=1:a=0[vconcat]`,
  );
  filterParts.push(`[vconcat]format=yuv420p[vout]`);

  const outputMaps = ["-map", "[vout]"];

  if (hasAudio) {
    const audioSplitLabels = intervals.map((_, index) => `asplit${index}`);
    filterParts.push(
      `[0:a]asplit=${intervalCount}${audioSplitLabels.map((label) => `[${label}]`).join("")}`,
    );

    const audioPartLabels: string[] = [];
    for (let index = 0; index < intervals.length; index += 1) {
      const { seqStart, seqEnd } = intervals[index];
      const audioPartLabel = `apart${index}`;
      filterParts.push(
        `[asplit${index}]atrim=start=${seqStart}:end=${seqEnd},asetpts=PTS-STARTPTS[${audioPartLabel}]`,
      );
      audioPartLabels.push(audioPartLabel);
    }

    filterParts.push(
      `${audioPartLabels.map((label) => `[${label}]`).join("")}concat=n=${intervalCount}:v=0:a=1[aout]`,
    );
    outputMaps.push("-map", "[aout]");
  }

  await runFfmpegWithProgress(
    command
      .complexFilter(filterParts.join(";"))
      .outputOptions([...outputMaps, ...PREVIEW_ENCODE_OPTIONS, "-y"])
      .output(outputPath),
    onProgress,
  );
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

  if (intervals.length === 1) {
    const interval = intervals[0];
    const bgFilter = buildBgCropScaleFilter(
      interval.bgRegion,
      videoWidth,
      videoHeight,
    );

    let outputVideoLabel: string;
    let filter: string;

    if (interval.showPip) {
      const pip = buildPipOverlayFilter(layout, videoWidth, videoHeight, "0:v");
      filter = pip.filter.replace("__BG__", bgFilter);
      outputVideoLabel = pip.outputLabel;
    } else {
      filter = `[0:v]${bgFilter}[bgbase]`;
      outputVideoLabel = "bgbase";
    }

    const command = ffmpeg(inputPath);

    if (imageOverlays.length > 0) {
      const tempDir = fs.mkdtempSync(
        path.join(path.dirname(outputPath), "img-single-"),
      );

      try {
        const srcToInputIndex = new Map<string, number>();
        let nextInputIndex = 1;

        for (let index = 0; index < imageOverlays.length; index += 1) {
          const overlay = imageOverlays[index];
          if (srcToInputIndex.has(overlay.src)) continue;
          const resolved = await resolveImageToPath(
            overlay.src,
            tempDir,
            `img_${index}`,
          );
          srcToInputIndex.set(overlay.src, nextInputIndex);
          command
            .input(resolved)
            .inputOptions(["-loop", "1", "-t", String(metadataDuration)]);
          nextInputIndex += 1;
        }

        const chain = buildImageOverlayChain(
          imageOverlays,
          srcToInputIndex,
          outputVideoLabel,
          { timed: true },
        );
        filter = `${filter};${chain.filters.join(";")}`;
        outputVideoLabel = chain.outputLabel;
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }

    await runFfmpegWithProgress(
      command
        .complexFilter(`${filter};[${outputVideoLabel}]format=yuv420p[vout]`)
        .outputOptions([
          "-map",
          "[vout]",
          "-map",
          "0:a?",
          ...PREVIEW_ENCODE_OPTIONS,
          "-y",
        ])
        .output(outputPath),
      onProgress,
    );
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

    try {
      await renderIntervalsSinglePass(
        inputPath,
        outputPath,
        intervals,
        layout,
        videoWidth,
        videoHeight,
        imagePathBySrc,
        onProgress,
      );
      return;
    } catch (singlePassError) {
      clipDebug.warn("export-render", "single-pass échoué, fallback multi-parts", {
        error:
          singlePassError instanceof Error
            ? singlePassError.message
            : String(singlePassError),
      });
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
    await concatSegmentFilesPreferCopy(
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
  "veryfast",
  "-crf",
  "22",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-movflags",
  "+faststart",
] as const;

export type TimelineVideoMergePayload = {
  instanceId?: string;
  clipId: string;
  sequenceStart: number;
  duration: number;
  sequenceDuration?: number;
  sourceStart?: number;
  layoutMode: "base" | "center-crop";
  importKind?: "meme" | "clip";
  naturalInsertStart?: number;
  speed?: number;
};

function getClipSequenceDuration(clip: TimelineVideoMergePayload): number {
  if (clip.sequenceDuration !== undefined) {
    return clip.sequenceDuration;
  }
  return getSequenceDurationForSourceDuration(
    clip.duration,
    clampSegmentSpeed(clip.speed),
  );
}

async function trimVideoSegment(
  inputPath: string,
  outputPath: string,
  start: number,
  duration: number,
): Promise<void> {
  if (duration <= 0.02) {
    throw new Error("Durée de segment invalide pour la découpe export");
  }

  await trimSegmentToFileReencode(inputPath, outputPath, start, duration);
}

async function normalizeVideoToDuration(
  inputPath: string,
  outputPath: string,
  targetDuration: number,
): Promise<number> {
  const metadata = await getVideoMetadata(inputPath);
  const actual = metadata.duration;

  if (Math.abs(actual - targetDuration) < 0.04) {
    if (path.resolve(inputPath) !== path.resolve(outputPath)) {
      fs.copyFileSync(inputPath, outputPath);
    }
    return actual;
  }

  if (actual > targetDuration + 0.04) {
    await trimVideoSegment(inputPath, outputPath, 0, targetDuration);
  } else {
    const padDuration = targetDuration - actual;
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters([`tpad=stop_mode=clone:stop_duration=${padDuration.toFixed(3)}`])
        .outputOptions([...PREVIEW_ENCODE_OPTIONS, "-t", String(targetDuration), "-y"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (error) => reject(error))
        .run();
    });
  }

  const normalized = await getVideoMetadata(outputPath);
  return normalized.duration;
}

async function spliceMemesIntoMain(
  mainPath: string,
  mainDuration: number,
  memes: {
    naturalInsertStart: number;
    sequenceDuration: number;
    renderedPath: string;
  }[],
  tempDir: string,
  onStep?: (update: { phase: string; localPercent: number }) => void,
): Promise<{ path: string; duration: number }> {
  if (memes.length === 0) {
    return { path: mainPath, duration: mainDuration };
  }

  const sorted = [...memes].sort(
    (a, b) => a.naturalInsertStart - b.naturalInsertStart,
  );
  const partPaths: string[] = [];
  let cursor = 0;
  const totalSteps = sorted.length * 2 + 2;
  let completedSteps = 0;

  const report = (phase: string) => {
    completedSteps += 1;
    onStep?.({
      phase,
      localPercent: Math.min(100, (completedSteps / totalSteps) * 100),
    });
  };

  for (let index = 0; index < sorted.length; index += 1) {
    const meme = sorted[index];
    const insertAt = meme.naturalInsertStart;

    if (insertAt > cursor + 0.02) {
      report(`Découpe base avant meme ${index + 1}/${sorted.length}`);
      const partPath = path.join(tempDir, `base-part-${index}.mp4`);
      await trimVideoSegment(mainPath, partPath, cursor, insertAt - cursor);
      partPaths.push(partPath);
    }

    report(`Insertion meme ${index + 1}/${sorted.length}`);
    partPaths.push(meme.renderedPath);
    cursor = insertAt;
  }

  if (cursor < mainDuration - 0.02) {
    report("Découpe base après memes");
    const tailPath = path.join(tempDir, "base-tail.mp4");
    await trimVideoSegment(mainPath, tailPath, cursor, mainDuration - cursor);
    partPaths.push(tailPath);
  }

  report("Encodage fusion memes");
  const splicedPath = path.join(tempDir, "spliced-main.mp4");
  const listPath = path.join(tempDir, "splice-list.txt");
  await concatSegmentFilesReencode(partPaths, splicedPath, listPath, (concatPercent) => {
    onStep?.({
      phase: "Encodage fusion memes",
      localPercent: Math.min(
        100,
        ((completedSteps + concatPercent / 100) / totalSteps) * 100,
      ),
    });
  });

  let totalDuration = 0;
  for (const partPath of partPaths) {
    const partMeta = await getVideoMetadata(partPath);
    totalDuration += partMeta.duration;
  }

  return { path: splicedPath, duration: totalDuration };
}

export type MergeTimelineProgressUpdate = {
  /** 0–100 à l'intérieur de la phase fusion */
  percent: number;
  phase: string;
};

export async function applyImageOverlaysToExportVideo(
  inputPath: string,
  outputPath: string,
  imageOverlays: ImageOverlayPayload[],
  onProgress?: FfmpegProgressCallback,
): Promise<void> {
  if (imageOverlays.length === 0) {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  const tempDir = fs.mkdtempSync(
    path.join(path.dirname(outputPath), "img-overlay-"),
  );

  try {
    const uniqueImageSrcs = [
      ...new Set(imageOverlays.map((overlay) => overlay.src)),
    ];
    const imagePathBySrc = new Map<string, string>();

    for (let index = 0; index < uniqueImageSrcs.length; index += 1) {
      const src = uniqueImageSrcs[index];
      const resolved = await resolveImageToPath(src, tempDir, `overlay_${index}`);
      imagePathBySrc.set(src, resolved);
    }

    const sortedOverlays = [...imageOverlays].sort(
      (a, b) => a.sequenceStart - b.sequenceStart,
    );

    const chain = buildImageOverlayChain(sortedOverlays, 1, "0:v", {
      timed: true,
    });

    const metadata = await getVideoMetadata(inputPath);
    const command = ffmpeg(inputPath);
    for (const src of chain.imagePaths) {
      const resolved = imagePathBySrc.get(src);
      if (!resolved) {
        throw new Error("Image overlay introuvable pour l'export");
      }
      command
        .input(resolved)
        .inputOptions(["-loop", "1", "-t", String(metadata.duration)]);
    }

    const filter = `${chain.filters.join(";")};[${chain.outputLabel}]format=yuv420p[vout]`;

    await runFfmpegWithProgress(
      command
        .complexFilter(filter)
        .outputOptions([
          "-map",
          "[vout]",
          "-map",
          "0:a?",
          ...PREVIEW_ENCODE_OPTIONS,
          "-t",
          String(metadata.duration),
          "-shortest",
          "-y",
        ])
        .output(outputPath),
      onProgress,
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function buildCenterCropLayout(): LayoutPayload {
  return {
    camShape: "rounded",
    sourceCam: { x: 0, y: 0.78, width: 0.2, height: 0.2 * (16 / 9) },
    verticalCam: { x: 0.5, y: 0.5 },
    verticalCamZone: { x: 0, y: 0, width: 1, height: 1 },
    verticalCropPan: 0.5,
  };
}

export type SoundboardMixPayload = {
  sequenceStart: number;
  sequenceEnd: number;
  src: string;
  volume: number;
};

function audioExtensionFromMime(mime: string): string {
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("aac")) return "aac";
  return "mp3";
}

async function resolveAudioToPath(
  src: string,
  tempDir: string,
  fileId: string,
): Promise<string> {
  const dataMatch = src.match(/^data:audio\/([\w+.-]+);base64,(.+)$/);
  if (dataMatch) {
    const ext = audioExtensionFromMime(dataMatch[1]);
    const outputPath = path.join(tempDir, `${fileId}.${ext}`);
    fs.writeFileSync(outputPath, Buffer.from(dataMatch[2], "base64"));
    return outputPath;
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Impossible de télécharger l'audio : ${src}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    const ext = audioExtensionFromMime(contentType);
    const outputPath = path.join(tempDir, `${fileId}.${ext}`);
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }

  throw new Error("Format audio non supporté pour l'export");
}

export async function mixSoundboardsIntoExport(
  inputPath: string,
  outputPath: string,
  soundboards: SoundboardMixPayload[],
  onProgress?: FfmpegProgressCallback,
): Promise<void> {
  if (soundboards.length === 0) {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  const tempDir = fs.mkdtempSync(
    path.join(path.dirname(outputPath), "sfx-mix-"),
  );

  try {
    const videoMetadata = await getVideoMetadata(inputPath);
    const videoDuration = Math.max(0.01, videoMetadata.duration);
    const hasAudio = await hasAudioStream(inputPath);

    const resolvedClips: Array<{
      path: string;
      sequenceStart: number;
      clipDuration: number;
      volume: number;
    }> = [];

    const sortedBoards = [...soundboards].sort(
      (a, b) => a.sequenceStart - b.sequenceStart,
    );

    for (let index = 0; index < sortedBoards.length; index += 1) {
      const board = sortedBoards[index];
      const clipDuration = Math.max(
        0.05,
        board.sequenceEnd - board.sequenceStart,
      );

      try {
        const audioPath = await resolveAudioToPath(
          board.src,
          tempDir,
          `sfx_${index}`,
        );
        resolvedClips.push({
          path: audioPath,
          sequenceStart: board.sequenceStart,
          clipDuration,
          volume: Math.max(0, Math.min(1, board.volume)),
        });
      } catch (error) {
        clipDebug.warn("export-render", "soundboard ignoré", {
          index,
          src: board.src.slice(0, 48),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (resolvedClips.length === 0) {
      fs.copyFileSync(inputPath, outputPath);
      return;
    }

    const command = ffmpeg(inputPath);
    const filterParts: string[] = [];
    const mixLabels: string[] = [];

    if (hasAudio) {
      filterParts.push(
        "[0:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1[maina]",
      );
    } else {
      filterParts.push(
        `anullsrc=r=44100:cl=stereo,atrim=0:${videoDuration},asetpts=PTS-STARTPTS[maina]`,
      );
    }
    mixLabels.push("[maina]");

    for (let index = 0; index < resolvedClips.length; index += 1) {
      const clip = resolvedClips[index];
      command.input(clip.path);
      const inputIndex = index + 1;
      const delayMs = Math.max(0, Math.round(clip.sequenceStart * 1000));
      const label = `sfx${index}`;

      filterParts.push(
        `[${inputIndex}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${clip.clipDuration},asetpts=PTS-STARTPTS,volume=${clip.volume},adelay=${delayMs}|${delayMs}[${label}]`,
      );
      mixLabels.push(`[${label}]`);
    }

    filterParts.push(
      `${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=0:normalize=0[aout]`,
    );

    clipDebug.log("export-render", "mixage soundboards", {
      clipCount: resolvedClips.length,
      hasAudio,
      videoDuration,
    });

    await runFfmpegWithProgress(
      command
        .complexFilter(filterParts.join(";"))
        .outputOptions([
          "-map",
          "0:v",
          "-map",
          "[aout]",
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-movflags",
          "+faststart",
          "-y",
        ])
        .output(outputPath),
      onProgress,
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function mergeTimelineVideosIntoExport(
  mainPath: string,
  mainDuration: number,
  baseLayout: LayoutPayload,
  timelineVideos: TimelineVideoMergePayload[],
  sourcesDir: string,
  outputPath: string,
  onProgress?: (update: MergeTimelineProgressUpdate) => void,
): Promise<number> {
  if (timelineVideos.length === 0) {
    fs.copyFileSync(mainPath, outputPath);
    return mainDuration;
  }

  const totalClips = timelineVideos.length;
  const hasMemes = timelineVideos.some((clip) => clip.importKind === "meme");

  const report = (localPercent: number, phase: string) => {
    onProgress?.({
      percent: Math.min(100, Math.max(0, localPercent)),
      phase,
    });
  };

  const tempDir = fs.mkdtempSync(path.join(path.dirname(outputPath), "tvid-"));
  const renderedByInstanceId = new Map<
    string,
    { path: string; sequenceDuration: number }
  >();

  const getTimelineVideoRenderKey = (
    clip: TimelineVideoMergePayload,
    index: number,
  ): string => clip.instanceId ?? `${clip.clipId}@${index}`;

  try {
    for (let index = 0; index < timelineVideos.length; index += 1) {
      const clip = timelineVideos[index];
      const clipLabel =
        clip.importKind === "meme"
          ? `Meme ${index + 1}/${totalClips}`
          : `Clip ${index + 1}/${totalClips}`;
      report((index / totalClips) * 55, `Préparation — ${clipLabel}`);

      const sourcePath = path.join(sourcesDir, `${clip.clipId}.mp4`);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source timeline video introuvable : ${clip.clipId}`);
      }

      const metadata = await getVideoMetadata(sourcePath);
      const layout =
        clip.layoutMode === "base" ? baseLayout : buildCenterCropLayout();
      const trimmedSourcePath = path.join(tempDir, `src-${index}.mp4`);
      const sourceStart = clip.sourceStart ?? 0;
      const sequenceDuration = getClipSequenceDuration(clip);

      await trimSegmentToFileReencode(
        sourcePath,
        trimmedSourcePath,
        sourceStart,
        clip.duration,
        undefined,
        clip.speed ?? DEFAULT_SEGMENT_SPEED,
      );

      report((index / totalClips) * 55 + 8, `Composition — ${clipLabel}`);
      const clipOut = path.join(tempDir, `clip-${index}.mp4`);
      const clipOutNormalized = path.join(tempDir, `clip-norm-${index}.mp4`);
      const zoomEffects =
        clip.layoutMode === "center-crop"
          ? [
              {
                sequenceStart: 0,
                sequenceEnd: clip.duration,
                zone: getVerticalCropRegion(
                  metadata.width,
                  metadata.height,
                  layout.verticalCropPan,
                ),
              },
            ]
          : [];

      await renderExportedComposition(
        trimmedSourcePath,
        clipOut,
        metadata.width,
        metadata.height,
        layout,
        zoomEffects,
        [],
      );

      report((index / totalClips) * 55 + 14, `Durée — ${clipLabel}`);
      const normalizedDuration = await normalizeVideoToDuration(
        clipOut,
        clipOutNormalized,
        sequenceDuration,
      );

      renderedByInstanceId.set(
        clip.instanceId ?? getTimelineVideoRenderKey(clip, index),
        {
          path: clipOutNormalized,
          sequenceDuration: normalizedDuration,
        },
      );

      report(((index + 1) / totalClips) * 55, `${clipLabel} prêt`);
    }

    const memeClips = timelineVideos.filter((clip) => clip.importKind === "meme");
    const appendClips = timelineVideos.filter((clip) => clip.importKind !== "meme");

    let workingMainPath = mainPath;
    let workingDuration = mainDuration;

    if (hasMemes) {
      const splicedMemes = memeClips
        .map((clip) => {
          const renderKey = clip.instanceId
            ? clip.instanceId
            : getTimelineVideoRenderKey(
                clip,
                timelineVideos.findIndex(
                  (item) =>
                    item.clipId === clip.clipId &&
                    item.sequenceStart === clip.sequenceStart,
                ),
              );
          const rendered = renderedByInstanceId.get(renderKey);
          if (!rendered) return null;
          return {
            naturalInsertStart:
              clip.naturalInsertStart ?? clip.sequenceStart,
            sequenceDuration: rendered.sequenceDuration,
            renderedPath: rendered.path,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      report(58, "Insertion des memes dans la timeline");
      const spliced = await spliceMemesIntoMain(
        mainPath,
        mainDuration,
        splicedMemes,
        tempDir,
        (update) => report(58 + (update.localPercent / 100) * 24, update.phase),
      );
      workingMainPath = spliced.path;
      workingDuration = spliced.duration;
      report(82, "Memes intégrés");
    }

    const overlayClips = appendClips
      .sort((a, b) => a.sequenceStart - b.sequenceStart)
      .map((clip) => {
        const renderKey = clip.instanceId
          ? clip.instanceId
          : getTimelineVideoRenderKey(
              clip,
              timelineVideos.findIndex(
                (item) =>
                  item.clipId === clip.clipId &&
                  item.sequenceStart === clip.sequenceStart,
              ),
            );
        const rendered = renderedByInstanceId.get(renderKey);
        if (!rendered) return null;
        return {
          path: rendered.path,
          duration: rendered.sequenceDuration,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (overlayClips.length === 0) {
      fs.copyFileSync(workingMainPath, outputPath);
      report(100, "Fusion terminée");
      return workingDuration;
    }

    report(84, "Assemblage des clips ajoutés");
    const concatParts = [workingMainPath, ...overlayClips.map((clip) => clip.path)];
    const concatListPath = path.join(tempDir, "append-list.txt");
    await concatSegmentFilesReencode(
      concatParts,
      outputPath,
      concatListPath,
      (concatPercent) => {
        report(84 + (concatPercent / 100) * 14, "Encodage assemblage final");
      },
    );

    const totalDuration =
      workingDuration +
      overlayClips.reduce((sum, clip) => sum + clip.duration, 0);

    report(100, "Fusion terminée");
    return totalDuration;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
