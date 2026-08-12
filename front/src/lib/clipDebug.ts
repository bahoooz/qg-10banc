const PREFIX = "[ClipEditor]";

type ClipDebugLevel = "debug" | "warn" | "error";

function shouldLog(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_CLIP_DEBUG === "true";
}

function log(
  level: ClipDebugLevel,
  scope: string,
  message: string,
  data?: unknown,
): void {
  if (!shouldLog()) return;

  const label = `${PREFIX}[${scope}] ${message}`;
  if (data !== undefined) {
    console[level](label, data);
    return;
  }
  console[level](label);
}

export const clipDebug = {
  log: (scope: string, message: string, data?: unknown) =>
    log("debug", scope, message, data),
  warn: (scope: string, message: string, data?: unknown) =>
    log("warn", scope, message, data),
  error: (scope: string, message: string, data?: unknown) =>
    log("error", scope, message, data),
};
