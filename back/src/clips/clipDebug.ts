type ClipDebugLevel = "log" | "warn" | "error";

function shouldLog(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.CLIP_DEBUG === "true";
}

function write(
  level: ClipDebugLevel,
  scope: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!shouldLog()) return;

  const label = `[Clips][${scope}] ${message}`;
  if (data && Object.keys(data).length > 0) {
    console[level](label, data);
    return;
  }
  console[level](label);
}

export const clipDebug = {
  log: (scope: string, message: string, data?: Record<string, unknown>) =>
    write("log", scope, message, data),
  warn: (scope: string, message: string, data?: Record<string, unknown>) =>
    write("warn", scope, message, data),
  error: (scope: string, message: string, data?: Record<string, unknown>) =>
    write("error", scope, message, data),
};
