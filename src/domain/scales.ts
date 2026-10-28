import type { ScaleDefinition, ScaleName } from "./types";

export const SCALES: Record<ScaleName, ScaleDefinition> = {
  major: {
    id: "major",
    label: "Major",
    description: "Bright and stable. The default for melodic data.",
    intervals: [0, 2, 4, 5, 7, 9, 11],
  },
  minor: {
    id: "minor",
    label: "Natural minor",
    description: "Darker colour, still very familiar.",
    intervals: [0, 2, 3, 5, 7, 8, 10],
  },
  pentatonic: {
    id: "pentatonic",
    label: "Major pentatonic",
    description: "Five notes per octave — hard to make sound wrong.",
    intervals: [0, 2, 4, 7, 9],
  },
  blues: {
    id: "blues",
    label: "Blues",
    description: "Minor pentatonic with a blue note.",
    intervals: [0, 3, 5, 6, 7, 10],
  },
  chromatic: {
    id: "chromatic",
    label: "Chromatic",
    description: "All twelve semitones. Most literal, least tonal.",
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
};

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export function midiToNoteName(midi: number): string {
  const safe = Math.max(0, Math.min(127, Math.round(midi)));
  return `${NOTE_NAMES[safe % 12]}${Math.floor(safe / 12) - 1}`;
}

export function clampMidi(value: number): number {
  return Math.max(0, Math.min(127, Math.round(value)));
}

/**
 * Maps a normalized value in [0, 1] to a note in the chosen scale.
 * The top note is the root transposed by `octaves` octaves, so two
 * octaves produce a full two-octave span including both endpoints.
 */
export function mapPitchToMidi(
  normalized: number,
  root: number,
  scale: ScaleName,
  octaves: number,
): number {
  const intervals = SCALES[scale].intervals;
  const safeOctaves = Math.max(1, Math.min(4, Math.round(octaves)));
  const totalDegrees = intervals.length * safeOctaves + 1;
  const index = Math.round(
    Math.max(0, Math.min(1, normalized)) * (totalDegrees - 1),
  );
  const octave = Math.floor(index / intervals.length);
  const interval =
    index === intervals.length * safeOctaves
      ? 0
      : intervals[index % intervals.length];
  return clampMidi(root + octave * 12 + interval);
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
