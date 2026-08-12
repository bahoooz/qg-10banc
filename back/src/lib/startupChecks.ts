import { execSync } from "child_process";
import ffmpeg from "fluent-ffmpeg";

type StartupCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

function checkBinary(command: string, args: string[]): StartupCheck {
  try {
    execSync(`${command} ${args.join(" ")}`, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { name: command, ok: true, detail: "disponible" };
  } catch {
    return {
      name: command,
      ok: false,
      detail: `introuvable dans le PATH — requis pour l'éditeur de clips`,
    };
  }
}

export function runStartupChecks(): void {
  const checks: StartupCheck[] = [
    checkBinary("ffmpeg", ["-version"]),
    checkBinary("ffprobe", ["-version"]),
  ];

  const failed = checks.filter((check) => !check.ok);
  for (const check of checks) {
    const icon = check.ok ? "✓" : "✗";
    console.log(`[startup] ${icon} ${check.name} : ${check.detail}`);
  }

  if (failed.length > 0) {
    const names = failed.map((check) => check.name).join(", ");
    throw new Error(
      `Dépendances système manquantes (${names}). Installe ffmpeg sur le serveur.`,
    );
  }

  ffmpeg.setFfmpegPath("ffmpeg");
  ffmpeg.setFfprobePath("ffprobe");
}
