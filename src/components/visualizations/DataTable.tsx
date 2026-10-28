import { midiToNoteName } from "../../domain/scales";
import { formatNumber } from "../../domain/normalize";
import type { Dataset, MappingResult } from "../../domain/types";

interface DataTableProps {
  dataset: Dataset;
  result: MappingResult;
  ppq: number;
  activeRow: number | null;
  onActiveRow: (row: number | null) => void;
}

function panLabel(pan: number): string {
  if (Math.abs(pan) < 0.02) return "C";
  return `${pan < 0 ? "L" : "R"}${Math.round(Math.abs(pan) * 100)}`;
}

export default function DataTable({
  dataset,
  result,
  ppq,
  activeRow,
  onActiveRow,
}: DataTableProps) {
  const notesByRow = new Map(
    result.notes.map((note) => [note.rowIndex, note]),
  );
  const hasPan = result.notes.some((note) => Math.abs(note.pan) > 0.02);

  return (
    <div className="viz-card table-card">
      <div className="viz-heading">
        <div>
          <h3>Mapping table</h3>
          <p>
            The complete audit trail: raw values, generated note, velocity and
            duration for every row.
          </p>
        </div>
        <span className="viz-badge">{dataset.rowLabels.length} rows</span>
      </div>

      <div className="table-scroll">
        <table>
          <caption className="visually-hidden">
            Data rows and their generated MIDI notes
          </caption>
          <thead>
            <tr>
              <th scope="col">Row</th>
              {dataset.columns.map((column) => (
                <th scope="col" key={column.key}>
                  {column.label}
                </th>
              ))}
              <th scope="col">Note</th>
              <th scope="col">Vel</th>
              <th scope="col">Dur</th>
              {hasPan ? <th scope="col">Pan</th> : null}
            </tr>
          </thead>
          <tbody>
            {dataset.rowLabels.map((label, index) => {
              const note = notesByRow.get(index);
              const isActive = activeRow === index;
              return (
                <tr
                  key={`${label}-${index}`}
                  className={isActive ? "is-active" : ""}
                  onMouseEnter={() => onActiveRow(index)}
                  onFocus={() => onActiveRow(index)}
                  tabIndex={0}
                >
                  <th scope="row">{label}</th>
                  {dataset.columns.map((column) => (
                    <td key={column.key}>
                      {formatNumber(column.values[index])}
                    </td>
                  ))}
                  <td className="cell-note">
                    {note ? midiToNoteName(note.pitch) : "—"}
                  </td>
                  <td>{note?.velocity ?? "—"}</td>
                  <td>{note ? (note.durationTicks / ppq).toFixed(2) : "—"}</td>
                  {hasPan ? <td>{note ? panLabel(note.pan) : "—"}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="helper-text table-note">
        Duration is shown in beats. The MIDI file uses {result.notes.length}{" "}
        note events and the current tempo.
      </p>
    </div>
  );
}
