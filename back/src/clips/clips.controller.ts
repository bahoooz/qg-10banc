import { NextFunction, Response } from "express";
import { AuthRequest } from "../../middlewares/authHandler.js";
import { AppError } from "../../utils.js";
import { clipLog } from "./clipDebug.js";
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

function getUserId(req: AuthRequest): number | undefined {
  return req.user?.id;
}

export const uploadClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      throw new AppError(400, "NO_FILE", "Aucun fichier vidéo reçu");
    }

    assertClipsStorageQuota(req.file.size * 2);

    const job = createImportJob();
    clipLog.info("import", "Upload démarré", {
      jobId: job.id,
      userId: getUserId(req),
      fileName: req.file.originalname,
      sizeBytes: req.file.size,
    });

    void runImportUploadJob(job.id, req.file.path, req.file.originalname).catch(
      (error: unknown) => {
        clipLog.error("import", "Job upload crashé", {
          jobId: job.id,
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );

    return res.status(202).json({ jobId: job.id });
  } catch (error) {
    clipLog.error("import", "Échec initialisation upload", {
      userId: getUserId(req),
      message: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

export const importTwitchClipHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { url, twitchAccountId } = twitchClipImportSchema.parse(req.body);
    const job = createImportJob();

    clipLog.info("import", "Import Twitch démarré", {
      jobId: job.id,
      userId: getUserId(req),
      url,
      twitchAccountId,
    });

    void runImportTwitchJob(job.id, url, twitchAccountId).catch(
      (error: unknown) => {
        clipLog.error("import", "Job Twitch crashé", {
          jobId: job.id,
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );

    return res.status(202).json({ jobId: job.id });
  } catch (error) {
    clipLog.error("import", "Échec initialisation import Twitch", {
      userId: getUserId(req),
      message: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

export const getImportClipJob = async (
  req: AuthRequest,
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
      clipLog.warn("import", "Job introuvable (poll)", {
        jobId,
        userId: getUserId(req),
      });
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
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new AppError(400, "INVALID_CLIP_ID", "Identifiant de clip invalide");
    }

    const { keepSegments } = clipCutSchema.parse(req.body);
    clipLog.info("cut", "Découpage demandé", {
      clipId: id,
      userId: getUserId(req),
      segmentCount: keepSegments.length,
    });

    const result = await applyClipCutService(id, keepSegments);

    clipLog.info("cut", "Découpage terminé", {
      clipId: id,
      userId: getUserId(req),
    });

    return res.status(200).json(result);
  } catch (error) {
    clipLog.error("cut", "Échec découpage", {
      clipId: req.params.id,
      userId: getUserId(req),
      message: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

export const exportClip = async (
  req: AuthRequest,
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

    clipLog.info("export", "Export démarré", {
      jobId: job.id,
      clipId: id,
      userId: getUserId(req),
    });

    void runExportJob(job.id, id, payload).catch((error: unknown) => {
      clipLog.error("export", "Job export crashé", {
        jobId: job.id,
        clipId: id,
        message: error instanceof Error ? error.message : String(error),
      });
    });

    return res.status(202).json({ jobId: job.id });
  } catch (error) {
    clipLog.error("export", "Échec initialisation export", {
      clipId: req.params.id,
      userId: getUserId(req),
      message: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

export const getExportClipJob = async (
  req: AuthRequest,
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
      clipLog.warn("export", "Job introuvable (poll)", {
        jobId,
        userId: getUserId(req),
      });
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
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new AppError(400, "INVALID_CLIP_ID", "Identifiant de clip invalide");
    }

    const payload = transcribeClipSchema.safeParse(req.body ?? {});

    clipLog.info("transcribe", "Transcription demandée", {
      clipId: id,
      userId: getUserId(req),
      hasKeepSegments: payload.success && Boolean(payload.data.keepSegments?.length),
      timelineVideoCount:
        payload.success ? (payload.data.timelineVideos?.length ?? 0) : 0,
    });

    const result = await transcribeClipService(id, {
      keepSegments: payload.success ? payload.data.keepSegments : undefined,
      timelineVideos: payload.success ? payload.data.timelineVideos : undefined,
    });

    clipLog.info("transcribe", "Transcription terminée", {
      clipId: id,
      userId: getUserId(req),
      wordCount: result.words.length,
    });

    return res.status(200).json(result);
  } catch (error) {
    clipLog.error("transcribe", "Échec transcription", {
      clipId: req.params.id,
      userId: getUserId(req),
      message: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};
