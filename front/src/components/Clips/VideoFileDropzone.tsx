import { type DragEvent, useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  ACCEPTED_VIDEO_EXTENSIONS,
  isAcceptedVideoFile,
} from "../../schemas/clipEditor";

type VideoFileDropzoneProps = {
  onSubmit: (file: File) => void | Promise<void>;
  disabled?: boolean;
};

export default function VideoFileDropzone({
  onSubmit,
  disabled = false,
}: VideoFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isAcceptedVideoFile(file)) {
      setError("Format non supporté. Utilise MP4, WebM ou MOV.");
      return;
    }
    setError(null);
    await onSubmit(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary-color/40">
          <Upload className="size-5 text-main-color" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold uppercase tracking-wide">
            Fichier vidéo
          </h2>
          <p className="text-sm text-white/50">
            Depuis ton PC — MP4, WebM ou MOV
          </p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all ${
          isDragging
            ? "border-main-color bg-main-color/10 scale-[1.01]"
            : "border-secondary-color/80 bg-background/40 hover:border-main-color/40 hover:bg-background/60"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <Upload
          className={`size-10 ${isDragging ? "text-main-color" : "text-white/40"}`}
        />
        <div>
          <p className="font-extrabold uppercase tracking-wide">
            Glisse ta vidéo ici
          </p>
          <p className="mt-1 text-sm text-white/45">ou clique pour parcourir</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_EXTENSIONS}
        className="hidden"
        disabled={disabled}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
