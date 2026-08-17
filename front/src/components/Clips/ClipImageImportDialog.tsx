import { useRef, useState } from "react";
import { ImagePlus, Link, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  FOLLOW_STICKER_PLATFORMS,
  getFollowStickerPlatformStyle,
  type FollowStickerConfig,
  type FollowStickerPlatform,
} from "../../lib/followSticker";
import type { CreateImageOverlayOptions } from "../../lib/clipImageOverlays";
import FollowStickerBadge from "./FollowStickerBadge";

type ClipImageImportDialogProps = {
  open: boolean;
  onClose: () => void;
  onImport: (src: string, label: string, options?: CreateImageOverlayOptions) => void;
};

type ImportMode = "file" | "url" | "sticker";

export default function ClipImageImportDialog({
  open,
  onClose,
  onImport,
}: ClipImageImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("file");
  const [url, setUrl] = useState("");
  const [stickerUsername, setStickerUsername] = useState("");
  const [stickerPlatform, setStickerPlatform] =
    useState<FollowStickerPlatform>("twitch");

  if (!open) return null;

  const handleClose = () => {
    setUrl("");
    setMode("file");
    setStickerUsername("");
    setStickerPlatform("twitch");
    onClose();
  };

  const handleUrlSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Indiquez une URL d'image valide");
      return;
    }

    onImport(trimmed, "Image");
    handleClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const label = file.name.replace(/\.[^.]+$/, "") || "Image";
    onImport(objectUrl, label);
    handleClose();
  };

  const handleStickerSubmit = () => {
    const username = stickerUsername.trim();
    if (!username) {
      toast.error("Indiquez votre pseudo");
      return;
    }

    const sticker: FollowStickerConfig = {
      type: "follow",
      username,
      platform: stickerPlatform,
    };

    onImport("", `@${username}`, { sticker });
    handleClose();
  };

  const previewSticker: FollowStickerConfig = {
    type: "follow",
    username: stickerUsername.trim() || "Pseudo",
    platform: stickerPlatform,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-secondary-color/60 bg-background-secondary p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clip-image-import-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="clip-image-import-title"
              className="text-sm font-extrabold uppercase tracking-wide text-main-color"
            >
              Ajouter une image
            </h2>
            <p className="mt-1 text-xs text-white/40">
              Import PC, lien URL ou sticker follow stream.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-secondary-color/60 text-white/50 transition-colors hover:text-white"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[9px] font-extrabold uppercase tracking-wide transition-all ${
              mode === "file"
                ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100"
                : "border-secondary-color/60 bg-background text-white/50 hover:text-white/70"
            }`}
          >
            <Upload className="size-3.5" />
            Importer
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[9px] font-extrabold uppercase tracking-wide transition-all ${
              mode === "url"
                ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100"
                : "border-secondary-color/60 bg-background text-white/50 hover:text-white/70"
            }`}
          >
            <Link className="size-3.5" />
            Lien
          </button>
          <button
            type="button"
            onClick={() => setMode("sticker")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[9px] font-extrabold uppercase tracking-wide transition-all ${
              mode === "sticker"
                ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100"
                : "border-secondary-color/60 bg-background text-white/50 hover:text-white/70"
            }`}
          >
            <Sparkles className="size-3.5" />
            Sticker
          </button>
        </div>

        {mode === "file" ? (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-300/40 bg-cyan-300/5 px-4 py-8 text-center transition-all hover:border-cyan-300/70 hover:bg-cyan-300/10"
            >
              <ImagePlus className="size-8 text-cyan-200/80" />
              <span className="text-xs font-extrabold uppercase tracking-wide text-cyan-100/90">
                Choisir une image sur votre PC
              </span>
              <span className="text-[10px] text-white/35">
                PNG, JPG, WEBP, GIF…
              </span>
            </button>
          </div>
        ) : mode === "url" ? (
          <div className="space-y-3">
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://exemple.com/image.png"
              className="w-full rounded-xl border border-secondary-color/60 bg-background px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/60 focus:outline-none"
              onKeyDown={(event) => {
                if (event.key === "Enter") handleUrlSubmit();
              }}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-300/15 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wide text-cyan-100 transition-all hover:bg-cyan-300/25"
            >
              <ImagePlus className="size-4" />
              Ajouter l'image
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-secondary-color/50 bg-background/60 p-3">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-white/30">
                Aperçu
              </p>
              <div className="mx-auto aspect-[420/88] h-24 w-full max-w-[360px] overflow-hidden rounded-lg border border-secondary-color/40 bg-black/40">
                <FollowStickerBadge config={previewSticker} />
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
                Pseudo
              </span>
              <input
                type="text"
                value={stickerUsername}
                onChange={(event) => setStickerUsername(event.target.value)}
                placeholder="Mollyyswd"
                maxLength={24}
                className="w-full rounded-xl border border-secondary-color/60 bg-background px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/60 focus:outline-none"
              />
            </label>

            <fieldset className="space-y-2">
              <legend className="text-[10px] font-extrabold uppercase tracking-wide text-white/30">
                Réseau
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {FOLLOW_STICKER_PLATFORMS.map((platform) => {
                  const style = getFollowStickerPlatformStyle(platform);
                  const isActive = stickerPlatform === platform;

                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setStickerPlatform(platform)}
                      className={`rounded-xl border px-2 py-2 text-[9px] font-extrabold uppercase tracking-wide transition-all ${
                        isActive
                          ? "text-white"
                          : "border-secondary-color/60 bg-background text-white/45 hover:text-white/70"
                      }`}
                      style={
                        isActive
                          ? {
                              borderColor: `${style.accentColor}99`,
                              backgroundColor: `${style.accentColor}22`,
                              color: style.accentColor,
                            }
                          : undefined
                      }
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={handleStickerSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-300/15 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wide text-cyan-100 transition-all hover:bg-cyan-300/25"
            >
              <Sparkles className="size-4" />
              Ajouter le sticker
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
