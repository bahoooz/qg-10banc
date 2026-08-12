import { useQuery } from "@tanstack/react-query";
import type { UserDataLogin } from "../../types";
import { ApiError } from "../lib/errorMessages";

const fetchUserProfile = async (username: string): Promise<UserDataLogin> => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${username}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Utilisateur introuvable",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
};

export const useSpecificUser = (username: string) => {
  return useQuery({
    queryKey: ["users", username],
    queryFn: () => fetchUserProfile(username),
    enabled: !!username,
    staleTime: 0,
    gcTime: 0,
  });
};
