import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "../lib/apiUrl";
import type { SoundboardSearchResult } from "../lib/soundboardCatalog";

async function fetchSoundboardSearch(
  query: string,
): Promise<SoundboardSearchResult> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }
  params.set("limit", "80");

  const res = await fetch(apiUrl(`/soundboard/search?${params.toString()}`), {
    credentials: "include",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Impossible de charger les sons");
  }

  return (await res.json()) as SoundboardSearchResult;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useSoundboardSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query, 280);

  return useQuery({
    queryKey: ["soundboard-search", debouncedQuery],
    queryFn: () => fetchSoundboardSearch(debouncedQuery),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });
}
