import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils.js";
import { assertClipsStorageQuota } from "./clipsStorage.service.js";
import {
  clipCutSchema,
  clipExportSchema,
  transcribeClipSchema,
  twitchClipImportSchema,
} from "./clips.schema.js";
import {
  applyClipCutService,
  runImportTwitchJob,
  runImportUploadJob,
  runExportJob,
} from "./clips.service.js";
import {
  createExportJob,
  getExportJob,
} from "./clipExportJobs.js";
import {
  createImportJob,
  getImportJob,
} from "./clipImportJobs.js";
import { transcribeClipService } from "./transcribe.service.js";

export const uploadClip = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      throw new AppError(400, "NO_FILE", "Aucun fichier vidéo reçu");
    }

    assertClipsStorageQuota(req.file.size * 2);

    const job = createImportJob();
    void runImportUploadJob(job.id, req.file.path, req.file.originalname);

    return res.status(202).json({ jobId: job.id });
  } catch (error) {
    next(error);
  }
};

export const importTwitchClipHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { url, twitchAccountId } = twitchClipImportSchema.parse(req.body);
    const job = createImportJob();
    void runImportTwitchJob(job.id, url, twitchAccountId);

    return res.status(202).json({ jobId: job.id });
  } catch (error) {
    next(error);
  }
};

export const getImportClipJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { jobId } = req.params;
    if (!jobId || typeof jobId !== "string") {
      throw new AppError(400, "INVALID_JOB_ID", "Identifiant de job invalide");
    }

    const job = getImportJob(jobId);
    if (!job) {
      throw new AppError(404, "IMPORT_JOB_NOT_FOUND", "Import introuvable");
    }

    return res.status(200).json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      phase: job.phase,
      result: job.result,
      error: job.error,
    });
  } catch (error) {
    next(error);
  }
};

export const applyClipCut = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new AppError(400, "INVALID_CLIP_ID", "Identifiant de clip invalide");
    }

    const { keepSegments } = clipCutSchema.parse(req.body);
    const result = await applyClipCutService(id, keepSegments);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const exportClip = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new AppError(400, "INVALID_CLIP_ID", "Identifiant de clip invalide");
    }

    const payload = clipExportSchema.parse(req.body);
    const job = createExportJob(id);

    void runExportJob(job.id, id, payload);

    return res.status(202).json({ jobId: job.id });
  } catch (error) {
    next(error);
  }
};

export const getExportClipJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { jobId } = req.params;
    if (!jobId || typeof jobId !== "string") {
      throw new AppError(400, "INVALID_JOB_ID", "Identifiant de job invalide");
    }

    const job = getExportJob(jobId);
    if (!job) {
      throw new AppError(404, "EXPORT_JOB_NOT_FOUND", "Export introuvable");
    }

    return res.status(200).json({
      jobId: job.id,
      clipId: job.clipId,
      status: job.status,
      progress: job.progress,
      phase: job.phase,
      result: job.result,
      error: job.error,
    });
  } catch (error) {
    next(error);
  }
};

export const transcribeClip = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new AppError(400, "INVALID_CLIP_ID", "Identifiant de clip invalide");
    }

    const payload = transcribeClipSchema.safeParse(req.body ?? {});
    const result = await transcribeClipService(id, {
      keepSegments: payload.success ? payload.data.keepSegments : undefined,
      timelineVideos: payload.success ? payload.data.timelineVideos : undefined,
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
