import { useEffect, useRef } from "react";
import type { SoundboardClip } from "../lib/clipSoundboards";

type UseClipSoundboardPlaybackOptions = {
  clips: SoundboardClip[];
  sequenceTime: number;
  sourceTime: number;
  isPlaying: boolean;
  previewVolume: number;
};

function isClipActiveAtPlayhead(
  clip: SoundboardClip,
  sequenceTime: number,
  sourceTime: number,
): boolean {
  if (clip.usesSequenceTime) {
    return sequenceTime >= clip.start && sequenceTime < clip.end;
  }
  return sourceTime >= clip.start && sourceTime < clip.end;
}

function getClipPlaybackTime(
  clip: SoundboardClip,
  sequenceTime: number,
  sourceTime: number,
): number {
  return clip.usesSequenceTime ? sequenceTime : sourceTime;
}

export function useClipSoundboardPlayback({
  clips,
  sequenceTime,
  sourceTime,
  isPlaying,
  previewVolume,
}: UseClipSoundboardPlaybackOptions) {
  const activeAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playedStartsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isPlaying) {
      for (const audio of activeAudiosRef.current.values()) {
        audio.pause();
      }
      activeAudiosRef.current.clear();
      playedStartsRef.current.clear();
      return;
    }

    for (const clip of clips) {
      const inRange = isClipActiveAtPlayhead(clip, sequenceTime, sourceTime);
      const key = `${clip.id}-${clip.start.toFixed(3)}`;

      if (!inRange) {
        const active = activeAudiosRef.current.get(clip.id);
        if (active) {
          active.pause();
          activeAudiosRef.current.delete(clip.id);
        }
        continue;
      }

      if (playedStartsRef.current.has(key)) continue;

      const playbackTime = getClipPlaybackTime(clip, sequenceTime, sourceTime);
      const offset = Math.max(0, playbackTime - clip.start);
      const audio = new Audio(clip.src);
      audio.volume = Math.max(0, Math.min(1, clip.volume * previewVolume));
      audio.currentTime = offset;
      void audio.play().catch(() => undefined);
      activeAudiosRef.current.set(clip.id, audio);
      playedStartsRef.current.add(key);

      audio.addEventListener(
        "ended",
        () => {
          activeAudiosRef.current.delete(clip.id);
        },
        { once: true },
      );
    }
  }, [clips, isPlaying, previewVolume, sequenceTime, sourceTime]);

  useEffect(
    () => () => {
      for (const audio of activeAudiosRef.current.values()) {
        audio.pause();
      }
      activeAudiosRef.current.clear();
    },
    [],
  );
}
