import fs from "fs";
import path from "path";
import {
  CLIPS_DIR,
  CLIPS_EXPORTS_DIR,
  CLIPS_PREVIEWS_DIR,
  CLIPS_SOURCES_DIR,
  CLIPS_TEMP_DIR,
  CLIPS_SAVED_RETENTION_MS,
  CLIPS_STORAGE_QUOTA_BYTES,
} from "../lib/paths.js";
import { getPreviewPath } from "../clips/ffmpeg.service.js";
import { AppError } from "../../utils.js";

const CLIPS_STORAGE_DIRS = [
  CLIPS_SOURCES_DIR,
  CLIPS_PREVIEWS_DIR,
  CLIPS_EXPORTS_DIR,
] as const;

function getFileSizeIfExists(filePath: string): number {
  try {
    if (!fs.existsSync(filePath)) return 0;
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function getDirectorySizeRecursive(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;

  let total = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getDirectorySizeRecursive(fullPath);
    } else if (entry.isFile()) {
      total += getFileSizeIfExists(fullPath);
    }
  }

  return total;
}

export function getClipsStorageUsageBytes(): number {
  return CLIPS_STORAGE_DIRS.reduce(
    (sum, dir) => sum + getDirectorySizeRecursive(dir),
    0,
  );
}

export function getClipsStorageStats(): {
  usedBytes: number;
  quotaBytes: number;
  usedPercent: number;
} {
  const usedBytes = getClipsStorageUsageBytes();
  const usedPercent = Math.min(
    100,
    Math.round((usedBytes / CLIPS_STORAGE_QUOTA_BYTES) * 1000) / 10,
  );

  return {
    usedBytes,
    quotaBytes: CLIPS_STORAGE_QUOTA_BYTES,
    usedPercent,
  };
}

export function assertClipsStorageQuota(additionalBytes: number): void {
  const usedBytes = getClipsStorageUsageBytes();
  if (usedBytes + additionalBytes > CLIPS_STORAGE_QUOTA_BYTES) {
    const usedGb = (usedBytes / (1024 ** 3)).toFixed(1);
    throw new AppError(
      507,
      "CLIPS_STORAGE_FULL",
      `Espace clips saturé (${usedGb} Go / 100 Go). Supprime des clips enregistrés pour libérer de la place.`,
    );
  }
}

export function getClipDiskFilePaths(clipId: string): string[] {
  const paths = [
    path.join(CLIPS_SOURCES_DIR, `${clipId}.mp4`),
    getPreviewPath(clipId, CLIPS_PREVIEWS_DIR),
  ];

  if (fs.existsSync(CLIPS_EXPORTS_DIR)) {
    const exportFiles = fs
      .readdirSync(CLIPS_EXPORTS_DIR)
      .filter((name) => name.startsWith(`${clipId}_`) || name.startsWith(clipId));
    for (const name of exportFiles) {
      paths.push(path.join(CLIPS_EXPORTS_DIR, name));
    }
  }

  return paths;
}

export function deleteClipDiskFiles(clipId: string): void {
  for (const filePath of getClipDiskFilePaths(clipId)) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export function getClipDiskUsageBytes(clipId: string): number {
  return getClipDiskFilePaths(clipId).reduce(
    (sum, filePath) => sum + getFileSizeIfExists(filePath),
    0,
  );
}

export function ensureClipsStorageDirectory(): void {
  if (!fs.existsSync(CLIPS_DIR)) {
    fs.mkdirSync(CLIPS_DIR, { recursive: true });
  }
}

export function purgeStaleClipArtifacts(maxAgeMs = 24 * 60 * 60 * 1000): number {
  const now = Date.now();
  let removed = 0;

  const tryRemove = (targetPath: string): void => {
    try {
      if (!fs.existsSync(targetPath)) return;
      const stat = fs.statSync(targetPath);
      if (now - stat.mtimeMs < maxAgeMs) return;

      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
      removed += 1;
    } catch (error) {
      console.warn(`[clips] Impossible de supprimer ${targetPath}:`, error);
    }
  };

  for (const dir of [CLIPS_SOURCES_DIR, CLIPS_PREVIEWS_DIR, CLIPS_EXPORTS_DIR, CLIPS_TEMP_DIR]) {
    if (!fs.existsSync(dir)) continue;

    for (const name of fs.readdirSync(dir)) {
      if (
        name.startsWith("temp_") ||
        name.startsWith("render_") ||
        name.startsWith("temp_export_")
      ) {
        tryRemove(path.join(dir, name));
      }
    }
  }

  return removed;
}

export { CLIPS_STORAGE_QUOTA_BYTES, CLIPS_SAVED_RETENTION_MS };
