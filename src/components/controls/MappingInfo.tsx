import { Info } from "lucide-react";
import { SCALES, midiToNoteName } from "../../domain/scales";
import { TARGETS } from "../../domain/mapping";
import type { Dataset, MappingConfig, MappingResult } from "../../domain/types";

interface MappingInfoProps {
  dataset: Dataset;
  config: MappingConfig;
  result: MappingResult;
}

export default function MappingInfo({
  dataset,
  config,
  result,
}: MappingInfoProps) {
  const active = TARGETS.flatMap((target) => {
    const column = dataset.columns.find(
      (item) => item.key === config.assignments[target.id],
    );
    return column ? [{ target, column }] : [];
  });

  const scale = SCALES[config.scale];
  const rootName = midiToNoteName(config.root);

  return (
    <div className="viz-card mapping-card">
      <div className="viz-heading">
        <div>
          <h3>Mapping rules</h3>
          <p>
            A compact explanation of the transformation, ready for the lab
            report and the defence.
          </p>
        </div>
        <Info size={18} className="panel-icon" />
      </div>

      <div className="formula-intro">
        <strong>Normalization</strong>
        <code>norm = (x − min) / (max − min)</code>
        <span>
          Each numeric column is scaled to [0, 1]. A constant column becomes
          0.5 so the mapping never divides by zero.
        </span>
      </div>

      <div className="formula-list">
        {active.map(({ target, column }) => {
          let formula = "";

          if (target.id === "pitch") {
            formula = `i = round(norm × ${scale.intervals.length * config.octaves}); note = ${rootName} + 12 × floor(i/${scale.intervals.length}) + ${scale.label}[i mod ${scale.intervals.length}]`;
          } else if (target.id === "velocity") {
            formula = `velocity = round(${config.velocityMin} + norm × ${
              config.velocityMax - config.velocityMin
            })`;
          } else if (target.id === "duration") {
            formula = `gate = ${Math.round(
              config.gateMin * 100,
            )}% + norm × ${
              Math.round(config.gateMax * 100) - Math.round(config.gateMin * 100)
            }%; ticks = round(${config.ppq} × ${config.stepBeats} × gate)`;
          } else {
            formula = "CC10 = round(norm × 127), preview pan = norm × 2 − 1";
          }

          return (
            <div className="formula-row" key={target.id}>
              <span
                className="target-chip"
                style={{ borderColor: target.color, color: target.color }}
              >
                {target.label}
              </span>
              <div>
                <strong>{column.label}</strong>
                <code>{formula}</code>
              </div>
              <span className="formula-range">
                {column.min.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}{" "}
                –{" "}
                {column.max.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          );
        })}
      </div>

      {active.length === 0 ? (
        <p className="inline-alert">No indicators are mapped yet.</p>
      ) : null}

      <div className="formula-footnote">
        <span>
          <b>{result.notes.length}</b> note events · <b>{result.activeIndicatorCount}</b>{" "}
          active indicators · <b>{config.bpm}</b> BPM
        </span>
        <span>
          The same event array drives the piano roll, the Web Audio preview and
          the `.mid` writer.
        </span>
      </div>

    </div>
  );
}
