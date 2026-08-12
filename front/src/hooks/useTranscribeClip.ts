import { useMutation } from "@tanstack/react-query";
import type { TranscribeResult } from "../../types";
import { ApiError } from "../lib/errorMessages";
import { clipDebug } from "../lib/clipDebug";
import { useClipEditorStore } from "../stores/clipEditorStore";
import { toast } from "sonner";

type TranscribePayload = {
  clipId: string;
  silent?: boolean;
};

const transcribeClip = async ({
  clipId,
}: TranscribePayload): Promise<TranscribeResult> => {
  clipDebug.log("transcribe", "requête transcription", { clipId });

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/clips/${clipId}/transcribe`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    },
  );

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
