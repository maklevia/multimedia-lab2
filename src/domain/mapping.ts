import { normalizeColumns } from "./normalize";
import { clampMidi, mapPitchToMidi } from "./scales";
import type {
  Assignments,
  Dataset,
  MappingConfig,
  MappingResult,
  MappingTarget,
  NoteEvent,
  PresetId,
  TargetDefinition,
} from "./types";

export const TARGETS: TargetDefinition[] = [
  {
    id: "pitch",
    label: "Pitch",
    shortLabel: "Pitch",
    description: "Maps the value to the note height inside the selected scale.",
    color: "#6ee7b7",
  },
  {
    id: "velocity",
    label: "Velocity",
    shortLabel: "Vel",
    description: "Maps the value to how hard the note is played.",
    color: "#fbbf24",
  },
  {
    id: "duration",
    label: "Duration",
    shortLabel: "Dur",
    description: "Maps the value to the length of the note.",
    color: "#60a5fa",
  },
  {
    id: "pan",
    label: "Pan",
    shortLabel: "Pan",
    description: "Maps the value to the stereo position (MIDI CC 10).",
    color: "#f472b6",
  },
];

export const TARGET_BY_ID = Object.fromEntries(
  TARGETS.map((target) => [target.id, target]),
) as Record<MappingTarget, TargetDefinition>;

const DEFAULT_TARGET_ORDER: MappingTarget[] = [
  "pitch",
  "velocity",
  "duration",
  "pan",
];

export const MAX_NOTES = 256;

export const DEFAULT_CONFIG: MappingConfig = {
  assignments: {
    pitch: null,
    velocity: null,
    duration: null,
    pan: null,
  },
  root: 60,
  scale: "major",
  octaves: 2,
  bpm: 108,
  ppq: 480,
  stepBeats: 1,
  velocityMin: 40,
  velocityMax: 120,
  gateMin: 0.3,
  gateMax: 0.95,
  instrument: "piano",
};

export const PRESETS: Array<{
  id: PresetId;
  label: string;
  description: string;
}> = [
  {
    id: "everything",
    label: "Everything",
    description:
      "Pitch + velocity + duration + pan, using up to four indicators.",
  },
];

function emptyAssignments(): Assignments {
  return {
    pitch: null,
    velocity: null,
    duration: null,
    pan: null,
  };
}

export function assignSequential(
  columns: Dataset["columns"],
  targets: MappingTarget[],
): Assignments {
  const assignments = emptyAssignments();
  columns.slice(0, targets.length).forEach((column, index) => {
    assignments[targets[index]] = column.key;
  });
  return assignments;
}

export function defaultAssignments(
  columns: Dataset["columns"],
): Assignments {
  return assignSequential(columns, DEFAULT_TARGET_ORDER);
}

function finiteOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

export function buildNotes(
  dataset: Dataset,
  config: MappingConfig,
): MappingResult {
  const warnings: string[] = [];
  const normalizedColumns = normalizeColumns(dataset.columns);
  const columnByKey = new Map(
    dataset.columns.map((column) => [column.key, column]),
  );

  const rows = Math.min(dataset.rowLabels.length, MAX_NOTES);
  if (dataset.rowLabels.length > MAX_NOTES) {
    warnings.push(
      `Only the first ${MAX_NOTES} rows are used. Aggregate or trim the dataset for a longer composition.`,
    );
  }

  const activeColumns = new Map<MappingTarget, string>();
  (Object.entries(config.assignments) as Array<[MappingTarget, string | null]>)
    .forEach(([target, columnKey]) => {
      if (columnKey && columnByKey.has(columnKey)) {
        activeColumns.set(target, columnKey);
      }
    });

  const usedColumnKeys = [...new Set(activeColumns.values())];
  if (usedColumnKeys.length < 2) {
    warnings.push(
      "Map at least two numeric columns to MIDI parameters. The lab requires two indicators.",
    );
  }

  const ignoredColumns = dataset.columns.filter(
    (column) => !usedColumnKeys.includes(column.key),
  );
  if (ignoredColumns.length > 0) {
    warnings.push(
      `${ignoredColumns.length} numeric column${
        ignoredColumns.length === 1 ? " is" : "s are"
      } not mapped and will not affect the sound.`,
    );
  }

  const stepTicks = Math.max(
    1,
    Math.round(config.stepBeats * config.ppq),
  );
  const effectiveVelocityMin = Math.max(
    1,
    Math.min(127, Math.round(config.velocityMin)),
  );
  const effectiveVelocityMax = Math.max(
    1,
    Math.min(127, Math.round(config.velocityMax)),
  );
  const velocityLow = Math.min(effectiveVelocityMin, effectiveVelocityMax);
  const velocityHigh = Math.max(effectiveVelocityMin, effectiveVelocityMax);
  const gateLow = Math.max(0.05, Math.min(1, config.gateMin));
  const gateHigh = Math.max(gateLow, Math.min(1, config.gateMax));

  const notes: NoteEvent[] = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const source: NoteEvent["source"] = {};
    const normalized: NoteEvent["normalized"] = {};

    for (const [target, columnKey] of activeColumns) {
      const column = columnByKey.get(columnKey);
      if (!column) continue;
      source[target] = column.values[rowIndex] ?? null;
      normalized[target] = normalizedColumns[columnKey]?.[rowIndex] ?? 0.5;
    }

    const pitchNorm = finiteOr(normalized.pitch, 0.5);
    const velocityNorm = finiteOr(normalized.velocity, 0.5);
    const durationNorm = finiteOr(normalized.duration, 0.8);
    const panNorm = normalized.pan;

    const pitch = mapPitchToMidi(
      pitchNorm,
      config.root,
      config.scale,
      config.octaves,
    );
    const velocity = Math.round(
      velocityLow + velocityNorm * (velocityHigh - velocityLow),
    );
    const gate = activeColumns.has("duration")
      ? gateLow + durationNorm * (gateHigh - gateLow)
      : 0.8;
    const durationTicks = Math.max(1, Math.round(stepTicks * gate));
    const pan = panNorm === undefined ? 0 : panNorm * 2 - 1;

    notes.push({
      id: `note-${rowIndex}`,
      rowIndex,
      rowLabel: dataset.rowLabels[rowIndex] ?? `Row ${rowIndex + 1}`,
      startTick: rowIndex * stepTicks,
      durationTicks,
      pitch: clampMidi(pitch),
      velocity: Math.max(1, Math.min(127, velocity)),
      pan: Math.max(-1, Math.min(1, pan)),
      normalized,
      source,
    });
  }

  if (notes.length === 0) {
    warnings.push("The dataset has no rows to sonify.");
  }

  const totalTicks = notes.reduce(
    (max, note) => Math.max(max, note.startTick + note.durationTicks),
    0,
  );

  return {
    notes,
    totalTicks,
    normalizedColumns,
    usedColumnKeys,
    warnings,
    activeIndicatorCount: usedColumnKeys.length,
  };
}

export function durationSeconds(
  totalTicks: number,
  bpm: number,
  ppq: number,
): number {
  if (totalTicks <= 0 || bpm <= 0 || ppq <= 0) return 0;
  return (totalTicks / ppq) * (60 / bpm);
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
