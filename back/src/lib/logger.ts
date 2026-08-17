type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function serializeContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) return "";
  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return " [context non sérialisable]";
  }
}

function write(level: LogLevel, scope: string, message: string, context?: LogContext): void {
  const line = `[${scope}] ${message}${serializeContext(context)}`;

  switch (level) {
    case "info":
      console.log(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export const logger = {
  info: (scope: string, message: string, context?: LogContext) =>
    write("info", scope, message, context),
  warn: (scope: string, message: string, context?: LogContext) =>
    write("warn", scope, message, context),
  error: (scope: string, message: string, context?: LogContext) =>
    write("error", scope, message, context),
};

export type { LogContext };
