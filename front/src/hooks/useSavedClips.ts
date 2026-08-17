import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/errorMessages";
import { apiUrl } from "../lib/apiUrl";
import { toast } from "sonner";
import type {
  ClipsStorageStats,
  CreateSavedClipInput,
  SavedClipDetail,
  SavedClipEditorStateV1,
  SavedClipsPageResult,
} from "../lib/savedClip";

const SAVED_CLIPS_QUERY_KEY = ["savedClips"] as const;

async function fetchSavedClipsPage(
  page: number,
): Promise<SavedClipsPageResult> {
  const params = new URLSearchParams({
    page: String(page),
    limit: "5",
  });

  const res = await fetch(apiUrl(`/saved-clips?${params.toString()}`), {
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la récupération des clips",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
}

async function fetchSavedClip(id: string): Promise<SavedClipDetail> {
  const res = await fetch(apiUrl(`/saved-clips/${id}`), {
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Clip introuvable",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
}

async function fetchClipsStorage(): Promise<ClipsStorageStats> {
  const res = await fetch(apiUrl("/saved-clips/storage"), {
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur stockage clips",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
}

async function createSavedClipRequest(input: CreateSavedClipInput): Promise<{
  message: string;
  clip: SavedClipDetail;
}> {
  const res = await fetch(apiUrl("/saved-clips"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de l'enregistrement du clip",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
}

async function updateSavedClipRequest(
  id: string,
  editorState: SavedClipEditorStateV1,
): Promise<void> {
  const res = await fetch(apiUrl(`/saved-clips/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ editorState }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la sauvegarde",
      errorData.errorCode,
      errorData.details,
    );
  }
}

async function deleteSavedClipRequest(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/saved-clips/${id}`), {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la suppression",
      errorData.errorCode,
      errorData.details,
    );
  }
}

export const useSavedClipsPage = (page: number) => {
  return useQuery({
    queryKey: [...SAVED_CLIPS_QUERY_KEY, "page", page],
    queryFn: () => fetchSavedClipsPage(page),
    staleTime: 0,
    refetchOnMount: "always",
  });
};

export const useSavedClip = (id: string | null) => {
  return useQuery({
    queryKey: [...SAVED_CLIPS_QUERY_KEY, id],
    queryFn: () => fetchSavedClip(id!),
    enabled: Boolean(id),
  });
};

export const useClipsStorage = () => {
  return useQuery({
    queryKey: [...SAVED_CLIPS_QUERY_KEY, "storage"],
    queryFn: fetchClipsStorage,
    staleTime: 1000 * 15,
  });
};

export const useCreateSavedClip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSavedClipRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SAVED_CLIPS_QUERY_KEY });
      toast.success(data.message);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateSavedClip = () => {
  return useMutation({
    mutationFn: ({
      id,
      editorState,
    }: {
      id: string;
      editorState: SavedClipEditorStateV1;
    }) => updateSavedClipRequest(id, editorState),
  });
};

export const useDeleteSavedClip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSavedClipRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_CLIPS_QUERY_KEY });
      toast.success("Clip supprimé");
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
};

export function getSavedClipDownloadUrl(id: string): string {
  return apiUrl(`/saved-clips/${id}/download`);
}
