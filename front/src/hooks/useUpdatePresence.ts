import { useMutation } from "@tanstack/react-query";
import { ApiError } from "../lib/errorMessages";

const updatePresence = async () => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || "Ping échoué",
      errorData.errorCode,
      errorData.details,
    );
  }
  return res.json();
};

export const useUpdatePresence = () => {
  return useMutation({
    mutationFn: updatePresence,
    onSuccess: () => {
      console.log("Heartbeat sent");
    },
    retry: 2,
  });
};
