import { randomUUID } from "crypto";
import type { ClipExportResult } from "./clips.service.js";
import { clipLog } from "./clipDebug.js";

export type ExportJobStatus = "pending" | "running" | "completed" | "failed";

export type ExportJob = {
  id: string;
  clipId: string;
  status: ExportJobStatus;
  progress: number;
  phase: string;
  result: ClipExportResult | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

const exportJobs = new Map<string, ExportJob>();

const JOB_TTL_MS = 60 * 60 * 1000;

function pruneOldJobs(): void {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of exportJobs) {
    if (job.updatedAt < cutoff) {
      exportJobs.delete(id);
    }
  }
}

export function createExportJob(clipId: string): ExportJob {
  pruneOldJobs();

  const job: ExportJob = {
    id: randomUUID(),
    clipId,
    status: "pending",
    progress: 0,
    phase: "Préparation",
    result: null,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  exportJobs.set(job.id, job);
  clipLog.info("export", "Job créé", { jobId: job.id, clipId });
  return job;
}

export function getExportJob(jobId: string): ExportJob | undefined {
  return exportJobs.get(jobId);
}

export function updateExportJob(
  jobId: string,
  patch: Partial<Pick<ExportJob, "status" | "progress" | "phase" | "result" | "error">>,
): ExportJob | undefined {
  const job = exportJobs.get(jobId);
  if (!job) return undefined;

  const next: ExportJob = {
    ...job,
    ...patch,
    progress:
      patch.progress !== undefined
        ? Math.max(0, Math.min(100, Math.round(patch.progress)))
        : job.progress,
    updatedAt: Date.now(),
  };

  exportJobs.set(jobId, next);

  if (patch.status === "failed" || patch.status === "completed") {
    clipLog.info("export", `Job ${patch.status}`, {
      jobId,
      clipId: next.clipId,
      progress: next.progress,
      error: next.error,
    });
  }

  return next;
}
