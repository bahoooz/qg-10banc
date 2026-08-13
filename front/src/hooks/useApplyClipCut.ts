import { useMutation } from "@tanstack/react-query";
import { apiUrl } from "../lib/apiUrl";
import type { ClipImportResult } from "../../types";
import { ApiError } from "../lib/errorMessages";
import { clipDebug } from "../lib/clipDebug";
import { useClipEditorStore } from "../stores/clipEditorStore";
import { toast } from "sonner";

type ClipCutPayload = {
  clipId: string;
  keepSegments: { start: number; end: number }[];
};

const applyClipCut = async ({
  clipId,
  keepSegments,
}: ClipCutPayload): Promise<ClipImportResult> => {
  clipDebug.log("cut", "requête cut FFmpeg (-c copy)", { clipId, keepSegments });

  const res = await fetch(apiUrl(`/clips/${clipId}/cut`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keepSegments }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    clipDebug.error("cut", "échec cut FFmpeg", errorData);
    throw new ApiError(
      errorData.message || "Erreur lors du découpage de la vidéo",
      errorData.errorCode,
    );
  }

  const result = (await res.json()) as ClipImportResult;
  clipDebug.log("cut", "cut FFmpeg réussi", result);
  return result;
};

export const useApplyClipCut = () => {
  const applyRenderResult = useClipEditorStore((s) => s.applyRenderResult);
  const setIsApplyingCut = useClipEditorStore((s) => s.setIsApplyingCut);

  return useMutation<ClipImportResult, ApiError, ClipCutPayload>({
    mutationFn: applyClipCut,
    onMutate: () => setIsApplyingCut(true),
    onSuccess: (result, variables) => {
      applyRenderResult(result, variables.keepSegments);
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setIsApplyingCut(false),
  });
};
