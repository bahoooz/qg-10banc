import { useMutation } from "@tanstack/react-query";
import type { TranscribeResult } from "../../types";
import { ApiError } from "../lib/errorMessages";
import { clipDebug } from "../lib/clipDebug";
import { useClipEditorStore } from "../stores/clipEditorStore";
import { toast } from "sonner";
import { apiUrl } from "../lib/apiUrl";
import type { TimeRange } from "../lib/clipTime";
import type { TimelineVideoClip } from "../lib/clipTimelineVideos";

type TranscribePayload = {
  clipId: string;
  silent?: boolean;
  keepSegments?: TimeRange[];
  timelineVideos?: TimelineVideoClip[];
};

const transcribeClip = async ({
  clipId,
  keepSegments,
  timelineVideos,
}: TranscribePayload): Promise<TranscribeResult> => {
  clipDebug.log("transcribe", "requête transcription", {
    clipId,
    timelineVideoCount: timelineVideos?.length ?? 0,
  });

  const body: Record<string, unknown> = {};
  if (keepSegments && keepSegments.length > 0) {
    body.keepSegments = keepSegments;
  }
  if (timelineVideos && timelineVideos.length > 0) {
    body.timelineVideos = timelineVideos.map((clip) => ({
      clipId: clip.clipId,
      sequenceStart: clip.sequenceStart,
      duration: clip.duration,
      sourceStart: clip.sourceStart,
      layoutMode: clip.layoutMode,
    }));
  }

  const res = await fetch(apiUrl(`/clips/${clipId}/transcribe`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    clipDebug.error("transcribe", "échec transcription", errorData);
    throw new ApiError(
      errorData.message || "Erreur lors de la transcription",
      errorData.errorCode,
    );
  }

  return res.json() as Promise<TranscribeResult>;
};

export const useTranscribeClip = () => {
  const setIsTranscribing = useClipEditorStore((s) => s.setIsTranscribing);
  const applyTranscriptionResult = useClipEditorStore(
    (s) => s.applyTranscriptionResult,
  );

  return useMutation<TranscribeResult, ApiError, TranscribePayload>({
    mutationFn: transcribeClip,
    onMutate: () => setIsTranscribing(true),
    onSuccess: (result, variables) => {
      applyTranscriptionResult(result.words, result.language);
      clipDebug.log("transcribe", "transcription réussie", {
        wordCount: result.words.length,
      });
      if (!variables.silent) {
        toast.success(`${result.words.length} mots transcrits`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => setIsTranscribing(false),
  });
};
