import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserDataLogin } from "../../types";
import { toast } from "sonner";
import { ApiError } from "../lib/errorMessages";

const fetchLogin = async ({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<UserDataLogin> => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Mot de passe incorrect",
      errorData.errorCode,
      errorData.details,
    );
  }

  return res.json();
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Vous êtes connecté");
    },
    onError: () => {
      toast.error("Échec de la connexion");
    },
  });
};
