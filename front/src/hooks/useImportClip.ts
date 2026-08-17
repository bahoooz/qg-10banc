import { useMutation } from "@tanstack/react-query";
import type { ClipImportResult } from "../../types";
import { ApiError } from "../lib/errorMessages";
import { clipDebug } from "../lib/clipDebug";
import { toast } from "sonner";
import { apiUrl } from "../lib/apiUrl";

type ImportJobResponse = {
  jobId: string;
};

type ImportJobStatusResponse = {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  phase: string;
  result: ClipImportResult | null;
  error: string | null;
};

type ImportProgressHandler = (progress: number, phase: string) => void;

const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 60 * 60 * 4;

async function parseErrorResponse(res: Response): Promise<never> {
  const errorData = await res.json().catch(() => ({}));
  throw new ApiError(
    errorData.message || "Erreur lors de l'import de la vidéo",
    errorData.errorCode,
    errorData.details,
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function pollImportJob(
  jobId: string,
  onProgress: ImportProgressHandler,
): Promise<ClipImportResult> {
  onProgress(0, "Préparation");

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await wait(POLL_INTERVAL_MS);

    const statusRes = await fetch(apiUrl(`/clips/import-jobs/${jobId}`), {
      credentials: "include",
    });

    if (!statusRes.ok) {
      await parseErrorResponse(statusRes);
    }

    const job = (await statusRes.json()) as ImportJobStatusResponse;
    onProgress(job.progress, job.phase);

    if (job.status === "completed" && job.result) {
      return job.result;
    }

    if (job.status === "completed") {
      throw new ApiError("Import terminé sans résultat disponible");
    }

    if (job.status === "failed") {
      throw new ApiError(job.error || "Échec de l'import du clip");
    }
  }

  throw new ApiError("L'import a pris trop de temps");
}

const uploadClipFile = async (
  file: File,
  onProgress: ImportProgressHandler,
): Promise<ClipImportResult> => {
  clipDebug.log("import", "upload fichier", {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(apiUrl("/clips/upload"), {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) await parseErrorResponse(res);

  const { jobId } = (await res.json()) as ImportJobResponse;
  const result = await pollImportJob(jobId, onProgress);
  clipDebug.log("import", "upload réussi", result);
  return result;
};

const importTwitchClipRequest = async (
  payload: { url: string; twitchAccountId?: string },
  onProgress: ImportProgressHandler,
): Promise<ClipImportResult> => {
  clipDebug.log("import", "import Twitch", payload);

  const res = await fetch(apiUrl("/clips/twitch"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) await parseErrorResponse(res);

  const { jobId } = (await res.json()) as ImportJobResponse;
  const result = await pollImportJob(jobId, onProgress);
  clipDebug.log("import", "import Twitch réussi", result);
  return result;
};

type UseImportClipOptions = {
  onProgress?: ImportProgressHandler;
};

export const useUploadClip = (options: UseImportClipOptions = {}) => {
  const { onProgress } = options;

  return useMutation<ClipImportResult, ApiError, File>({
    mutationFn: (file) =>
      uploadClipFile(file, onProgress ?? (() => undefined)),
    onError: (error) => toast.error(error.message),
  });
};

export const useImportTwitchClip = (options: UseImportClipOptions = {}) => {
  const { onProgress } = options;

  return useMutation<
    ClipImportResult,
    ApiError,
    { url: string; twitchAccountId?: string }
  >({
    mutationFn: (payload) =>
      importTwitchClipRequest(payload, onProgress ?? (() => undefined)),
    onError: (error) => toast.error(error.message),
  });
};
