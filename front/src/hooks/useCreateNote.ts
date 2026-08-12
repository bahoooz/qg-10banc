import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateNote } from "../../types";
import { ApiError } from "../lib/errorMessages";
import { toast } from "sonner";

const fetchCreateNote = async (data: CreateNote & { authorId: number }) => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/notes/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la création de la note",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, CreateNote & { authorId: number }>({
    mutationFn: fetchCreateNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error) => {
      toast.error(`${error.message}`);
    },
  });
};
