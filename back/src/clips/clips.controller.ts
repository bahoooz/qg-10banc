import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils.js";
import {
  clipCutSchema,
  clipExportSchema,
  twitchClipImportSchema,
} from "./clips.schema.js";
import {
  applyClipCutService,
  importTwitchClip,
  importUploadedClip,
  runExportJob,
} from "./clips.service.js";
import {
  createExportJob,
  getExportJob,
} from "./clipExportJobs.js";
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

    const result = await importUploadedClip(req.file.path, req.file.originalname);
    return res.status(201).json(result);
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
    const result = await importTwitchClip(url, twitchAccountId);
    return res.status(201).json(result);
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

    const result = await transcribeClipService(id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
