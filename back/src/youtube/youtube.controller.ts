import { NextFunction, Response } from "express";
import { AuthRequest } from "../../middlewares/authHandler.js";
import { AppError } from "../../utils.js";
import { publishYouTubeVideoSchema } from "./youtube.schema.js";
import {
  generateAuthUrl,
  handleAuthCallback,
  publishYouTubeVideoService,
} from "./youtube.service.js";
import { prisma } from "../lib/prisma.js";
import { getFrontendUrl } from "../config/env.js";
import { FRONTEND_ROUTES } from "../lib/frontendRoutes.js";

export const login = (_req: AuthRequest, res: Response) => {
  try {
    const url = generateAuthUrl();
    res.redirect(url);
  } catch (error) {
    console.error("Erreur de login YouTube : ", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la génération du lien de connexion" });
  }
};

export const callback = async (req: AuthRequest, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code d'authentification manquant" });
  }

  try {
    const channel = await handleAuthCallback(code);

    console.log(`✅ Chaîne connectée : ${channel.title}`);
    const frontendUrl = getFrontendUrl();
    res.redirect(
      `${frontendUrl}${FRONTEND_ROUTES.editorClips}?social=youtube&status=connected&channel=${encodeURIComponent(channel.title ?? "")}`,
    );
  } catch (error) {
    console.error("Erreur callback YouTube : ", error);
    const frontendUrl = getFrontendUrl();
    res.redirect(`${frontendUrl}${FRONTEND_ROUTES.editorClips}?social=youtube&status=error`);
  }
};

export const listYouTubeAccounts = async (_req: AuthRequest, res: Response) => {
  try {
    const accounts = await prisma.youTubeAccount.findMany({
      select: {
        id: true,
        channelId: true,
        title: true,
        avatar: true,
        customUrl: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ success: true, accounts });
  } catch (error) {
    console.error("Erreur liste YouTube:", error);
    res.status(500).json({ error: "Impossible de lister les comptes YouTube" });
  }
};

export const publishYouTubeVideo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError(401, "USER_NOT_FOUND");

    const input = publishYouTubeVideoSchema.parse(req.body);
    const result = await publishYouTubeVideoService(input);

    return res.status(201).json({
      message: "Short publié sur YouTube",
      result,
    });
  } catch (error) {
    next(error);
  }
};
