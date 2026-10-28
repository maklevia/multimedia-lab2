import { FileMusic } from "lucide-react";

interface HeaderProps {
  datasetName: string;
  canExport: boolean;
  onExportMidi: () => void;
}

export default function Header({
  datasetName,
  canExport,
  onExportMidi,
}: HeaderProps) {
  return (
    <header className="topbar">
      <h1 className="app-title">
        Sonification: numeric data <span aria-hidden="true">→</span> MIDI
        composition
      </h1>

      <div className="topbar-actions">
        <div className="dataset-chip" title="Current dataset">
          <span className="status-dot" />
          <span>{datasetName}</span>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={onExportMidi}
          disabled={!canExport}
        >
          <FileMusic size={17} />
          Export .mid
        </button>
      </div>
    </header>
  );
}
