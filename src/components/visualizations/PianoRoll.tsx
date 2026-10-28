import { midiToNoteName } from "../../domain/scales";
import type { NoteEvent } from "../../domain/types";

interface PianoRollProps {
  notes: NoteEvent[];
  totalTicks: number;
  ppq: number;
  activeRow: number | null;
  onActiveRow: (row: number | null) => void;
  progress: number;
}

const HEIGHT = 330;
const PADDING = { top: 28, right: 16, bottom: 18, left: 48 };

function velocityColor(velocity: number): string {
  const hue = 205 - (velocity / 127) * 145;
  return `hsl(${hue} 85% 62%)`;
}

export default function PianoRoll({
  notes,
  totalTicks,
  ppq,
  activeRow,
  onActiveRow,
  progress,
}: PianoRollProps) {
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const innerWidth = Math.max(760, notes.length * 27);
  const width = innerWidth + PADDING.left + PADDING.right;

  if (notes.length === 0) {
    return (
      <div className="viz-card">
        <div className="viz-heading">
          <div>
            <h3>Piano roll</h3>
            <p>Every row of data becomes one MIDI note.</p>
          </div>
        </div>
        <div className="empty-state">
          Map at least one indicator and load a valid dataset to see notes.
        </div>
      </div>
    );
  }

  const pitches = notes.map((note) => note.pitch);
  const pitchMin = Math.max(0, Math.min(...pitches) - 1);
  const pitchMax = Math.min(127, Math.max(...pitches) + 1);
  const pitchCount = Math.max(1, pitchMax - pitchMin + 1);
  const rowHeight = innerHeight / pitchCount;
  const safeTotalTicks = Math.max(1, totalTicks);
  const beatCount = Math.max(1, Math.ceil(safeTotalTicks / ppq));

  const xForTick = (tick: number) =>
    PADDING.left + (tick / safeTotalTicks) * innerWidth;
  const yForPitch = (pitch: number) =>
    PADDING.top + (pitchMax - pitch) * rowHeight;

  return (
    <div className="viz-card">
      <div className="viz-heading">
        <div>
          <h3>Piano roll</h3>
          <p>
            Each block is one MIDI note. Colour shows velocity; hover a block
            to highlight its source row.
          </p>
        </div>
        <span className="viz-badge">
          {midiToNoteName(pitchMin + 1)} – {midiToNoteName(pitchMax - 1)}
        </span>
      </div>

      <div className="piano-scroll">
        <svg
          className="piano-svg"
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label="Piano roll of generated MIDI notes"
        >
          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={innerWidth}
            height={innerHeight}
            className="piano-bg"
          />

          {Array.from({ length: pitchCount }, (_, index) => {
            const pitch = pitchMin + index;
            const isBlack = [1, 3, 6, 8, 10].includes(pitch % 12);
            const y = yForPitch(pitch);
            return (
              <g key={`pitch-${pitch}`}>
                {isBlack ? (
                  <rect
                    x={PADDING.left}
                    y={y}
                    width={innerWidth}
                    height={rowHeight}
                    className="piano-black-row"
                  />
                ) : null}
                <line
                  x1={PADDING.left}
                  x2={PADDING.left + innerWidth}
                  y1={y + rowHeight}
                  y2={y + rowHeight}
                  className="piano-grid-line"
                />
                {pitch % 12 === 0 ? (
                  <text
                    x={PADDING.left - 9}
                    y={y + rowHeight / 2 + 3}
                    className="piano-pitch-label"
                    textAnchor="end"
                  >
                    {midiToNoteName(pitch)}
                  </text>
                ) : null}
              </g>
            );
          })}

          {Array.from({ length: beatCount + 1 }, (_, index) => {
            const x = PADDING.left + (index / beatCount) * innerWidth;
            const isBar = index % 4 === 0;
            return (
              <g key={`beat-${index}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={PADDING.top}
                  y2={PADDING.top + innerHeight}
                  className={
                    isBar ? "piano-bar-line" : "piano-beat-line"
                  }
                />
                {isBar && index < beatCount ? (
                  <text
                    x={x + 3}
                    y={PADDING.top - 8}
                    className="piano-bar-label"
                  >
                    {index / 4 + 1}
                  </text>
                ) : null}
              </g>
            );
          })}

          {notes.map((note) => {
            const x = xForTick(note.startTick);
            const y = yForPitch(note.pitch);
            const noteWidth = Math.max(
              3,
              (note.durationTicks / safeTotalTicks) * innerWidth - 1,
            );
            const isActive = activeRow === note.rowIndex;
            return (
              <g
                key={note.id}
                className={`piano-note${isActive ? " is-active" : ""}`}
                onMouseEnter={() => onActiveRow(note.rowIndex)}
                onFocus={() => onActiveRow(note.rowIndex)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onActiveRow(note.rowIndex);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${note.rowLabel}, ${midiToNoteName(
                  note.pitch,
                )}, velocity ${note.velocity}`}
              >
                <title>
                  {`${note.rowLabel} · ${midiToNoteName(
                    note.pitch,
                  )} · velocity ${note.velocity} · ${(
                    note.durationTicks / ppq
                  ).toFixed(2)} beats`}
                </title>
                <rect
                  x={x}
                  y={y + rowHeight * 0.13}
                  width={noteWidth}
                  height={Math.max(4, rowHeight * 0.74)}
                  rx={Math.min(4, rowHeight * 0.2)}
                  fill={velocityColor(note.velocity)}
                  opacity={isActive ? 1 : 0.88}
                />
                {noteWidth > 25 ? (
                  <text
                    x={x + 4}
                    y={y + rowHeight * 0.13 + rowHeight * 0.52}
                    className="piano-note-label"
                  >
                    {midiToNoteName(note.pitch)}
                  </text>
                ) : null}
              </g>
            );
          })}

          {progress > 0 ? (
            <line
              x1={PADDING.left + progress * innerWidth}
              x2={PADDING.left + progress * innerWidth}
              y1={PADDING.top - 3}
              y2={PADDING.top + innerHeight + 3}
              className="piano-playhead"
            />
          ) : null}
        </svg>
      </div>

      <div className="piano-legend">
        <span>
          Pitch
          <small>
            {midiToNoteName(pitchMin + 1)} – {midiToNoteName(pitchMax - 1)}
          </small>
        </span>
        <span>
          Velocity
          <i className="velocity-gradient" aria-hidden="true" />
          <small>low → high</small>
        </span>
        <span>
          Grid
          <small>
            {beatCount} beats · {ppq} PPQ
          </small>
        </span>
      </div>
    </div>
  );
}
