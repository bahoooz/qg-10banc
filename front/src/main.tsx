import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { initSubtitleFonts } from "./lib/subtitleFonts";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

initSubtitleFonts();

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
