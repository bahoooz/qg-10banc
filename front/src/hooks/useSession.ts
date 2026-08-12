import { useQuery } from "@tanstack/react-query";
import type { User } from "../../types";
import { ApiError } from "../lib/errorMessages";

const fetchSession = async (): Promise<User> => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/session`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la récupération de la session",
      errorData.errorCode,
      errorData.details,
    );
  }

  const data = await res.json();

  return data.user;
};

export const useSession = () => {
  return useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    retryDelay: 500,
  });
};
