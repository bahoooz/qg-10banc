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
import type { TimelineVideoExportPayload } from "./export.types.js";
import {
  clampSegmentSpeed,
  getSequenceDurationForSourceDuration,
  sourceOffsetToSequenceOffset,
} from "./segmentSpeed.util.js";

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

type TimeSegment = {
  start: number;
  end: number;
  speed?: number;
};

type TranscribeClipOptions = {
  keepSegments?: TimeSegment[];
  timelineVideos?: TimelineVideoExportPayload[];
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

async function transcribeAudioFile(
  groq: Groq,
  audioPath: string,
): Promise<{ words: SubtitleWordPayload[]; language: string }> {
  const audioStream = fs.createReadStream(audioPath);
  const transcription = (await groq.audio.transcriptions.create({
    file: audioStream,
    model: GROQ_WHISPER_MODEL,
    language: "fr",
    prompt: GAMING_FR_PROMPT,
    temperature: 0,
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"],
  })) as GroqVerboseTranscription;

  return {
    words: mapGroqWords(transcription.words ?? []),
    language: transcription.language ?? "fr",
  };
}

async function transcribeVideoSource(
  groq: Groq,
  sourcePath: string,
  tempDir: string,
  label: string,
  options?: { sourceStart?: number; duration?: number },
): Promise<SubtitleWordPayload[]> {
  const audioPath = path.join(tempDir, `${label}_transcribe.wav`);
  await extractAudioForTranscription(sourcePath, audioPath, options);
  const result = await transcribeAudioFile(groq, audioPath);
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }
  return result.words;
}

async function transcribeKeepSegments(
  groq: Groq,
  sourcePath: string,
  tempDir: string,
  label: string,
  keepSegments: TimeSegment[],
  timing: "source" | "sequence",
): Promise<SubtitleWordPayload[]> {
  const sorted = [...keepSegments].sort((a, b) => a.start - b.start);
  const allWords: SubtitleWordPayload[] = [];
  let wordIndex = 0;
  let sequenceOffset = 0;

  for (const [index, segment] of sorted.entries()) {
    const sourceDuration = segment.end - segment.start;
    if (sourceDuration <= 0.05) continue;

    const words = await transcribeVideoSource(
      groq,
      sourcePath,
      tempDir,
      `${label}_seg_${index}`,
      {
        sourceStart: segment.start,
        duration: sourceDuration,
      },
    );

    const speed = clampSegmentSpeed(segment.speed);

    for (const word of words) {
      if (timing === "source") {
        const sourceStart = segment.start + word.start;
        const sourceEnd = segment.start + word.end;
        allWords.push({
          id: createSubtitleWordId(wordIndex, sourceStart),
          text: word.text,
          start: sourceStart,
          end: sourceEnd,
        });
      } else {
        const seqStart =
          sequenceOffset + sourceOffsetToSequenceOffset(word.start, speed);
        const seqEnd =
          sequenceOffset + sourceOffsetToSequenceOffset(word.end, speed);
        allWords.push({
          id: createSubtitleWordId(wordIndex, seqStart),
          text: word.text,
          start: seqStart,
          end: seqEnd,
        });
      }
      wordIndex += 1;
    }

    sequenceOffset += getSequenceDurationForSourceDuration(sourceDuration, speed);
  }

  return allWords.sort((a, b) => a.start - b.start || a.end - b.end);
}

async function transcribeBaseVideoWords(
  groq: Groq,
  sourcePath: string,
  tempDir: string,
  label: string,
  keepSegments: TimeSegment[] | undefined,
  timing: "source" | "sequence",
): Promise<SubtitleWordPayload[]> {
  if (keepSegments && keepSegments.length > 0) {
    return transcribeKeepSegments(
      groq,
      sourcePath,
      tempDir,
      label,
      keepSegments,
      timing,
    );
  }

  return transcribeVideoSource(groq, sourcePath, tempDir, label);
}

export async function transcribeClipService(
  clipId: string,
  options?: TranscribeClipOptions,
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

  clipDebug.log("transcribe", "extraction audio", { clipId, sourcePath });

  try {
    const groq = new Groq({ apiKey });
    const timelineVideos = options?.timelineVideos ?? [];
    const keepSegments = options?.keepSegments;

    if (timelineVideos.length === 0) {
      const words = await transcribeBaseVideoWords(
        groq,
        sourcePath,
        tempDir,
        clipId,
        keepSegments,
        "source",
      );
      return {
        words,
        language: "fr",
      };
    }

    clipDebug.log("transcribe", "timeline étendue", {
      clipId,
      timelineVideoCount: timelineVideos.length,
    });

    const mergedWords = await transcribeBaseVideoWords(
      groq,
      sourcePath,
      tempDir,
      `${clipId}_base`,
      keepSegments,
      "source",
    );

    let wordIndex = mergedWords.length;

    for (const [index, clip] of [...timelineVideos]
      .sort((a, b) => a.sequenceStart - b.sequenceStart)
      .entries()) {
      if (clip.importKind === "meme") {
        continue;
      }

      const timelineSourcePath = path.join(CLIPS_SOURCES_DIR, `${clip.clipId}.mp4`);
      if (!fs.existsSync(timelineSourcePath)) {
        clipDebug.warn("transcribe", "source timeline introuvable", {
          clipId: clip.clipId,
        });
        continue;
      }

      const clipWords = await transcribeVideoSource(
        groq,
        timelineSourcePath,
        tempDir,
        `${clipId}_tv_${index}`,
        {
          sourceStart: clip.sourceStart ?? 0,
          duration: clip.duration,
        },
      );

      for (const word of clipWords) {
        mergedWords.push({
          id: createSubtitleWordId(wordIndex, word.start + clip.sequenceStart),
          text: word.text,
          start: word.start + clip.sequenceStart,
          end: word.end + clip.sequenceStart,
        });
        wordIndex += 1;
      }
    }

    mergedWords.sort((a, b) => a.start - b.start || a.end - b.end);

    clipDebug.log("transcribe", "transcription timeline terminée", {
      clipId,
      wordCount: mergedWords.length,
    });

    return {
      words: mergedWords,
      language: "fr",
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
  }
}
