import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateNote, UpdateNoteResponse } from "../../types";
import { ApiError } from "../lib/errorMessages";
import { apiUrl } from "../lib/apiUrl";

const fetchUpdateNote = async (data: UpdateNote) => {
  const res = await fetch(
    apiUrl(`/notes/update/${data.id}`),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    },
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la mise à jour de la note",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateNoteResponse, ApiError, UpdateNote>({
    mutationFn: fetchUpdateNote,
    onSuccess: (data) => {
      console.log("Note mise à jour avec succès !", data);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour de la note :", error);
    },
  });
};
