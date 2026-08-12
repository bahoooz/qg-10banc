import { Request, Response } from "express";

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import archiver from "archiver";

import { fileURLToPath } from "url";
import { dirname } from "path";
import { getApiUrl } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const CutVideo = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });

  const inputFilePath = req.file.path;
  const partDuration = Number(req.query.duration);

  // Utile ici que pour cleanup le dossier, on le gère vraiment dans multer.ts
  const inputDir = path.join(process.cwd(), "cut", "input");
  const outputDir = path.join(process.cwd(), "cut", "output");

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  function getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        const duration = Math.floor(Number(metadata.format.duration));
        resolve(duration);
      });
    });
  }

  function cutSegment(
    i: number,
    startSeconds: number,
    durationSeconds: number
  ) {
    return new Promise<string>((resolve, reject) => {
      const outputPath = path.join(outputDir, `partie_${i + 1}.mp4`);

      ffmpeg(inputFilePath)
        // --- filters (ordre important) ---
        .videoFilters([
          "setsar=1", // évite les soucis d'aspect ratio
          "crop=1080:1080:(iw-1080)/2:(ih-1080)/2",
        ])
        // -ss en input pour couper vite (OK même si on réencode)
        .inputOptions([`-ss ${startSeconds}`])
        // --- encodage vidéo requis (on ne peut pas copier après un filtre) ---
        .outputOptions([
          `-t ${durationSeconds}`,
          "-c:v libx264",
          "-preset veryfast",
          "-crf 20",
          "-movflags +faststart",
          "-c:a copy", // audio inchangé (pas de filtre audio)
          "-y",        // overwrite si le fichier existe
        ])
        .output(outputPath)
        .on("end", () => {
          console.log(`Partie ${i + 1} terminé -> ${path.basename(outputPath)}`);
          resolve(outputPath);
        })
        .on("error", (error) => {
          console.error(`Erreur partie ${i + 1} : `, error?.message || error);
          reject(error);
        })
        .run();
    });
  }

  try {
    const videoDuration = await getVideoDuration(inputFilePath);
    const totalPartsVideo = Math.ceil(videoDuration / partDuration);

    console.log(`Durée totale : ${videoDuration}s`);
    console.log(`${totalPartsVideo} parts de ${partDuration}`);

    for (let i = 0; i < totalPartsVideo; i++) {
      const start = i * partDuration;
      const remaining = videoDuration - start;
      const partLength = Math.min(partDuration, remaining);
      await cutSegment(i, start, partLength);
    }

    console.log("🏁 Tous les parts ont été créés dans ./parts !");

    const zipPath = path.join(outputDir, "parties.zip");

    console.log("Début de l'archivage");
    const outputStream = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 1 } });

    archive.pipe(outputStream);
    archive.glob("*.mp4", { cwd: outputDir });

    outputStream.on("close", () => {
      console.log("Fin de l'archivage");

      res.status(200).json({
        message: "Opération de découpage de la vidéo terminée avec succès",
        downloadUrl: `${getApiUrl()}/output/parties.zip`,
      });

      setTimeout(() => {
        try {
          fs.rmSync(inputDir, { recursive: true, force: true });
          fs.mkdirSync(inputDir, { recursive: true });
          console.log("Dossier input vidé !");
          fs.rmSync(outputDir, { recursive: true, force: true });
          fs.mkdirSync(outputDir, { recursive: true });
          console.log("Dossier output vidé !");
        } catch (err) {
          console.error("Erreur de cleanup : ", err);
        }
      }, 10_000);
    });

    await archive.finalize();
  } catch (error) {
    console.error("Erreur : ", error);
    return res.status(500).json({ message: "Internal Error Server", error });
  }
};
