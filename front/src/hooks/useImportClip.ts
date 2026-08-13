import { useMutation } from "@tanstack/react-query";
import type { ClipImportResult } from "../../types";
import { ApiError } from "../lib/errorMessages";
import { clipDebug } from "../lib/clipDebug";
import { toast } from "sonner";
import { apiUrl } from "../lib/apiUrl";

async function parseErrorResponse(res: Response): Promise<never> {
  const errorData = await res.json().catch(() => ({}));
  throw new ApiError(
    errorData.message || "Erreur lors de l'import de la vidéo",
    errorData.errorCode,
    errorData.details,
  );
}

const uploadClipFile = async (file: File): Promise<ClipImportResult> => {
  clipDebug.log("import", "upload fichier", {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(apiUrl("/clips/upload"), {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) await parseErrorResponse(res);
  const result = (await res.json()) as ClipImportResult;
  clipDebug.log("import", "upload réussi", result);
  return result;
};

const importTwitchClip = async ({
  url,
  twitchAccountId,
}: {
  url: string;
  twitchAccountId?: string;
}): Promise<ClipImportResult> => {
  clipDebug.log("import", "import Twitch", { url, twitchAccountId });

  const res = await fetch(apiUrl("/clips/twitch"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, twitchAccountId }),
  });

  if (!res.ok) await parseErrorResponse(res);
  const result = (await res.json()) as ClipImportResult;
  clipDebug.log("import", "import Twitch réussi", result);
  return result;
};

export const useUploadClip = () =>
  useMutation<ClipImportResult, ApiError, File>({
    mutationFn: uploadClipFile,
    onError: (error) => toast.error(error.message),
  });

export const useImportTwitchClip = () =>
  useMutation<
    ClipImportResult,
    ApiError,
    { url: string; twitchAccountId?: string }
  >({
    mutationFn: importTwitchClip,
    onError: (error) => toast.error(error.message),
  });
