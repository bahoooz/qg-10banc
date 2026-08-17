import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/errorMessages";
import { apiUrl } from "../lib/apiUrl";
import { toast } from "sonner";
import type {
  ClipTemplateDetail,
  ClipTemplateListItem,
  CreateClipTemplateInput,
} from "../lib/clipTemplate";

const CLIP_TEMPLATES_QUERY_KEY = ["clipTemplates"] as const;

async function fetchClipTemplates(): Promise<ClipTemplateListItem[]> {
  const res = await fetch(apiUrl("/clip-templates"), {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la récupération des templates",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
}

async function fetchClipTemplate(id: string): Promise<ClipTemplateDetail> {
  const res = await fetch(apiUrl(`/clip-templates/${id}`), {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Template introuvable",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
}

async function createClipTemplateRequest(
  input: CreateClipTemplateInput,
): Promise<{ message: string; template: ClipTemplateDetail }> {
  const res = await fetch(apiUrl("/clip-templates"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la sauvegarde de la template",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
}

async function deleteClipTemplateRequest(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/clip-templates/${id}`), {
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

export const useClipTemplates = () => {
  return useQuery({
    queryKey: CLIP_TEMPLATES_QUERY_KEY,
    queryFn: fetchClipTemplates,
    staleTime: 1000 * 60,
  });
};

export const useClipTemplate = (id: string | null) => {
  return useQuery({
    queryKey: [...CLIP_TEMPLATES_QUERY_KEY, id],
    queryFn: () => fetchClipTemplate(id!),
    enabled: Boolean(id),
  });
};

export const useCreateClipTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClipTemplateRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CLIP_TEMPLATES_QUERY_KEY });
      toast.success(data.message);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteClipTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClipTemplateRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIP_TEMPLATES_QUERY_KEY });
      toast.success("Template supprimée");
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
};
