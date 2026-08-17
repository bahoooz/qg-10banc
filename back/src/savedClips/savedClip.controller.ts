import { NextFunction, Response } from "express";
import fs from "fs";
import { AuthRequest } from "../../middlewares/authHandler.js";
import { AppError } from "../../utils.js";
import { clipLog } from "../clips/clipDebug.js";
import { logger } from "../lib/logger.js";
import {
  createSavedClipSchema,
  listSavedClipsQuerySchema,
  updateSavedClipSchema,
} from "./savedClip.schema.js";
import {
  createSavedClipService,
  deleteSavedClipService,
  getSavedClipService,
  getSavedClipSourcePath,
  getSavedClipsStorageStatsService,
  listSavedClipsService,
  updateSavedClipService,
} from "./savedClip.service.js";

export const listSavedClips = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "USER_NOT_FOUND");

    const query = listSavedClipsQuerySchema.parse(req.query);
    clipLog.info("saved-clips", "Liste des clips enregistrés", {
      userId,
      page: query.page,
      limit: query.limit,
    });
    const result = await listSavedClipsService(userId, query.page, query.limit);
    return res.status(200).json(result);
  } catch (error) {
    clipLog.error("saved-clips", "Échec liste clips enregistrés", {
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

export const getSavedClipsStorage = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const stats = getSavedClipsStorageStatsService();
    return res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

export const getSavedClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "USER_NOT_FOUND");

    const { id } = req.params;
    if (typeof id !== "string") {
      return res.status(400).json({ message: "Identifiant invalide" });
    }

    const clip = await getSavedClipService(userId, id);
    return res.status(200).json(clip);
  } catch (error) {
    next(error);
  }
};

export const createSavedClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "USER_NOT_FOUND");

    const input = createSavedClipSchema.parse(req.body);
    clipLog.info("saved-clips", "Création clip enregistré", {
      userId,
      clipId: input.clipId,
      name: input.name,
    });
    const clip = await createSavedClipService(userId, input);

    logger.info("saved-clips", "Clip enregistré", {
      userId,
      savedClipId: clip.id,
      clipId: clip.clipId,
      name: clip.name,
    });

    return res.status(201).json({
      message: "Clip enregistré avec succès",
      clip,
    });
  } catch (error) {
    clipLog.error("saved-clips", "Échec création clip enregistré", {
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

export const updateSavedClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "USER_NOT_FOUND");

    const { id } = req.params;
    if (typeof id !== "string") {
      return res.status(400).json({ message: "Identifiant invalide" });
    }

    const input = updateSavedClipSchema.parse(req.body);
    clipLog.info("saved-clips", "Mise à jour clip enregistré", { userId, savedClipId: id });
    const clip = await updateSavedClipService(userId, id, input);

    logger.info("saved-clips", "Clip mis à jour", {
      userId,
      savedClipId: id,
      clipId: clip.clipId,
    });

    return res.status(200).json({
      message: "Clip mis à jour",
      clip,
    });
  } catch (error) {
    clipLog.error("saved-clips", "Échec mise à jour clip enregistré", {
      savedClipId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

export const deleteSavedClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "USER_NOT_FOUND");

    const { id } = req.params;
    if (typeof id !== "string") {
      return res.status(400).json({ message: "Identifiant invalide" });
    }

    await deleteSavedClipService(userId, id);

    logger.info("saved-clips", "Clip supprimé", { userId, savedClipId: id });

    return res.status(200).json({ message: "Clip supprimé" });
  } catch (error) {
    clipLog.error("saved-clips", "Échec suppression clip enregistré", {
      savedClipId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

export const downloadSavedClip = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "USER_NOT_FOUND");

    const { id } = req.params;
    if (typeof id !== "string") {
      return res.status(400).json({ message: "Identifiant invalide" });
    }

    const clip = await getSavedClipService(userId, id);
    const sourcePath = getSavedClipSourcePath(clip.clipId);

    if (!fs.existsSync(sourcePath)) {
      throw new AppError(404, "CLIP_SOURCE_NOT_FOUND", "Fichier source introuvable");
    }

    const safeName = clip.name.replace(/[^\w\s-]/g, "").trim() || "clip";
    res.download(sourcePath, `${safeName}.mp4`);
  } catch (error) {
    next(error);
  }
};
