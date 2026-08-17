import { NextFunction, Response } from "express";
import { AuthRequest } from "../../middlewares/authHandler.js";
import { AppError } from "../../utils.js";
import { clipLog } from "../clips/clipDebug.js";
import {
  createClipTemplateSchema,
} from "./clipTemplate.schema.js";
import {
  createClipTemplateService,
  deleteClipTemplateService,
  getClipTemplateService,
  listClipTemplatesService,
} from "./clipTemplate.service.js";

export const listClipTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "USER_NOT_FOUND");

    const templates = await listClipTemplatesService(userId);
    clipLog.info("clip-templates", "Liste templates", { userId, count: templates.length });
    return res.status(200).json(templates);
  } catch (error) {
    clipLog.error("clip-templates", "Échec liste templates", {
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

export const getClipTemplate = async (
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

    const template = await getClipTemplateService(userId, id);
    return res.status(200).json(template);
  } catch (error) {
    next(error);
  }
};

export const createClipTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "USER_NOT_FOUND");

    const input = createClipTemplateSchema.parse(req.body);
    clipLog.info("clip-templates", "Création template", { userId, name: input.name });
    const template = await createClipTemplateService(userId, input);

    return res.status(201).json({
      message: "Template sauvegardée avec succès",
      template,
    });
  } catch (error) {
    clipLog.error("clip-templates", "Échec création template", {
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};

export const deleteClipTemplate = async (
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

    await deleteClipTemplateService(userId, id);
    clipLog.info("clip-templates", "Template supprimée", { userId, templateId: id });
    return res.status(200).json({ message: "Template supprimée" });
  } catch (error) {
    clipLog.error("clip-templates", "Échec suppression template", {
      templateId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
};
