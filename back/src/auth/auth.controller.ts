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
  try {
    const { password } = req.body;

    // VERIFY PASSWORD AND GENERATE TOKEN
    const token = await verifyAndTokenGatekeeperService(password);

    const sevenDaysInMs = 1000 * 60 * 60 * 24 * 7;

    res.cookie("gatekeeper_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: sevenDaysInMs,
    });

    return res.status(200).json({ success: true, message: "Accès approuvé" });
  } catch (error) {
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
