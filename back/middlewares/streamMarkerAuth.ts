import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

function readBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function safeEqualToken(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export function verifyStreamMarkerToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.STREAM_MARKER_API_TOKEN?.trim();
  if (!expected) {
    res.status(503).json({
      errorCode: "STREAM_MARKER_NOT_CONFIGURED",
      message: "API StreamMarker non configurée (STREAM_MARKER_API_TOKEN manquant)",
    });
    return;
  }

  const provided = readBearerToken(req.headers.authorization);
  if (!provided || !safeEqualToken(provided, expected)) {
    res.status(401).json({
      errorCode: "UNAUTHORIZED",
      message: "Jeton invalide",
    });
    return;
  }

  next();
}
