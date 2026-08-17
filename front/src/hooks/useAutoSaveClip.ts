import { useEffect, useRef } from "react";
import { buildSavedClipEditorStateAsync } from "../lib/savedClip";
import { useUpdateSavedClip } from "./useSavedClips";
import { useClipEditorStore } from "../stores/clipEditorStore";

export function useAutoSaveClip(savedClipId: string | null) {
  const { mutateAsync } = useUpdateSavedClip();
  const setSaveStatus = useClipEditorStore((s) => s.setSaveStatus);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const mutateRef = useRef(mutateAsync);
  mutateRef.current = mutateAsync;

  useEffect(() => {
    lastSavedSnapshotRef.current = null;
  }, [savedClipId]);

  useEffect(() => {
    if (!savedClipId) return;

    const intervalId = window.setInterval(() => {
      if (isSavingRef.current) return;

      void (async () => {
        try {
          const editorState = await buildSavedClipEditorStateAsync();
          const snapshot = JSON.stringify(editorState);
          if (snapshot === lastSavedSnapshotRef.current) return;

          isSavingRef.current = true;
          setSaveStatus("saving");

          await mutateRef.current({ id: savedClipId, editorState });

          lastSavedSnapshotRef.current = snapshot;
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        } finally {
          isSavingRef.current = false;
        }
      })();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [savedClipId, setSaveStatus]);
}
