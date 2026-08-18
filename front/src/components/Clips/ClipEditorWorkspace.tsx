import { useEffect, useLayoutEffect } from "react";
import type { ClipImportResult } from "../../../types";
import type { SavedClipEditorStateV1 } from "../../lib/savedClip";
import { clipDebug } from "../../lib/clipDebug";
import { useAutoSaveClip } from "../../hooks/useAutoSaveClip";
import { useClipEditorStore } from "../../stores/clipEditorStore";
import ClipEditorExportView from "./ClipEditorExportView";
import ClipEditorLayoutView from "./ClipEditorLayoutView";
import ClipEditorMontageSplit from "./ClipEditorMontageSplit";
import ClipEditorSidebar from "./ClipEditorSidebar";
import ClipEditorSubtitlesView from "./ClipEditorSubtitlesView";

type ClipEditorWorkspaceProps = {
  clip: ClipImportResult;
  savedClipId: string | null;
  savedClipName?: string;
  initialEditorState?: SavedClipEditorStateV1 | null;
  startOnMontage?: boolean;
};

export default function ClipEditorWorkspace({
  clip,
  savedClipId,
  savedClipName = "",
  initialEditorState = null,
  startOnMontage = false,
}: ClipEditorWorkspaceProps) {
  const initFromClip = useClipEditorStore((s) => s.initFromClip);
  const initFromSavedClip = useClipEditorStore((s) => s.initFromSavedClip);
  const reset = useClipEditorStore((s) => s.reset);
  const setSavedClipMeta = useClipEditorStore((s) => s.setSavedClipMeta);
  const setEditorStep = useClipEditorStore((s) => s.setEditorStep);
  const previewUrl = useClipEditorStore((s) => s.previewUrl);
  const editorStep = useClipEditorStore((s) => s.editorStep);

  useAutoSaveClip(savedClipId);

  useLayoutEffect(() => {
    if (savedClipId && !initialEditorState) {
      return;
    }

    clipDebug.log("workspace", "montage éditeur", {
      clipId: clip.id,
      previewUrl: clip.previewUrl,
      sourceUrl: clip.sourceUrl,
      hasSavedState: Boolean(initialEditorState),
      keepSegments: initialEditorState?.keepSegments.length ?? 0,
      zoomEffects: initialEditorState?.zoomEffects.length ?? 0,
    });

    if (initialEditorState) {
      initFromSavedClip(clip, initialEditorState);
    } else {
      initFromClip(clip);
    }

    if (startOnMontage) {
      setEditorStep("montage");
    }

    if (savedClipId) {
      setSavedClipMeta(savedClipId, savedClipName);
    }
  }, [
    clip.id,
    clip.previewUrl,
    clip.sourceUrl,
    clip.duration,
    initFromClip,
    initFromSavedClip,
    initialEditorState,
    savedClipId,
    savedClipName,
    setSavedClipMeta,
    setEditorStep,
    startOnMontage,
  ]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  if (savedClipId && !initialEditorState) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-white/40">
        Chargement du montage…
      </div>
    );
  }

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
          {editorStep === "montage" && <ClipEditorMontageSplit />}
          {editorStep === "subtitles" && <ClipEditorSubtitlesView />}
          {editorStep === "export" && <ClipEditorExportView />}
        </div>
      </div>
    </div>
  );
}
