import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/errorMessages";
import { toast } from "sonner";
import { apiUrl } from "../lib/apiUrl";

const fetchPinNote = async (id: number) => {
  const res = await fetch(apiUrl(`/notes/pin/${id}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de l'épinglement de la note",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
};

export const usePinNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchPinNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["pinnedNotes"] });
    },
    onError: () => {
      toast.error("Erreur lors de l'épinglement de la note");
    },
  });
};
