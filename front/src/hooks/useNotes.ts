import { useQuery } from "@tanstack/react-query";
import type { Notes } from "../../types";
import { ApiError } from "../lib/errorMessages";
import { apiUrl } from "../lib/apiUrl";

const fetchNotes = async (): Promise<Notes[]> => {
  const res = await fetch(apiUrl("/notes"), {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la récupération des notes",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
};

export const useNotes = () => {
  return useQuery({
    queryKey: ["notes"],
    queryFn: fetchNotes,
    staleTime: 1000 * 60,
  });
};

const fetchPinnedNotes = async (): Promise<Notes[]> => {
  const res = await fetch(apiUrl("/notes/pinned"), {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Erreur lors de la récupération des notes");

  return res.json();
};

export const usePinnedNotes = () => {
  return useQuery({
    queryKey: ["pinnedNotes"],
    queryFn: fetchPinnedNotes,
    staleTime: 0,
  });
};
