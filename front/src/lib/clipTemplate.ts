import type { ClipLayoutState } from "./clipLayout";
import type { ImageOverlayZone } from "./clipImageOverlays";
import type { TextOverlayStyle } from "./clipTextOverlays";
import type {
  SubtitleLayout,
  SubtitleStyle,
  SubtitleTiming,
} from "./clipSubtitles";
import type { FollowStickerPlatform } from "./followSticker";
import type { TextOverlay } from "./clipTextOverlays";
import type { ImageOverlay } from "./clipImageOverlays";

export type ClipTemplatePayloadV1 = {
  version: 1;
  layout: ClipLayoutState;
  montage: {
    firstTextOverlay: {
      text: string;
      style: TextOverlayStyle;
      layout: SubtitleLayout;
    } | null;
    followSticker: {
      username: string;
      platform: FollowStickerPlatform;
      zone: ImageOverlayZone;
      /** Temps séquence (début) sur la timeline étendue. */
      sequenceStart: number;
      /** Temps séquence (fin) sur la timeline étendue. */
      sequenceEnd: number;
    } | null;
  };
  subtitles: {
    style: SubtitleStyle;
    layout: SubtitleLayout;
    timing: SubtitleTiming;
    previewContainerWidth: number;
  };
};

function getFirstByStart<T extends { start: number }>(
  items: T[],
): T | undefined {
  if (items.length === 0) return undefined;
  return [...items].sort((a, b) => a.start - b.start)[0];
}

export function buildClipTemplatePayloadFromState(
  state: {
    layout: ClipLayoutState;
    textOverlays: TextOverlay[];
    imageOverlays: ImageOverlay[];
    subtitleStyle: SubtitleStyle;
    subtitleLayout: SubtitleLayout;
    subtitleTiming: SubtitleTiming;
    previewContainerWidth: number;
  },
): ClipTemplatePayloadV1 {
  const firstText = getFirstByStart(state.textOverlays);
  const firstSticker = getFirstByStart(
    state.imageOverlays.filter((overlay) => overlay.sticker),
  );

  return {
    version: 1,
    layout: {
      camShape: state.layout.camShape,
      sourceCam: { ...state.layout.sourceCam },
      verticalCam: { ...state.layout.verticalCam },
      verticalCamZone: { ...state.layout.verticalCamZone },
      verticalCropPan: state.layout.verticalCropPan,
    },
    montage: {
      firstTextOverlay: firstText
        ? {
            text: firstText.text,
            style: { ...firstText.style },
            layout: { ...firstText.layout },
          }
        : null,
      followSticker: firstSticker?.sticker
        ? {
            username: firstSticker.sticker.username,
            platform: firstSticker.sticker.platform,
            zone: { ...firstSticker.zone },
            sequenceStart: firstSticker.start,
            sequenceEnd: firstSticker.end,
          }
        : null,
    },
    subtitles: {
      style: { ...state.subtitleStyle },
      layout: { ...state.subtitleLayout },
      timing: { ...state.subtitleTiming },
      previewContainerWidth: state.previewContainerWidth,
    },
  };
}

export type ClipTemplateListItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ClipTemplateDetail = ClipTemplateListItem & {
  payload: ClipTemplatePayloadV1;
};

export type CreateClipTemplateInput = {
  name: string;
  payload: ClipTemplatePayloadV1;
};
