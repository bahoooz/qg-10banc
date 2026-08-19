import fs from "fs";
import path from "path";
import { MARKERS_THUMBNAILS_DIR } from "../lib/paths.js";
import { logger } from "../lib/logger.js";

type ParsedDataUrl = {
  extension: string;
  buffer: Buffer;
};

function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  const trimmed = dataUrl.trim();
  if (!trimmed) return null;

  const match = /^data:([^;]+);base64,(.+)$/s.exec(trimmed);
  if (!match) return null;

  const mime = match[1].toLowerCase();
  const extension =
    mime.includes("png") ? "png" : mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "bin";

  try {
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length === 0) return null;
    return { extension, buffer };
  } catch {
    return null;
  }
}

export async function storeMarkerThumbnail(
  streamerId: string,
  markerId: string,
  thumbnailDataUrl: string | undefined,
): Promise<string | null> {
  if (!thumbnailDataUrl?.trim()) return null;

  const parsed = parseDataUrl(thumbnailDataUrl);
  if (!parsed) {
    logger.warn("streamMarkers", "Miniature illisible, marqueur conservé sans image", {
      markerId,
      streamerId,
    });
    return null;
  }

  const relativePath = path.posix.join(
    "markers",
    streamerId,
    `${markerId}.${parsed.extension}`,
  );
  const absolutePath = path.join(MARKERS_THUMBNAILS_DIR, streamerId, `${markerId}.${parsed.extension}`);

  try {
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, parsed.buffer);
    return relativePath;
  } catch (error) {
    logger.warn("streamMarkers", "Échec dépôt miniature, marqueur conservé sans image", {
      markerId,
      streamerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
