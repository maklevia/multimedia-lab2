import {
  AlertTriangle,
  Check,
  SlidersHorizontal,
  Wand2,
} from "lucide-react";
import { PRESETS, TARGETS, TARGET_BY_ID } from "../../domain/mapping";
import type {
  Dataset,
  MappingConfig,
  MappingTarget,
  PresetId,
} from "../../domain/types";
import Panel from "../ui/Panel";

interface MappingPanelProps {
  dataset: Dataset;
  config: MappingConfig;
  preset: PresetId | "custom";
  onAssign: (columnKey: string, target: MappingTarget | null) => void;
  onApplyPreset: (preset: PresetId) => void;
  onSelectCustom: () => void;
}

export default function MappingPanel({
  dataset,
  config,
  preset,
  onAssign,
  onApplyPreset,
  onSelectCustom,
}: MappingPanelProps) {
  const activeCount = new Set(
    Object.values(config.assignments).filter(
      (value): value is string => value !== null,
    ),
  ).size;
  const activePreset = PRESETS.find((item) => item.id === preset);

  return (
    <Panel
      step="02"
      title="Mapping"
      description="Choose which indicator drives each MIDI parameter."
      icon={<SlidersHorizontal size={18} />}
    >
      <div className="preset-row">
        <label className="field-label" htmlFor="preset-select">
          Preset
        </label>
        <select
          id="preset-select"
          className="select"
          value={preset}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "custom") {
              onSelectCustom();
            } else {
              onApplyPreset(value as PresetId);
            }
          }}
        >
          {PRESETS.map((item) => (
            <option value={item.id} key={item.id}>
              {item.label}
            </option>
          ))}
          <option value="custom">Custom mapping</option>
        </select>
      </div>

      <p className="helper-text">
        {activePreset
          ? activePreset.description
          : "Custom mapping. Every active column still influences at least one MIDI parameter."}
      </p>

      <div className="mapping-list">
        {dataset.columns.map((column) => {
          const target = TARGETS.find(
            (item) => config.assignments[item.id] === column.key,
          );
          return (
            <div
              className={`mapping-row${target ? " is-mapped" : ""}`}
              key={column.key}
            >
              <div className="mapping-source">
                <span
                  className="target-dot"
                  style={{
                    background: target ? target.color : "var(--muted-2)",
                  }}
                />
                <div>
                  <strong>{column.label}</strong>
                  <small>
                    {column.min.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    –{" "}
                    {column.max.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </small>
                </div>
              </div>

              <select
                className="select select-compact"
                value={target?.id ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  onAssign(
                    column.key,
                    value === "" ? null : (value as MappingTarget),
                  );
                }}
                aria-label={`MIDI target for ${column.label}`}
                title={
                  target
                    ? TARGET_BY_ID[target.id].description
                    : "This column will not affect the sound"
                }
              >
                <option value="">Not used</option>
                {TARGETS.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="mapping-footer">
        <div
          className={`validation-badge${
            activeCount >= 2 ? " is-ok" : " is-warning"
          }`}
        >
          {activeCount >= 2 ? <Check size={14} /> : <AlertTriangle size={14} />}
          {activeCount} / {dataset.columns.length} indicators mapped
        </div>
        <button
          type="button"
          className="icon-text-button"
          onClick={() => onApplyPreset("everything")}
          title="Map the first four numeric columns in order"
        >
          <Wand2 size={14} />
          Auto-map
        </button>
      </div>

      {activeCount < 2 && (
        <p className="inline-alert">
          Map at least two indicators to satisfy the lab requirement.
        </p>
      )}

      {dataset.columns.length > TARGETS.length && (
        <p className="helper-text">
          Four targets are available, so assign any four of the{" "}
          {dataset.columns.length} numeric columns.
        </p>
      )}
    </Panel>
  );
}
