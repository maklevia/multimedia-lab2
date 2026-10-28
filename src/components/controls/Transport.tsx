import { Keyboard, Play, Square, Volume2 } from "lucide-react";
import { formatDuration } from "../../domain/mapping";

interface TransportProps {
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  bpm: number;
  canPlay: boolean;
  onPlay: () => void;
  onStop: () => void;
  onVolume: (value: number) => void;
}

export default function Transport({
  isPlaying,
  progress,
  duration,
  volume,
  bpm,
  canPlay,
  onPlay,
  onStop,
  onVolume,
}: TransportProps) {
  const current = progress * duration;

  return (
    <div className={`transport${isPlaying ? " is-playing" : ""}`}>
      <button
        type="button"
        className="play-button"
        onClick={isPlaying ? onStop : onPlay}
        disabled={!canPlay && !isPlaying}
        aria-label={isPlaying ? "Stop playback" : "Play composition"}
      >
        {isPlaying ? (
          <Square size={22} fill="currentColor" />
        ) : (
          <Play size={24} fill="currentColor" />
        )}
        <span>{isPlaying ? "Stop" : "Play"}</span>
      </button>

      <div className="transport-main">
        <div className="transport-meta">
          <span className="transport-time">
            {formatDuration(current)}
            <small>/ {formatDuration(duration)}</small>
          </span>
          <span className="transport-bpm">{bpm} BPM</span>
          <div className="equalizer" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="Playback progress"
        >
          <div
            className="progress-fill"
            style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
          />
        </div>
      </div>

      <label className="volume-control">
        <Volume2 size={16} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => onVolume(Number(event.target.value))}
          aria-label="Playback volume"
        />
      </label>

      <span className="keyboard-hint">
        <Keyboard size={14} />
        <kbd>Space</kbd>
      </span>
    </div>
  );
}
