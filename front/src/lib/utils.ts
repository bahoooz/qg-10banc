import { clsx, type ClassValue } from "clsx";
import { useSyncExternalStore } from "react";
import { twMerge } from "tailwind-merge";
import type { JSONContent } from "@tiptap/react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
  const d = new Date(dateString);

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const hour = d.getHours().toString().padStart(2, "0");
  const minute = d.getMinutes().toString().padStart(2, "0");

  const formattedHour = `${hour}h${minute}`;

  const now = new Date();

  // On normalise les dates à minuit pour comparer correctement
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const otherDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.floor(
    (today.getTime() - otherDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  // ───────────────
  // 🔥 CAS SPÉCIAUX
  // ───────────────
  if (diffDays === 0) {
    return `aujourd’hui à ${formattedHour}`;
  }

  if (diffDays === 1) {
    return `hier à ${formattedHour}`;
  }

  // Sinon → format classique
  return `${day}/${month} à ${formattedHour}`;
}

export function formatLink(str: string) {
  return str.replaceAll(/[ ']/g, "-").toLowerCase();
}

export function formatSlug(str: string) {
  const prefix = "/notes/view/"
  return str.slice(prefix.length)
}

export function useWindowWidth() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("resize", callback);
      return () => window.removeEventListener("resize", callback);
    },
    () => window.innerWidth,
    () => 0,
  );
}

export const previewJSONText = (json: JSONContent): string => {
    if (!json || !json.content) return "";

    return json.content
      .map((node: JSONContent) => {
        if (node.type === "text") return node.text;
        if (node.content) return previewJSONText(node); // Récursivité pour les sous-blocs
        return "";
      })
      .join(" ");
  };
