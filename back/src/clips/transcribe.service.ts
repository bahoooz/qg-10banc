import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import { AppError } from "../../utils.js";
import {
  CLIPS_DIR,
  CLIPS_SOURCES_DIR,
  ensureClipDirectories,
} from "../lib/paths.js";
import { extractAudioForTranscription } from "./ffmpeg.service.js";
import { clipDebug } from "./clipDebug.js";
import type { SubtitleWordPayload, TranscribeResult } from "./subtitles.types.js";

const GROQ_WHISPER_MODEL = "whisper-large-v3";

const GAMING_FR_PROMPT =
  "Transcription clip Twitch gaming français. Vocabulaire fréquent : tue, kill, push, heal, go, rush, clip, wtf, nice, let's go, allez, ouah, mon gars, frère, incroyable.";

type GroqWord = {
  word: string;
  start: number;
  end: number;
};

type GroqVerboseTranscription = {
  language?: string;
  words?: GroqWord[];
};

function createSubtitleWordId(index: number, start: number): string {
  return `sub-${index}-${start.toFixed(3)}`;
}

function mapGroqWords(words: GroqWord[]): SubtitleWordPayload[] {
  return words
    .filter((word) => word.word.trim().length > 0)
    .map((word, index) => ({
      id: createSubtitleWordId(index, word.start),
      text: word.word.trim(),
      start: word.start,
      end: Math.max(word.end, word.start + 0.05),
    }));
}

export async function transcribeClipService(
  clipId: string,
): Promise<TranscribeResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AppError(
      503,
      "GROQ_API_KEY_MISSING",
      "Clé GROQ_API_KEY manquante — configure-la dans le .env backend",
    );
  }

  ensureClipDirectories();

  const sourcePath = path.join(CLIPS_SOURCES_DIR, `${clipId}.mp4`);
  if (!fs.existsSync(sourcePath)) {
    clipDebug.warn("transcribe", "source introuvable", { clipId });
    throw new AppError(404, "CLIP_NOT_FOUND", "Source vidéo introuvable");
  }

  const tempDir = path.join(CLIPS_DIR, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const audioPath = path.join(tempDir, `${clipId}_transcribe.wav`);

  clipDebug.log("transcribe", "extraction audio", { clipId, sourcePath });

  try {
    await extractAudioForTranscription(sourcePath, audioPath);

    const groq = new Groq({ apiKey });
    const audioStream = fs.createReadStream(audioPath);

    clipDebug.log("transcribe", "appel Groq Whisper", {
      clipId,
      model: GROQ_WHISPER_MODEL,
    });

    const transcription = (await groq.audio.transcriptions.create({
      file: audioStream,
      model: GROQ_WHISPER_MODEL,
      language: "fr",
      prompt: GAMING_FR_PROMPT,
      temperature: 0,
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
    })) as GroqVerboseTranscription;

    const words = mapGroqWords(transcription.words ?? []);

    clipDebug.log("transcribe", "transcription terminée", {
      clipId,
      wordCount: words.length,
      language: transcription.language ?? "fr",
    });

    return {
      words,
      language: transcription.language ?? "fr",
    };
  } catch (error) {
    clipDebug.error("transcribe", "échec transcription", {
      clipId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof AppError) throw error;

    throw new AppError(
      502,
      "TRANSCRIBE_FAILED",
      error instanceof Error
        ? error.message
        : "Échec de la transcription automatique",
    );
  } finally {
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  }
}
