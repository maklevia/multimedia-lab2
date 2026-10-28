export type ScaleName =
  | "major"
  | "minor"
  | "pentatonic"
  | "blues"
  | "chromatic";

export type MappingTarget = "pitch" | "velocity" | "duration" | "pan";

export type InstrumentId = "piano" | "bell" | "pad" | "bass";

export type Assignments = Record<MappingTarget, string | null>;

export type PresetId = "everything";

export interface MappingConfig {
  assignments: Assignments;
  /** Root note of the generated scale, as a MIDI note number. */
  root: number;
  scale: ScaleName;
  octaves: number;
  bpm: number;
  /** MIDI ticks per quarter note. */
  ppq: number;
  /** Distance between consecutive notes, in beats. */
  stepBeats: number;
  velocityMin: number;
  velocityMax: number;
  /** Note duration as a fraction of one step, from 0 to 1. */
  gateMin: number;
  gateMax: number;
  instrument: InstrumentId;
}

export interface NoteEvent {
  id: string;
  rowIndex: number;
  rowLabel: string;
  startTick: number;
  durationTicks: number;
  pitch: number;
  velocity: number;
  /** -1 = left, 0 = center, 1 = right. */
  pan: number;
  normalized: Partial<Record<MappingTarget, number>>;
  source: Partial<Record<MappingTarget, number | null>>;
}

export interface MappingResult {
  notes: NoteEvent[];
  totalTicks: number;
  normalizedColumns: Record<string, number[]>;
  usedColumnKeys: string[];
  warnings: string[];
  activeIndicatorCount: number;
}

export interface TargetDefinition {
  id: MappingTarget;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}

export interface ScaleDefinition {
  id: ScaleName;
  label: string;
  description: string;
  intervals: number[];
}

export interface InstrumentProfile {
  id: InstrumentId;
  label: string;
  description: string;
  /** General MIDI program number written to the .mid file. */
  program: number;
  harmonics: Array<{
    ratio: number;
    type: OscillatorType;
    gain: number;
  }>;
  attack: number;
  gain: number;
  filter?: {
    type: BiquadFilterType;
    frequency: number;
    q: number;
  };
}
