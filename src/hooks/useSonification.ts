import { useCallback, useMemo, useState } from "react";
import { SAMPLE_DATASETS } from "../data/samples";
import { createConfigForDataset } from "../domain/config";
import { CsvError, parseCsv } from "../domain/csv";
import {
  buildNotes,
  defaultAssignments,
  durationSeconds,
} from "../domain/mapping";
import { writeMidi } from "../domain/midiWriter";
import type {
  Dataset,
  MappingConfig,
  MappingResult,
  MappingTarget,
  PresetId,
} from "../domain/types";
import { downloadMidi, downloadText } from "../lib/download";
import { slugify } from "../lib/filename";
import type { Notice } from "../types/ui";
import { useNotice } from "./useNotice";
import { usePlayback, type PlaybackController } from "./usePlayback";

const INITIAL_SAMPLE = SAMPLE_DATASETS[0];
const INITIAL_DATASET = parseCsv(INITIAL_SAMPLE.csv, INITIAL_SAMPLE.name);

export interface SonificationController {
  dataset: Dataset;
  activeSampleId: string | null;
  config: MappingConfig;
  preset: PresetId | "custom";
  result: MappingResult;
  activeRow: number | null;
  duration: number;
  canUseMidi: boolean;
  notice: Notice | null;
  setActiveRow: (row: number | null) => void;
  loadSample: (sampleId: string) => void;
  importFile: (file: File) => Promise<void>;
  downloadSample: () => void;
  applyPreset: (preset: PresetId) => void;
  selectCustomPreset: () => void;
  assignIndicator: (
    columnKey: string,
    target: MappingTarget | null,
  ) => void;
  exportMidi: () => void;
  play: () => Promise<void>;
  dismissNotice: () => void;
  playback: PlaybackController;
}

export function useSonification(): SonificationController {
  const [dataset, setDataset] = useState<Dataset>(INITIAL_DATASET);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(
    INITIAL_SAMPLE.id,
  );
  const [config, setConfig] = useState<MappingConfig>(() =>
    createConfigForDataset(INITIAL_DATASET),
  );
  const [preset, setPreset] = useState<PresetId | "custom">("everything");
  const [activeRow, setActiveRow] = useState<number | null>(null);

  const { notice, notify, dismiss } = useNotice();

  const result = useMemo(
    () => buildNotes(dataset, config),
    [dataset, config],
  );
  const duration = durationSeconds(result.totalTicks, config.bpm, config.ppq);
  const canUseMidi =
    result.activeIndicatorCount >= 2 && result.notes.length > 0;
  const playback = usePlayback(result.notes, config);

  const loadDataset = useCallback((next: Dataset, sampleId: string | null) => {
    setDataset(next);
    setActiveSampleId(sampleId);
    setActiveRow(null);
    setPreset("everything");
    setConfig(createConfigForDataset(next));
  }, []);

  const loadSample = useCallback(
    (sampleId: string) => {
      const sample = SAMPLE_DATASETS.find((item) => item.id === sampleId);
      if (!sample) return;

      try {
        const parsed = parseCsv(sample.csv, sample.name);
        loadDataset(parsed, sample.id);
        notify(
          "info",
          `Loaded ${sample.name}: ${parsed.rowLabels.length} rows, ${parsed.columns.length} indicators.`,
        );
      } catch (error) {
        notify(
          "error",
          error instanceof Error
            ? error.message
            : "Could not load the sample dataset.",
        );
      }
    },
    [loadDataset, notify],
  );

  const importFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const name = file.name.replace(/\.csv$/i, "").trim() || "Imported data";
        const parsed = parseCsv(text, name);
        loadDataset(parsed, null);
        notify(
          "success",
          `Imported ${parsed.rowLabels.length} rows and ${parsed.columns.length} numeric indicators.`,
        );
      } catch (error) {
        notify(
          "error",
          error instanceof CsvError
            ? error.message
            : "Could not read that CSV file.",
        );
      }
    },
    [loadDataset, notify],
  );

  const downloadSample = useCallback(() => {
    const sample = SAMPLE_DATASETS.find(
      (item) => item.id === activeSampleId,
    );
    if (!sample) return;

    downloadText(sample.csv, `${sample.id}.csv`, "text/csv;charset=utf-8");
    notify("success", "Sample CSV downloaded.");
  }, [activeSampleId, notify]);

  const applyPreset = useCallback(
    (nextPreset: PresetId) => {
      setConfig((previous) => ({
        ...previous,
        assignments: defaultAssignments(dataset.columns),
      }));
      setPreset(nextPreset);
    },
    [dataset.columns],
  );

  const selectCustomPreset = useCallback(() => {
    setPreset("custom");
  }, []);

  const assignIndicator = useCallback(
    (columnKey: string, target: MappingTarget | null) => {
      setConfig((previous) => {
        const assignments = { ...previous.assignments };
        const oldTarget = (
          Object.keys(assignments) as MappingTarget[]
        ).find((key) => assignments[key] === columnKey);

        if (oldTarget) {
          assignments[oldTarget] = null;
        }

        if (target) {
          const displaced = assignments[target];
          assignments[target] = columnKey;
          if (displaced && oldTarget) {
            assignments[oldTarget] = displaced;
          }
        }

        return { ...previous, assignments };
      });
      setPreset("custom");
    },
    [],
  );

  const exportMidi = useCallback(() => {
    if (!canUseMidi) {
      notify(
        "error",
        "Map at least two indicators and load data before exporting.",
      );
      return;
    }

    const bytes = writeMidi(
      result.notes,
      config,
      `Sonification - ${dataset.name}`,
    );
    downloadMidi(bytes, `${slugify(dataset.name)}.mid`);
    notify("success", `Exported ${result.notes.length} notes to MIDI.`);
  }, [canUseMidi, config, dataset.name, notify, result.notes]);

  const play = useCallback(async () => {
    if (!canUseMidi) {
      notify(
        "error",
        "Map at least two indicators before playing the sonification.",
      );
      return;
    }

    try {
      await playback.play();
    } catch (error) {
      notify(
        "error",
        error instanceof Error
          ? `Audio preview failed: ${error.message}`
          : "Audio preview is not available in this browser.",
      );
    }
  }, [canUseMidi, notify, playback.play]);

  return {
    dataset,
    activeSampleId,
    config,
    preset,
    result,
    activeRow,
    duration,
    canUseMidi,
    notice,
    setActiveRow,
    loadSample,
    importFile,
    downloadSample,
    applyPreset,
    selectCustomPreset,
    assignIndicator,
    exportMidi,
    play,
    dismissNotice: dismiss,
    playback,
  };
}
