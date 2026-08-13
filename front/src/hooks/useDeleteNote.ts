import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/errorMessages";
import { toast } from "sonner";
import { apiUrl } from "../lib/apiUrl";

const fetchDeleteNote = async (id: number) => {
  const res = await fetch(
    apiUrl(`/notes/delete/${id}`),
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    },
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la suppression de la note",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchDeleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: () => {
      toast.error("Erreur lors de la suppression de la note");
    },
  });
};
