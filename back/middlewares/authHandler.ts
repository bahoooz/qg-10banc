import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: number };
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET)
  throw new Error(
    "FATAL ERROR: La variable JWT_SECRET n'est pas définie dans le .env"
  );

export const verifySessionToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.authToken;

  if (!token) return res.status(401).json({ message: "Non authentifié" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalide" });
  }
};

export const verifyGatekeeperToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.gatekeeper_token;

  if (!token) return res.status(401).json({ message: "Accès interdit" });

  try {
    jwt.verify(token, JWT_SECRET);

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalide" });
  }
};
