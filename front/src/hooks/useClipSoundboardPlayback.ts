import { useEffect, useMemo, useRef } from "react";
import { clipDebug } from "../lib/clipDebug";
import {
  isPersistedSoundboardSrc,
  mapSoundboardsToSequence,
  resolveSoundboardPlaybackVolume,
  type PackedSoundboardClip,
  type SoundboardClip,
} from "../lib/clipSoundboards";
import type { TimeRange } from "../lib/clipTime";
import type { TimelineVideoClip } from "../lib/clipTimelineVideos";

type UseClipSoundboardPlaybackOptions = {
  clips: SoundboardClip[];
  keepSegments: TimeRange[];
  timelineVideos: TimelineVideoClip[];
  sequenceTime: number;
  isPlaying: boolean;
  previewVolume: number;
};

function buildPlaybackKey(clip: PackedSoundboardClip): string {
  return `${clip.id}-${clip.sequenceStart.toFixed(3)}`;
}

async function startSoundboardAudio(
  clip: PackedSoundboardClip,
  sequenceTime: number,
  previewVolume: number,
): Promise<HTMLAudioElement | null> {
  if (!isPersistedSoundboardSrc(clip.src)) {
    clipDebug.warn("soundboard", "src invalide ou blob expiré", {
      id: clip.id,
      label: clip.label,
      src: clip.src.slice(0, 32),
    });
    return null;
  }

  const volume = resolveSoundboardPlaybackVolume(clip.volume, previewVolume);
  if (volume <= 0) {
    clipDebug.log("soundboard", "volume à 0, lecture ignorée", {
      id: clip.id,
      label: clip.label,
    });
    return null;
  }

  const offset = Math.max(0, sequenceTime - clip.sequenceStart);
  const audio = new Audio(clip.src);
  audio.volume = volume;
  audio.currentTime = offset;

  try {
    await audio.play();
    return audio;
  } catch (error) {
    clipDebug.warn("soundboard", "play() échoué", {
      id: clip.id,
      label: clip.label,
      error,
    });
    audio.pause();
    audio.src = "";
    return null;
  }
}

export function useClipSoundboardPlayback({
  clips,
  keepSegments,
  timelineVideos,
  sequenceTime,
  isPlaying,
  previewVolume,
}: UseClipSoundboardPlaybackOptions) {
  const activeAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playedStartsRef = useRef<Set<string>>(new Set());
  const startingKeysRef = useRef<Set<string>>(new Set());
  const isPlayingRef = useRef(isPlaying);
  const sequenceTimeRef = useRef(sequenceTime);
  const previewVolumeRef = useRef(previewVolume);

  isPlayingRef.current = isPlaying;
  sequenceTimeRef.current = sequenceTime;
  previewVolumeRef.current = previewVolume;

  const packedClips = useMemo(
    () => mapSoundboardsToSequence(clips, keepSegments, timelineVideos),
    [clips, keepSegments, timelineVideos],
  );

  const packedClipsById = useMemo(
    () => new Map(packedClips.map((clip) => [clip.id, clip])),
    [packedClips],
  );

  useEffect(() => {
    for (const [clipId, audio] of activeAudiosRef.current.entries()) {
      const clip = packedClipsById.get(clipId);
      if (!clip) continue;
      audio.volume = resolveSoundboardPlaybackVolume(
        clip.volume,
        previewVolume,
      );
    }
  }, [packedClipsById, previewVolume]);

  useEffect(() => {
    if (!isPlaying) {
      for (const audio of activeAudiosRef.current.values()) {
        audio.pause();
      }
      activeAudiosRef.current.clear();
      playedStartsRef.current.clear();
      startingKeysRef.current.clear();
      return;
    }

    const activeIds = new Set<string>();

    for (const clip of packedClips) {
      const inRange =
        sequenceTime >= clip.sequenceStart && sequenceTime < clip.sequenceEnd;
      const key = buildPlaybackKey(clip);

      if (!inRange) {
        playedStartsRef.current.delete(key);
        startingKeysRef.current.delete(key);

        const active = activeAudiosRef.current.get(clip.id);
        if (active) {
          active.pause();
          activeAudiosRef.current.delete(clip.id);
        }
        continue;
      }

      activeIds.add(clip.id);

      if (
        playedStartsRef.current.has(key) ||
        startingKeysRef.current.has(key) ||
        activeAudiosRef.current.has(clip.id)
      ) {
        continue;
      }

      startingKeysRef.current.add(key);

      void startSoundboardAudio(
        clip,
        sequenceTime,
        previewVolumeRef.current,
      ).then((audio) => {
        startingKeysRef.current.delete(key);

        if (!audio || !isPlayingRef.current) {
          audio?.pause();
          return;
        }

        const currentSequenceTime = sequenceTimeRef.current;
        const stillInRange =
          currentSequenceTime >= clip.sequenceStart &&
          currentSequenceTime < clip.sequenceEnd;
        if (!stillInRange) {
          audio.pause();
          return;
        }

        playedStartsRef.current.add(key);
        activeAudiosRef.current.set(clip.id, audio);

        audio.addEventListener(
          "ended",
          () => {
            activeAudiosRef.current.delete(clip.id);
            playedStartsRef.current.delete(key);
          },
          { once: true },
        );
      });
    }

    for (const [clipId, audio] of activeAudiosRef.current.entries()) {
      if (!activeIds.has(clipId)) {
        audio.pause();
        activeAudiosRef.current.delete(clipId);
      }
    }
  }, [isPlaying, packedClips, sequenceTime]);

  useEffect(
    () => () => {
      for (const audio of activeAudiosRef.current.values()) {
        audio.pause();
      }
      activeAudiosRef.current.clear();
      playedStartsRef.current.clear();
      startingKeysRef.current.clear();
    },
    [],
  );
}
