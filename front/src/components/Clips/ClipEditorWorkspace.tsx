import { useEffect } from "react";
import type { ClipImportResult } from "../../../types";
import { clipDebug } from "../../lib/clipDebug";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import ClipEditorExportView from "./ClipEditorExportView";
import ClipEditorLayoutView from "./ClipEditorLayoutView";
import ClipEditorPreview from "./ClipEditorPreview";
import ClipEditorSidebar from "./ClipEditorSidebar";
import ClipEditorSubtitlesView from "./ClipEditorSubtitlesView";
import ClipEditorTimeline from "./ClipEditorTimeline";

type ClipEditorWorkspaceProps = {
  clip: ClipImportResult;
};

export default function ClipEditorWorkspace({ clip }: ClipEditorWorkspaceProps) {
  const initFromClip = useClipEditorStore((s) => s.initFromClip);
  const previewUrl = useClipEditorStore((s) => s.previewUrl);
  const editorStep = useClipEditorStore((s) => s.editorStep);

  useEffect(() => {
    clipDebug.log("workspace", "montage éditeur", {
      clipId: clip.id,
      previewUrl: clip.previewUrl,
      sourceUrl: clip.sourceUrl,
    });
    initFromClip(clip);
  }, [clip.id, clip.previewUrl, clip.sourceUrl, clip.duration, initFromClip]);

  if (!previewUrl) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-white/40">
        Initialisation de la preview…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-secondary-color/40 bg-background-secondary lg:mx-4 lg:flex-row lg:rounded-3xl xl:mx-6">
        <ClipEditorSidebar />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {editorStep === "layout" && <ClipEditorLayoutView />}
          {editorStep === "montage" && (
            <>
              <ClipEditorPreview />
              <ClipEditorTimeline />
            </>
          )}
          {editorStep === "subtitles" && <ClipEditorSubtitlesView />}
          {editorStep === "export" && <ClipEditorExportView />}
        </div>
      </div>
    </div>
  );
}
