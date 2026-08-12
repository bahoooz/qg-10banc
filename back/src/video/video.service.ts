import { DataStatusVideo } from "../../types.js";
import { getAccessToken } from "../../utils.js";
import { prisma } from "../lib/prisma.js";
import fs, { createWriteStream } from "fs";
import path from "path";
import { pipeline } from "stream/promises";

const bucketName = process.env.GCS_BUCKET;
const projectId = process.env.GCP_ID!;
const model = "veo-3.0-fast-generate-001";
const location = "us-central1";
const aspectRatio = "9:16";
const MEDIA_DIR = path.join(process.cwd(), "media");

export const createVideoService = async (prompt: string) => {
  const token = await getAccessToken();

  const res = await fetch(
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predictLongRunning`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [
          {
            prompt,
          },
        ],
        parameters: {
          storageUri: bucketName,
          sampleCount: 1,
          aspectRatio: aspectRatio,
          durationSeconds: 8,
        },
      }),
    }
  );

  if (!res.ok)
    throw new Error(
      "Problème avec le début de la création de la vidéo avec veo3"
    );

  // REPONSE API CREATION DE LA VIDEO
  const data = await res.json();
  const operationId = data.name.split("/operations/")[1];

  console.log("Données complètes du début de la création de la vidéo : ", data);

  const generatedVideo = await prisma.video.create({
    data: {
      type: "tiktok",
      operationId,
      done: false,
      prompt,
      createdAt: new Date(),
    },
  });

  console.log(
    "Statut de l'enregistrement en database de la vidéo : ",
    generatedVideo
  );

  return generatedVideo;
};

export const getStatusVideoService = async ({
  operationId,
  protocol,
  host,
}: {
  operationId: string;
  protocol: string;
  host: string;
}) => {
  const token = await getAccessToken();

  const existingVideo = await prisma.video.findUnique({
    where: { operationId },
  });

  if (!existingVideo)
    throw new Error("Aucune vidéo existante avec cette operationID");

  const statusVideo = await fetch(
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:fetchPredictOperation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operationName: `projects/${projectId}/locations/${location}/publishers/google/models/${model}/operations/${operationId}`,
      }),
    }
  );

  const dataStatusVideo: DataStatusVideo = await statusVideo.json();

  const gcsUri = dataStatusVideo.response?.videos?.[0]?.gcsUri ?? null;

  const existingVideoUpdated = await prisma.video.update({
    where: { operationId },
    data: {
      done: dataStatusVideo.done,
      uri: gcsUri,
    },
  });

  let localUrl: string | null = null;

  if (!gcsUri) throw new Error("gcsUri manquant");

  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

  const toHttpsFromGs = (uri: string) => {
    if (!uri.startsWith("gs://")) return uri;
    const without = uri.replace("gs://", "");
    const [bucket, ...rest] = without.split("/");
    return `https://storage.googleapis.com/${bucket}/${rest.join("/")}`;
  };
  const publicUrl = toHttpsFromGs(gcsUri);

  const r = await fetch(publicUrl);

  if (r.ok && r.body) {
    const filename = `${operationId}.mp4`;
    const destPath = path.join(MEDIA_DIR, filename);
    await pipeline(r.body as any, createWriteStream(destPath));

    const base = process.env.MEDIA_BASE_URL ?? `${protocol}://${host}/media`;
    localUrl = `${base}/${filename}`;
  } else {
    console.error("Mirror download failed :", publicUrl, r.status);
  }

  const updatedVideo = await prisma.video.update({
    where: { operationId },
    data: {
      url_link: localUrl,
    },
  });

  console.log("Updated video successfully : ", updatedVideo);
  console.log("Voici les données actuelles du statut : ", dataStatusVideo);
  return { existingVideoUpdated, dataStatusVideo, localUrl };
};

export const getAllVideosService = async () => {
  const videos = await prisma.video.findMany();

  if (videos.length === 0)
      throw new Error("Aucune vidéo trouvée")

  return videos
};
