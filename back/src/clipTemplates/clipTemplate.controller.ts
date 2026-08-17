import { NextFunction, Response } from "express";
import { AuthRequest } from "../../middlewares/authHandler.js";
import { AppError } from "../../utils.js";
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
    return res.status(200).json(templates);
  } catch (error) {
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
    const template = await createClipTemplateService(userId, input);

    return res.status(201).json({
      message: "Template sauvegardée avec succès",
      template,
    });
  } catch (error) {
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
    return res.status(200).json({ message: "Template supprimée" });
  } catch (error) {
    next(error);
  }
};
