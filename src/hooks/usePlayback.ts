import { useCallback, useEffect, useRef, useState } from "react";
import { WebAudioPlayer } from "../audio/player";
import type { MappingConfig, NoteEvent } from "../domain/types";

export interface PlaybackController {
  isPlaying: boolean;
  progress: number;
  volume: number;
  play: () => Promise<void>;
  stop: () => void;
  setVolume: (value: number) => void;
}

export function usePlayback(
  notes: NoteEvent[],
  config: MappingConfig,
): PlaybackController {
  const playerRef = useRef<WebAudioPlayer | null>(null);
  if (!playerRef.current) {
    playerRef.current = new WebAudioPlayer();
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    setIsPlaying(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    stop();
  }, [notes, config, stop]);

  useEffect(() => {
    return () => playerRef.current?.stop();
  }, []);

  const play = useCallback(async () => {
    if (notes.length === 0) {
      throw new Error("There are no notes to play.");
    }

    try {
      playerRef.current?.setVolume(volume);
      setProgress(0);
      setIsPlaying(true);
      await playerRef.current?.play(notes, config, {
        onProgress: setProgress,
        onEnd: () => {
          setIsPlaying(false);
          setProgress(0);
        },
      });
    } catch (error) {
      setIsPlaying(false);
      setProgress(0);
      throw error;
    }
  }, [config, notes, volume]);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    playerRef.current?.setVolume(value);
  }, []);

  return {
    isPlaying,
    progress,
    volume,
    play,
    stop,
    setVolume,
  };
}
