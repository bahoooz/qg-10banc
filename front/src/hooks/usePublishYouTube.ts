import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "../lib/errorMessages";
import { apiUrl } from "../lib/apiUrl";
import type {
  YouTubePublishPayload,
  YouTubePublishResult,
} from "../lib/youtubePublish";

type PublishYouTubeResponse = {
  message: string;
  result: YouTubePublishResult;
};

async function publishYouTubeVideoRequest(
  payload: YouTubePublishPayload,
): Promise<PublishYouTubeResponse> {
  const res = await fetch(apiUrl("/youtube/publish"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la publication YouTube",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
}

export const usePublishYouTube = () => {
  return useMutation({
    mutationFn: publishYouTubeVideoRequest,
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
};
