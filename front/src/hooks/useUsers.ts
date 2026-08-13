import { useQuery } from "@tanstack/react-query";
import type { User } from "../../types";
import { ApiError } from "../lib/errorMessages";
import { apiUrl } from "../lib/apiUrl";

const fetchUsers = async (): Promise<User[]> => {
  const res = await fetch(apiUrl("/users"), {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Erreur lors de la récupération des utilisateurs",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
};

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 1000 * 10,
  });
};
