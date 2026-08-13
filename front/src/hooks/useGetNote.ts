import { useQuery } from "@tanstack/react-query";
import type { Notes } from "../../types";
import { ApiError } from "../lib/errorMessages";
import { apiUrl } from "../lib/apiUrl";

const fetchSpecificNote = async (slug: string): Promise<Notes> => {
  const res = await fetch(apiUrl(`/notes/${slug}`), {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Note introuvable",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
};

export const useGetNote = (slug: string) => {
  return useQuery({
    queryKey: ["notes", slug],
    queryFn: () => fetchSpecificNote(slug),
    enabled: !!slug,
    staleTime: 0,
    gcTime: 0,
  });
};
