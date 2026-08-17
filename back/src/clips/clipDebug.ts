import { logger, type LogContext } from "../lib/logger.js";

function shouldLogVerbose(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.CLIP_DEBUG === "true";
}

function write(
  level: "info" | "warn" | "error",
  scope: string,
  message: string,
  data?: LogContext,
): void {
  if (level === "info" && !shouldLogVerbose()) return;
  logger[level](`clips:${scope}`, message, data);
}

export const clipDebug = {
  log: (scope: string, message: string, data?: LogContext) =>
    write("info", scope, message, data),
  warn: (scope: string, message: string, data?: LogContext) =>
    write("warn", scope, message, data),
  error: (scope: string, message: string, data?: LogContext) =>
    write("error", scope, message, data),
};

/** Logs import/export/cut — toujours visibles en prod (pm2 logs). */
export const clipLog = {
  info: (scope: string, message: string, data?: LogContext) =>
    logger.info(`clips:${scope}`, message, data),
  warn: (scope: string, message: string, data?: LogContext) =>
    logger.warn(`clips:${scope}`, message, data),
  error: (scope: string, message: string, data?: LogContext) =>
    logger.error(`clips:${scope}`, message, data),
};
