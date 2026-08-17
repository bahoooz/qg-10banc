import { randomUUID } from "crypto";
import type { ClipImportResult } from "./clips.service.js";
import { clipLog } from "./clipDebug.js";

export type ImportJobStatus = "pending" | "running" | "completed" | "failed";

export type ImportJob = {
  id: string;
  status: ImportJobStatus;
  progress: number;
  phase: string;
  result: ClipImportResult | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

const importJobs = new Map<string, ImportJob>();

const JOB_TTL_MS = 60 * 60 * 1000;

function pruneOldJobs(): void {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of importJobs) {
    if (job.updatedAt < cutoff) {
      importJobs.delete(id);
    }
  }
}

export function createImportJob(): ImportJob {
  pruneOldJobs();

  const job: ImportJob = {
    id: randomUUID(),
    status: "pending",
    progress: 0,
    phase: "Préparation",
    result: null,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  importJobs.set(job.id, job);
  clipLog.info("import", "Job créé", { jobId: job.id });
  return job;
}

export function getImportJob(jobId: string): ImportJob | undefined {
  return importJobs.get(jobId);
}

export function updateImportJob(
  jobId: string,
  patch: Partial<
    Pick<ImportJob, "status" | "progress" | "phase" | "result" | "error">
  >,
): ImportJob | undefined {
  const job = importJobs.get(jobId);
  if (!job) return undefined;

  const next: ImportJob = {
    ...job,
    ...patch,
    progress:
      patch.progress !== undefined
        ? Math.max(0, Math.min(100, Math.round(patch.progress)))
        : job.progress,
    updatedAt: Date.now(),
  };

  importJobs.set(jobId, next);

  if (patch.status === "failed" || patch.status === "completed") {
    clipLog.info("import", `Job ${patch.status}`, {
      jobId,
      progress: next.progress,
      phase: next.phase,
      error: next.error,
      clipId: next.result?.id,
    });
  }

  return next;
}
