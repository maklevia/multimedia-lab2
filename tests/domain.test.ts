import { describe, expect, it } from "vitest";
import { Midi } from "@tonejs/midi";
import { parseCsv, CsvError } from "../src/domain/csv";
import {
  DEFAULT_CONFIG,
  PRESETS,
  buildNotes,
  defaultAssignments,
  durationSeconds,
} from "../src/domain/mapping";
import { encodeVLQ, writeMidi } from "../src/domain/midiWriter";
import { normalizeValues } from "../src/domain/normalize";
import { mapPitchToMidi } from "../src/domain/scales";
import type {
  Dataset,
  MappingConfig,
  NumericColumn,
} from "../src/domain/types";
import { SAMPLE_DATASETS } from "../src/data/samples";

function column(
  key: string,
  values: Array<number | null>,
): NumericColumn {
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  return {
    key,
    label: key,
    values,
    min: Math.min(...valid),
    max: Math.max(...valid),
    numericCount: valid.length,
  };
}

function makeDataset(): Dataset {
  return {
    name: "test",
    rowLabels: ["A", "B", "C"],
    columns: [
      column("pitch", [0, 1, 2]),
      column("velocity", [10, 20, 30]),
      column("duration", [100, 200, 300]),
    ],
  };
}

function makeConfig(overrides: Partial<MappingConfig> = {}): MappingConfig {
  return {
    ...DEFAULT_CONFIG,
    assignments: {
      pitch: "pitch",
      velocity: "velocity",
      duration: "duration",
      pan: null,
    },
    ...overrides,
  };
}

describe("normalizeValues", () => {
  it("maps min/max to 0..1 and keeps the middle", () => {
    expect(normalizeValues([10, 20, 30])).toEqual([0, 0.5, 1]);
  });

  it("handles negative ranges", () => {
    expect(normalizeValues([-10, 0, 10])).toEqual([0, 0.5, 1]);
  });

  it("returns 0.5 for constant data", () => {
    expect(normalizeValues([7, 7, 7])).toEqual([0.5, 0.5, 0.5]);
  });

  it("fills missing values with 0.5", () => {
    expect(normalizeValues([0, null, 2])).toEqual([0, 0.5, 1]);
  });
});

describe("pitch mapping", () => {
  it("spans exactly two octaves in C major", () => {
    expect(mapPitchToMidi(0, 60, "major", 2)).toBe(60);
    expect(mapPitchToMidi(1, 60, "major", 2)).toBe(84);
    expect(mapPitchToMidi(0.5, 60, "major", 2)).toBe(72);
  });

  it("quantizes to the chosen scale", () => {
    const notes = [0, 0.2, 0.4, 0.6, 0.8, 1].map((value) =>
      mapPitchToMidi(value, 60, "pentatonic", 1),
    );
    for (const note of notes) {
      expect([0, 2, 4, 7, 9, 12]).toContain(note - 60);
    }
  });
});

describe("buildNotes", () => {
  it("maps three indicators to pitch, velocity and duration", () => {
    const dataset = makeDataset();
    const result = buildNotes(dataset, makeConfig());

    expect(result.notes).toHaveLength(3);
    expect(result.activeIndicatorCount).toBe(3);
    expect(result.notes.map((note) => note.pitch)).toEqual([60, 72, 84]);
    expect(result.notes.map((note) => note.velocity)).toEqual([40, 80, 120]);
    expect(result.notes[0].durationTicks).toBeLessThan(
      result.notes[2].durationTicks,
    );
    expect(result.notes[0].startTick).toBe(0);
    expect(result.notes[1].startTick).toBe(480);
  });

  it("uses 0.5 for a constant indicator", () => {
    const dataset = makeDataset();
    dataset.columns[0] = column("pitch", [5, 5, 5]);
    const result = buildNotes(dataset, makeConfig());
    expect(result.notes.every((note) => note.pitch === 72)).toBe(true);
  });

  it("warns when fewer than two indicators are mapped", () => {
    const dataset = makeDataset();
    const config = makeConfig({
      assignments: {
        pitch: "pitch",
        velocity: null,
        duration: null,
        pan: null,
      },
    });
    const result = buildNotes(dataset, config);
    expect(result.activeIndicatorCount).toBe(1);
    expect(result.warnings.join(" ")).toContain("at least two");
  });

  it("preserves source values for the inspector and report", () => {
    const result = buildNotes(makeDataset(), makeConfig());
    expect(result.notes[2].source.pitch).toBe(2);
    expect(result.notes[2].normalized.pitch).toBe(1);
    expect(result.notes[2].rowLabel).toBe("C");
  });

  it("computes a useful total duration", () => {
    const result = buildNotes(makeDataset(), makeConfig());
    const seconds = durationSeconds(result.totalTicks, 100, 480);
    expect(seconds).toBeGreaterThan(1);
  });
});

