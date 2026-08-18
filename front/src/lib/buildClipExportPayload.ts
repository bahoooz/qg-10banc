import { DEFAULT_SEGMENT_SPEED } from "../lib/clipTime";
import { mapImageOverlaysToSequence } from "../lib/clipImageOverlays";
import { mapSoundboardsToSequence } from "../lib/clipSoundboards";
import { followStickerToPngDataUrl } from "../lib/followSticker";
import { toExportSubtitleStyle } from "../lib/clipSubtitles";
import { mapTextOverlaysToSequence } from "../lib/clipTextOverlays";
import { mapZoomEffectsToSequence } from "../lib/clipZoomEffects";
import { getTimelineVideoSequenceDuration } from "../lib/clipTimelineVideos";
import { useClipEditorStore } from "../stores/clipEditorStore";

async function resolveImageSrcForExport(src: string): Promise<string> {
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
      reader.onerror = () => reject(new Error("Impossible de lire l'image importée"));
      reader.readAsDataURL(blob);
    });
  }

  return src;
}

async function resolveAudioSrcForExport(src: string): Promise<string> {
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

export async function buildClipExportPayloadAsync() {
  const state = useClipEditorStore.getState();

  const packedZoomEffects = mapZoomEffectsToSequence(
    state.zoomEffects,
    state.keepSegments,
    state.timelineVideos,
  ).map((effect) => ({
    sequenceStart: effect.sequenceStart,
    sequenceEnd: effect.sequenceEnd,
    zone: effect.zone,
  }));

  const packedImageOverlays = await Promise.all(
    mapImageOverlaysToSequence(
      state.imageOverlays,
      state.keepSegments,
      state.timelineVideos,
    ).map(
      async (overlay) => ({
        sequenceStart: overlay.sequenceStart,
        sequenceEnd: overlay.sequenceEnd,
        src: overlay.sticker
          ? await followStickerToPngDataUrl(overlay.sticker, {
              zone: overlay.zone,
            })
          : await resolveImageSrcForExport(overlay.src),
        zone: overlay.zone,
        ...(overlay.sticker ? { alignBottom: true } : {}),
      }),
    ),
  );

  const packedTextOverlays = mapTextOverlaysToSequence(
    state.textOverlays,
    state.keepSegments,
    state.timelineVideos,
  ).map((overlay) => ({
    sequenceStart: overlay.sequenceStart,
    sequenceEnd: overlay.sequenceEnd,
    text: overlay.text,
    layout: overlay.layout,
    style: overlay.style,
  }));

  const packedSoundboards = await Promise.all(
    mapSoundboardsToSequence(
      state.soundboards,
      state.keepSegments,
      state.timelineVideos,
    ).map(async (clip) => ({
      sequenceStart: clip.sequenceStart,
      sequenceEnd: clip.sequenceEnd,
      src: await resolveAudioSrcForExport(clip.src),
      volume: clip.volume,
    })),
  );

  return {
    clipId: state.clipId,
    keepSegments: state.keepSegments.map(({ start, end, speed }) => ({
      start,
      end,
      ...(speed !== undefined && speed !== DEFAULT_SEGMENT_SPEED
        ? { speed }
        : {}),
    })),
    layout: state.layout,
    subtitleTiming: state.subtitleTiming,
    zoomEffects: packedZoomEffects,
    imageOverlays: packedImageOverlays,
    textOverlays: packedTextOverlays,
    soundboards: packedSoundboards,
    timelineVideos: state.timelineVideos.map((clip) => ({
      instanceId: clip.id,
      clipId: clip.clipId,
      sequenceStart: clip.sequenceStart,
      duration: clip.duration,
      sequenceDuration: getTimelineVideoSequenceDuration(clip),
      sourceStart: clip.sourceStart,
      layoutMode: clip.layoutMode,
      importKind: clip.importKind,
      naturalInsertStart: clip.naturalInsertStart,
      ...(clip.speed !== undefined ? { speed: clip.speed } : {}),
    })),
    previewContainerWidth: state.previewContainerWidth,
    subtitleWords:
      state.subtitleWords.length > 0
        ? state.subtitleWords.map((word) => ({
            id: word.id,
            text: word.text,
            start: word.start,
            end: word.end,
          }))
        : undefined,
    subtitleStyle:
      state.subtitleWords.length > 0
        ? toExportSubtitleStyle(
            state.subtitleStyle,
            state.subtitleLayout,
            state.previewContainerWidth,
          )
        : undefined,
  };
}

/** @deprecated Utiliser buildClipExportPayloadAsync pour l'export complet. */
export function buildClipExportPayload() {
  const state = useClipEditorStore.getState();

  return {
    clipId: state.clipId,
    keepSegments: state.keepSegments.map(({ start, end, speed }) => ({
      start,
      end,
      ...(speed !== undefined && speed !== DEFAULT_SEGMENT_SPEED
        ? { speed }
        : {}),
    })),
    layout: state.layout,
    subtitleTiming: state.subtitleTiming,
    zoomEffects: mapZoomEffectsToSequence(
      state.zoomEffects,
      state.keepSegments,
      state.timelineVideos,
    ).map(
      (effect) => ({
        sequenceStart: effect.sequenceStart,
        sequenceEnd: effect.sequenceEnd,
        zone: effect.zone,
      }),
    ),
    textOverlays: mapTextOverlaysToSequence(
      state.textOverlays,
      state.keepSegments,
      state.timelineVideos,
    ).map((overlay) => ({
      sequenceStart: overlay.sequenceStart,
      sequenceEnd: overlay.sequenceEnd,
      text: overlay.text,
      layout: overlay.layout,
      style: overlay.style,
    })),
    previewContainerWidth: state.previewContainerWidth,
    subtitleWords:
      state.subtitleWords.length > 0
        ? state.subtitleWords.map((word) => ({
            id: word.id,
            text: word.text,
            start: word.start,
            end: word.end,
          }))
        : undefined,
    subtitleStyle:
      state.subtitleWords.length > 0
        ? toExportSubtitleStyle(
            state.subtitleStyle,
            state.subtitleLayout,
            state.previewContainerWidth,
          )
        : undefined,
  };
}
