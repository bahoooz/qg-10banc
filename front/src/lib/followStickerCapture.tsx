import { useCallback, useRef } from "react";
import { toPng } from "html-to-image";
import { createRoot } from "react-dom/client";
import { FollowStickerScaledStage } from "../components/Clips/FollowStickerScaledStage";
import type { ImageOverlayZone } from "./clipImageOverlays";
import {
  EXPORT_CANVAS_HEIGHT,
  EXPORT_CANVAS_WIDTH,
  type FollowStickerConfig,
} from "./followSticker";
import { waitForFollowStickerCaptureReady } from "./followStickerMeasure";

export type FollowStickerCaptureOptions = {
  zone: ImageOverlayZone;
  /** Sur-échantillonnage pour un rendu net à 1080p (défaut 2). */
  pixelRatio?: number;
};

function getZonePixelSize(zone: ImageOverlayZone): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(1, Math.round(zone.width * EXPORT_CANVAS_WIDTH)),
    height: Math.max(1, Math.round(zone.height * EXPORT_CANVAS_HEIGHT)),
  };
}

type CaptureStageProps = {
  config: FollowStickerConfig;
  zonePixelWidth: number;
  zonePixelHeight: number;
  pixelRatio: number;
  onCaptured: (dataUrl: string) => void;
  onError: (error: Error) => void;
};

function CaptureStage({
  config,
  zonePixelWidth,
  zonePixelHeight,
  pixelRatio,
  onCaptured,
  onError,
}: CaptureStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const capturedRef = useRef(false);

  const handleMeasured = useCallback(() => {
    void (async () => {
      if (capturedRef.current) return;

      try {
        await waitForFollowStickerCaptureReady();

        const container = containerRef.current;
        if (!container) {
          throw new Error("Impossible de monter le sticker pour l'export");
        }

        const dataUrl = await toPng(container, {
          pixelRatio,
          cacheBust: true,
          backgroundColor: "transparent",
        });

        capturedRef.current = true;
        onCaptured(dataUrl);
      } catch (error) {
        onError(
          error instanceof Error
            ? error
            : new Error("Échec de la capture du sticker follow"),
        );
      }
    })();
  }, [onCaptured, onError, pixelRatio]);

  return (
    <FollowStickerScaledStage
      config={config}
      zonePixelWidth={zonePixelWidth}
      zonePixelHeight={zonePixelHeight}
      containerRef={containerRef}
      onMeasured={handleMeasured}
    />
  );
}

/**
 * Capture le composant React Tailwind tel qu'affiché en preview,
 * dans la zone export 1080×1920 (même layout que FollowStickerOverlay).
 */
export async function captureFollowStickerToPngDataUrl(
  config: FollowStickerConfig,
  options: FollowStickerCaptureOptions,
): Promise<string> {
  const { zone, pixelRatio = 2 } = options;
  const zonePixels = getZonePixelSize(zone);

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.className = "pointer-events-none fixed opacity-0";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.zIndex = "-1";
  host.style.overflow = "visible";
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    return await new Promise<string>((resolve, reject) => {
      root.render(
        <CaptureStage
          config={config}
          zonePixelWidth={zonePixels.width}
          zonePixelHeight={zonePixels.height}
          pixelRatio={pixelRatio}
          onCaptured={(dataUrl) => resolve(dataUrl)}
          onError={(error) => reject(error)}
        />,
      );
    });
  } finally {
    root.unmount();
    host.remove();
  }
}
