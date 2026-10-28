import { TARGETS } from "../../domain/mapping";
import { formatNumber } from "../../domain/normalize";
import type {
  Dataset,
  MappingConfig,
  MappingResult,
} from "../../domain/types";

interface DataChartProps {
  dataset: Dataset;
  result: MappingResult;
  config: MappingConfig;
  activeRow: number | null;
  onActiveRow: (row: number | null) => void;
  progress: number;
}

const WIDTH = 900;
const HEIGHT = 250;
const PADDING = { top: 18, right: 20, bottom: 38, left: 44 };

export default function DataChart({
  dataset,
  result,
  config,
  activeRow,
  onActiveRow,
  progress,
}: DataChartProps) {
  const columns = dataset.columns;
  const rowCount = dataset.rowLabels.length;
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const bandWidth = innerWidth / Math.max(1, rowCount);

  const xForIndex = (index: number) =>
    PADDING.left + ((index + 0.5) / Math.max(1, rowCount)) * innerWidth;
  const yForValue = (value: number) =>
    PADDING.top + (1 - Math.max(0, Math.min(1, value))) * innerHeight;

  const series = columns.map((column) => {
    const target = TARGETS.find(
      (item) => config.assignments[item.id] === column.key,
    );
    return {
      column,
      target,
      color: target?.color ?? "#64748b",
      values: result.normalizedColumns[column.key] ?? [],
    };
  });

  const labelIndices = Array.from(
    new Set(
      [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
        Math.round((rowCount - 1) * ratio),
      ),
    ),
  ).filter((index) => index >= 0 && index < rowCount);

  const activeIndex =
    activeRow !== null && activeRow >= 0 && activeRow < rowCount
      ? activeRow
      : null;

  return (
    <div className="viz-card">
      <div className="viz-heading">
        <div>
          <h3>Normalized indicators</h3>
          <p>
            Every series is scaled to 0–1. These values are what the mapping
            engine turns into notes.
          </p>
        </div>
        <span className="viz-badge">0 — 1</span>
      </div>

      <svg
        className="chart-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Normalized numeric indicators over the selected rows"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yForValue(value)}
              y2={yForValue(value)}
              className="chart-grid-line"
            />
            <text
              x={PADDING.left - 10}
              y={yForValue(value) + 4}
              className="chart-axis-label"
              textAnchor="end"
            >
              {value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}
            </text>
          </g>
        ))}

        {activeIndex !== null ? (
          <g>
            <rect
              x={xForIndex(activeIndex) - bandWidth / 2}
              y={PADDING.top}
              width={bandWidth}
              height={innerHeight}
              className="chart-active-band"
            />
            <line
              x1={xForIndex(activeIndex)}
              x2={xForIndex(activeIndex)}
              y1={PADDING.top}
              y2={PADDING.top + innerHeight}
              className="chart-active-line"
            />
          </g>
        ) : null}

        {progress > 0 ? (
          <line
            x1={PADDING.left + progress * innerWidth}
            x2={PADDING.left + progress * innerWidth}
            y1={PADDING.top}
            y2={PADDING.top + innerHeight}
            className="chart-playhead"
          />
        ) : null}

        {series.map(({ column, color, values, target }) => {
          const points = values
            .slice(0, rowCount)
            .map((value, index) => `${xForIndex(index)},${yForValue(value)}`)
            .join(" ");
          return (
            <g key={column.key} opacity={target ? 1 : 0.45}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {values.slice(0, rowCount).map((value, index) => (
                <circle
                  key={`${column.key}-${index}`}
                  cx={xForIndex(index)}
                  cy={yForValue(value)}
                  r={activeIndex === index ? 4.2 : 2.3}
                  fill={color}
                  stroke={activeIndex === index ? "#f8fafc" : "none"}
                  strokeWidth={1.4}
                  opacity={target ? 1 : 0.6}
                />
              ))}
            </g>
          );
        })}

        {labelIndices.map((index) => (
          <text
            key={index}
            x={xForIndex(index)}
            y={HEIGHT - 12}
            className="chart-axis-label"
            textAnchor="middle"
          >
            {dataset.rowLabels[index]}
          </text>
        ))}

        {Array.from({ length: rowCount }, (_, index) => (
          <rect
            key={`hit-${index}`}
            x={PADDING.left + index * bandWidth}
            y={PADDING.top}
            width={bandWidth}
            height={innerHeight}
            fill="transparent"
            onMouseEnter={() => onActiveRow(index)}
            onFocus={() => onActiveRow(index)}
            tabIndex={-1}
          />
        ))}
      </svg>

      <div className="chart-legend">
        {series.map(({ column, color, target }) => (
          <span className="legend-item" key={column.key}>
            <span className="legend-dot" style={{ background: color }} />
            {column.label}
            <small>{target ? `→ ${target.shortLabel}` : "not mapped"}</small>
          </span>
        ))}
      </div>

      <div className="chart-readout" aria-live="polite">
        {activeIndex !== null ? (
          <>
            <strong>{dataset.rowLabels[activeIndex]}</strong>
            {columns.map((column) => (
              <span key={column.key}>
                {column.label}
                <b>{formatNumber(column.values[activeIndex])}</b>
                <small>
                  {formatNumber(
                    result.normalizedColumns[column.key]?.[activeIndex] ?? 0.5,
                    2,
                  )}
                </small>
              </span>
            ))}
          </>
        ) : (
          <span className="chart-placeholder">
            Hover a row to inspect the raw and normalized values.
          </span>
        )}
      </div>
    </div>
  );
}
