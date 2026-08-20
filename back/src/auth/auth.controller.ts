import { NextFunction, Request, Response } from "express";
import {
  checkGatekeeperService,
  checkLoginService,
  createUserService,
  getSessionService,
  heartbeatService,
  loginService,
  verifyAndTokenGatekeeperService,
} from "./auth.service.js";
import { loginSchema, signupSchema } from "../../schemas/authSchema.js";
import { AuthRequest } from "../../middlewares/authHandler.js";
import { AppError } from "../../utils.js";
import { logger } from "../lib/logger.js";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = signupSchema.parse(req.body);

    const newUser = await createUserService(validatedData);

    return res
      .status(201)
      .json({ message: "Compte créé avec succès", user: newUser });
  } catch (error: any) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const { token, user } = await loginService(validatedData);

    const oneDay = 1000 * 60 * 60 * 24;

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: oneDay,
    });

    return res.status(200).json({
      message: "Connexion réussie",
      user: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const userSession = await getSessionService(userId);

    return res
      .status(200)
      .json({ message: "Session récupéré avec succès", user: userSession });
  } catch (error) {
    next(error);
  }
};

export const verifyPasswordAndLoginGatekeeper = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const provided =
    typeof req.body?.password === "string" ? req.body.password.trim() : "";

  try {
    if (!provided) {
      logger.warn("auth", "Gatekeeper — mot de passe absent", {
        path: req.originalUrl,
        ip: req.ip,
      });
      throw new AppError(400, "VALIDATION_ERROR", "Mot de passe requis");
    }

    const token = await verifyAndTokenGatekeeperService(provided);

    const sevenDaysInMs = 1000 * 60 * 60 * 24 * 7;

    res.cookie("gatekeeper_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: sevenDaysInMs,
    });

    logger.info("auth", "Gatekeeper — accès approuvé", {
      path: req.originalUrl,
      ip: req.ip,
    });

    return res.status(200).json({ success: true, message: "Accès approuvé" });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      const configuredLength =
        process.env.GATEKEEPER_PASSWORD?.trim().length ?? 0;
      logger.warn("auth", "Gatekeeper — mot de passe refusé", {
        path: req.originalUrl,
        ip: req.ip,
        providedLength: provided.length,
        configuredLength,
        hint:
          configuredLength === 0
            ? "GATEKEEPER_PASSWORD absent du .env"
            : "Vérifie GATEKEEPER_PASSWORD et redémarre le back après modification du .env",
      });
    }
    next(error);
  }
};

export const checkGatekeeper = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies.gatekeeper_token;

  if (!token)
    return res.status(401).json({ authorized: false, error: "Pas de token" });

  try {
    checkGatekeeperService(token);

    return res.status(200).json({ authorized: true });
  } catch (error) {
    next(error);
  }
};

export const checkLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies.authToken;

  if (!token)
    return res.status(401).json({ authorized: false, error: "Pas de token" });

  try {
    checkLoginService(token);
    return res.status(200).json({ authorized: true });
  } catch (error) {
    next(error);
  }
};

export const heartbeat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Non autorisé" });

    await heartbeatService(userId);

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    next(error);
  }
};
