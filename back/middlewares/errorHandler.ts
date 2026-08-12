import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { z, ZodError } from "zod";
import { AppError } from "../utils.js";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        errorCode: "FILE_TOO_LARGE",
        message: "Fichier trop volumineux (max 1 Go)",
      });
    }
    return res.status(400).json({
      errorCode: "UPLOAD_ERROR",
      message: err.message,
    });
  }

  if (err.message?.includes("Format vidéo non supporté")) {
    return res.status(400).json({
      errorCode: "INVALID_FILE_TYPE",
      message: err.message,
    });
  }

  // Gestion des erreurs Zod (validation de payload)
  if (err instanceof ZodError) {
    return res.status(400).json({
      errorCode: "VALIDATION_ERROR",
      message: "Données invalides",
      details: z.flattenError(err).fieldErrors,
    });
  }

  // Gestion de nos erreurs personnalisées
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      errorCode: err.errorCode,
      message: err.message,
    });
  }

  // Fallback pour les erreurs non gérées (les vrais crashs 500)
  return res.status(500).json({
    errorCode: "INTERNAL_SERVER_ERROR",
    message: "Erreur interne du serveur",
  });
};