describe("assignments", () => {
  it("auto-maps up to four columns in order", () => {
    const columns = [
      ...makeDataset().columns,
      column("pan", [1, 2, 3]),
    ];
    expect(defaultAssignments(columns)).toEqual({
      pitch: "pitch",
      velocity: "velocity",
      duration: "duration",
      pan: "pan",
    });
  });

  it("offers only the Everything preset", () => {
    expect(PRESETS.map((preset) => preset.id)).toEqual(["everything"]);
  });
});

describe("MIDI variable-length quantity", () => {
  it("encodes boundary values", () => {
    expect(encodeVLQ(0)).toEqual([0x00]);
    expect(encodeVLQ(127)).toEqual([0x7f]);
    expect(encodeVLQ(128)).toEqual([0x81, 0x00]);
    expect(encodeVLQ(0x3fff)).toEqual([0xff, 0x7f]);
    expect(encodeVLQ(0x4000)).toEqual([0x81, 0x80, 0x00]);
  });

  it("rejects negative values", () => {
    expect(() => encodeVLQ(-1)).toThrow();
  });
});

describe("writeMidi", () => {
  it("writes a parseable standard MIDI file", () => {
    const dataset = makeDataset();
    const config = makeConfig();
    const result = buildNotes(dataset, config);
    const bytes = writeMidi(result.notes, config, "Test sonification");
    const midi = new Midi(bytes);

    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("MThd");
    expect(midi.header.ppq).toBe(480);
    expect(midi.tracks).toHaveLength(1);
    expect(midi.tracks[0].notes).toHaveLength(3);
    expect(midi.tracks[0].notes.map((note) => note.midi)).toEqual([
      60, 72, 84,
    ]);
    expect(midi.tracks[0].notes.map((note) => note.ticks)).toEqual([
      0, 480, 960,
    ]);
    expect(midi.header.tempos[0].bpm).toBeCloseTo(108, 3);
  });

  it("emits pan control changes only when pan is mapped", () => {
    const dataset = makeDataset();
    const result = buildNotes(
      dataset,
      makeConfig({
        assignments: {
          pitch: "pitch",
          velocity: "velocity",
          duration: "duration",
          pan: null,
        },
      }),
    );
    const withoutPan = new Midi(writeMidi(result.notes, makeConfig()));
    expect(withoutPan.tracks[0].controlChanges[10]).toBeUndefined();

    const withPanConfig = makeConfig({
      assignments: {
        pitch: "pitch",
        velocity: "velocity",
        duration: "duration",
        pan: "velocity",
      },
    });
    const withPan = new Midi(writeMidi(result.notes, withPanConfig));
    expect(withPan.tracks[0].controlChanges[10]).toBeDefined();
  });

  it("keeps note-off before note-on at the same tick", () => {
    const dataset = makeDataset();
    const result = buildNotes(dataset, makeConfig());
    const midi = new Midi(writeMidi(result.notes, makeConfig()));
    expect(midi.tracks[0].notes[0].durationTicks).toBeGreaterThan(0);
    expect(midi.tracks[0].notes[1].ticks).toBe(480);
  });
});

describe("CSV parsing", () => {
  it("parses the weather sample", () => {
    const sample = SAMPLE_DATASETS[0];
    const dataset = parseCsv(sample.csv, sample.name);
    expect(dataset.rowLabels).toHaveLength(24);
    expect(dataset.columns.map((item) => item.key)).toEqual([
      "temperature_c",
      "humidity_pct",
      "pressure_hpa",
    ]);
    expect(dataset.rowLabels[0]).toBe("09:00");
    expect(dataset.columns[0].min).toBe(16.8);
  });

  it("rejects a CSV with fewer than two numeric columns", () => {
    const csv = "time,value\n09:00,10\n10:00,20\n";
    expect(() => parseCsv(csv)).toThrow(CsvError);
  });

  it("skips empty rows and handles comma decimals", () => {
    const csv = 'name,a,b\nx,1,5\n\ny,2,"6,5"\n';
    const dataset = parseCsv(csv);
    expect(dataset.rowLabels).toEqual(["x", "y"]);
    expect(dataset.columns[0].values).toEqual([1, 2]);
    expect(dataset.columns[1].values).toEqual([5, 6.5]);
  });

  it("accepts negative and decimal values", () => {
    const csv = 'label,a,b\nx,-2.5,1.25\ny,0,"2,5"\n';
    const dataset = parseCsv(csv);
    expect(dataset.columns[0].values).toEqual([-2.5, 0]);
    expect(dataset.columns[1].values).toEqual([1.25, 2.5]);
  });

  it("treats letters and other non-numeric strings as missing values", () => {
    const csv = "label,a,b\nx,abc,1\ny,2,3\nz,4,5\n";
    const dataset = parseCsv(csv);
    expect(dataset.columns[0].values).toEqual([null, 2, 4]);
    expect(dataset.columns[1].values).toEqual([1, 3, 5]);
  });

  it("rejects the file when a column has too few parseable numbers", () => {
    const csv =
      "label,a,b\nx,abc,1\ny,def,3\nz,ghi,5\nw,jkl,7\nv,8,9\n";
    expect(() => parseCsv(csv)).toThrow(CsvError);
  });
});

