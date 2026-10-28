import { useId, useState } from "react";
import { Database, Download, Upload, Wand2 } from "lucide-react";
import { SAMPLE_DATASETS } from "../../data/samples";
import type { Dataset } from "../../domain/types";
import Panel from "../ui/Panel";

interface DataPanelProps {
  dataset: Dataset;
  activeSampleId: string | null;
  onLoadSample: (sampleId: string) => void;
  onFile: (file: File) => void;
  onDownloadSample: () => void;
}

export default function DataPanel({
  dataset,
  activeSampleId,
  onLoadSample,
  onFile,
  onDownloadSample,
}: DataPanelProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  return (
    <Panel
      step="01"
      title="Data"
      description="Load a CSV with at least two numeric columns."
      icon={<Database size={18} />}
    >
      <div
        className={`dropzone${isDragging ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) onFile(file);
        }}
      >
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onFile(file);
            event.currentTarget.value = "";
          }}
        />
        <label htmlFor={inputId} className="dropzone-label">
          <span className="dropzone-icon">
            <Upload size={19} />
          </span>
          <span>
            <strong>Drop a CSV here</strong>
            <small>or click to browse · data stays in your browser</small>
          </span>
        </label>
      </div>

      <div className="sample-row">
        <span className="mini-label">
          <Wand2 size={13} />
          Samples
        </span>
        <div className="sample-buttons">
          {SAMPLE_DATASETS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className={`chip${
                activeSampleId === sample.id ? " is-active" : ""
              }`}
              onClick={() => onLoadSample(sample.id)}
              title={sample.description}
            >
              {sample.name.split("·")[0].trim()}
            </button>
          ))}
        </div>
      </div>

      <div className="dataset-summary">
        <div>
          <span className="summary-value">{dataset.rowLabels.length}</span>
          <span className="summary-label">rows</span>
        </div>
        <div>
          <span className="summary-value">{dataset.columns.length}</span>
          <span className="summary-label">numeric indicators</span>
        </div>
        <button
          type="button"
          className="icon-text-button"
          onClick={onDownloadSample}
          disabled={!activeSampleId}
          title="Download the current sample as CSV"
        >
          <Download size={14} />
          Sample CSV
        </button>
      </div>

      <div className="column-pills" aria-label="Numeric columns">
        {dataset.columns.map((column) => (
          <span className="column-pill" key={column.key}>
            {column.label}
            <small>
              {column.min.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
              –
              {column.max.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
            </small>
          </span>
        ))}
      </div>
    </Panel>
  );
}
