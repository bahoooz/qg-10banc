import type { ClipImportResult } from "../../types";
import { ApiError } from "./errorMessages";

type ImportJobStartResponse = {
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

function isClipImportResult(value: unknown): value is ClipImportResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.previewUrl === "string" &&
    typeof record.sourceUrl === "string"
  );
}

function parseImportStartResponse(
  body: unknown,
  source: "upload" | "twitch",
): ImportJobStartResponse | ClipImportResult {
  if (!body || typeof body !== "object") {
    throw new ApiError("Réponse serveur invalide (corps vide)", "INVALID_IMPORT_RESPONSE");
  }

  const data = body as Record<string, unknown>;
  const jobId = data.jobId;

  if (typeof jobId === "string" && jobId.length > 0) {
    return { jobId };
  }

  if (isClipImportResult(data)) {
    return data;
  }

  throw new ApiError(
    source === "upload"
      ? "Réponse upload invalide : jobId manquant. Rebuild le backend (pnpm build:back) et redémarre PM2."
      : "Réponse import Twitch invalide : jobId manquant. Rebuild le backend (pnpm build:back) et redémarre PM2.",
    "INVALID_IMPORT_RESPONSE",
  );
}

export type {
  ImportJobStartResponse,
  ImportJobStatusResponse,
  ImportProgressHandler,
};

export {
  isClipImportResult,
  parseImportStartResponse,
  POLL_INTERVAL_MS,
  MAX_POLL_ATTEMPTS,
};
