import { useMutation } from "@tanstack/react-query";
import type { ClipExportResult } from "../../types";
import type { ClipLayoutState } from "../lib/clipLayout";
import type { SubtitleTiming } from "../lib/clipSubtitles";
import { ApiError } from "../lib/errorMessages";
import { clipDebug } from "../lib/clipDebug";
import { useClipEditorStore } from "../stores/clipEditorStore";
import { toast } from "sonner";
import { apiUrl } from "../lib/apiUrl";

type SubtitleWordPayload = {
  id: string;
  text: string;
  start: number;
  end: number;
};

type ClipExportPayload = {
  clipId: string;
  keepSegments: { start: number; end: number }[];
  previewContainerWidth?: number;
  layout?: ClipLayoutState;
  subtitleTiming?: SubtitleTiming;
  zoomEffects?: {
    sequenceStart: number;
    sequenceEnd: number;
    zone: { x: number; y: number; width: number; height: number };
  }[];
  imageOverlays?: {
    sequenceStart: number;
    sequenceEnd: number;
    src: string;
    zone: { x: number; y: number; width: number; height: number };
  }[];
  textOverlays?: {
    sequenceStart: number;
    sequenceEnd: number;
    text: string;
    layout: { x: number; y: number; scale: number };
    style: {
      fontId?: string;
      animation?: "pop" | "bounce" | "fade" | "scale";
      fillColor: string;
      strokeColor: string;
      strokeWidth: number;
      glowColor?: string;
      glowIntensity?: number;
      glowSpread?: number;
      letterSpacing?: number;
    };
  }[];
  timelineVideos?: {
    clipId: string;
    sequenceStart: number;
    duration: number;
    sequenceDuration?: number;
    sourceStart?: number;
    layoutMode: "base" | "center-crop";
    importKind?: "meme" | "clip";
    naturalInsertStart?: number;
  }[];
  soundboards?: {
    sequenceStart: number;
    sequenceEnd: number;
    src: string;
    volume: number;
  }[];
  subtitleWords?: SubtitleWordPayload[];
  subtitleStyle?: {
    preset: "word-pop" | "word-pop-accent";
    fontFamily: string;
    fontSize: number;
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    position: "center" | "lower";
    animation?: "pop" | "bounce" | "fade" | "scale";
    glowColor?: string;
    glowIntensity?: number;
    glowSpread?: number;
    layoutX?: number;
    layoutY?: number;
  };
};

type ExportJobResponse = {
  jobId: string;
};

type ExportJobStatusResponse = {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  phase: string;
  result: ClipExportResult | null;
  error: string | null;
};

type UseExportClipOptions = {
  openDownload?: boolean;
};

const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 60 * 60 * 4;

async function parseErrorResponse(res: Response): Promise<never> {
  const errorData = await res.json().catch(() => ({}));
  throw new ApiError(
    errorData.message || "Erreur lors de l'export du clip",
    errorData.errorCode,
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const exportClipRequest = async (
  payload: ClipExportPayload,
  onProgress: (
    progress: number,
    phase: string,
    result?: ClipExportResult | null,
  ) => void,
): Promise<ClipExportResult> => {
  clipDebug.log("export", "requête export", {
    clipId: payload.clipId,
    keepSegments: payload.keepSegments,
    subtitleCount: payload.subtitleWords?.length ?? 0,
  });

  const startRes = await fetch(
    apiUrl(`/clips/${payload.clipId}/export`),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keepSegments: payload.keepSegments,
        previewContainerWidth: payload.previewContainerWidth,
        layout: payload.layout,
        subtitleTiming: payload.subtitleTiming,
        zoomEffects: payload.zoomEffects,
        imageOverlays: payload.imageOverlays,
        textOverlays: payload.textOverlays,
        timelineVideos: payload.timelineVideos,
        soundboards: payload.soundboards,
        subtitleWords: payload.subtitleWords,
        subtitleStyle: payload.subtitleStyle,
      }),
    },
  );

  if (!startRes.ok) {
    await parseErrorResponse(startRes);
  }

  const startBody = (await startRes.json()) as ExportJobResponse;
  const jobId = startBody.jobId;

  if (typeof jobId !== "string" || jobId.length === 0) {
    throw new ApiError(
      "Réponse export invalide : jobId manquant. Rebuild le backend (pnpm build:back) et redémarre PM2.",
      "INVALID_EXPORT_RESPONSE",
    );
  }

  onProgress(0, "Préparation");

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await wait(POLL_INTERVAL_MS);

    const statusRes = await fetch(
      apiUrl(`/clips/export-jobs/${jobId}`),
      { credentials: "include" },
    );

    if (!statusRes.ok) {
      await parseErrorResponse(statusRes);
    }

    const job = (await statusRes.json()) as ExportJobStatusResponse;
    onProgress(job.progress, job.phase, job.result);

    if (job.status === "completed" && job.result) {
      return job.result;
    }

    if (job.status === "completed") {
      throw new ApiError("Export terminé sans fichier disponible");
    }

    if (job.status === "failed") {
      throw new ApiError(job.error || "Échec de l'export du clip");
    }

    if (job.progress >= 100) {
      await wait(150);
      continue;
    }
  }

  throw new ApiError("L'export a pris trop de temps");
};

export const useExportClip = (options: UseExportClipOptions = {}) => {
  const { openDownload = true } = options;
  const setIsExporting = useClipEditorStore((s) => s.setIsExporting);
  const setExportResult = useClipEditorStore((s) => s.setExportResult);
  const setExportProgress = useClipEditorStore((s) => s.setExportProgress);

  return useMutation<ClipExportResult, ApiError, ClipExportPayload>({
    mutationFn: (payload) =>
      exportClipRequest(payload, (progress, phase, result) => {
        setExportProgress(progress, phase);
        if (result) {
          setExportResult(result);
          setIsExporting(false);
        }
      }),
    onMutate: () => {
      setIsExporting(true);
      setExportProgress(0, "Préparation");
    },
    onSuccess: (result) => {
      setExportResult(result);
      clipDebug.log("export", "export réussi", result);
      toast.success("Clip exporté — prêt pour la publication");
      if (openDownload) {
        window.open(result.exportUrl, "_blank", "noopener,noreferrer");
      }
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setIsExporting(false),
  });
};
