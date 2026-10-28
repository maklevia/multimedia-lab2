import Papa from "papaparse";
import { getColumnStats } from "./normalize";
import type { Dataset, NumericColumn } from "./types";

export class CsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvError";
  }
}

function parseNumeric(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-" || trimmed.toLowerCase() === "n/a") {
    return null;
  }
  const normalized = trimmed.includes(",") && !trimmed.includes(".")
    ? trimmed.replace(",", ".")
    : trimmed;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseCsv(text: string, name = "Imported data"): Dataset {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.some((error) => error.type === "Delimiter")) {
    throw new CsvError("Could not detect the CSV delimiter.");
  }

  const records = result.data.filter((record) =>
    Object.values(record).some((value) => String(value ?? "").trim() !== ""),
  );

  if (records.length === 0) {
    throw new CsvError("The CSV has no data rows.");
  }

  const headers = (result.meta.fields ?? []).filter(
    (header) => header.trim() !== "",
  );

  if (headers.length === 0) {
    throw new CsvError("The CSV has no column headers.");
  }

  const numericColumns: NumericColumn[] = [];

  for (const header of headers) {
    const values = records.map((record) => parseNumeric(record[header]));
    const stats = getColumnStats(values);
    const minimumNumeric = Math.max(2, Math.ceil(records.length * 0.4));

    if (stats.numericCount >= minimumNumeric) {
      numericColumns.push({
        key: header,
        label: header,
        values,
        ...stats,
      });
    }
  }

  if (numericColumns.length < 2) {
    throw new CsvError(
      "Found fewer than two numeric columns. The lab requires at least two numeric indicators.",
    );
  }

  const numericKeys = new Set(numericColumns.map((column) => column.key));
  const labelHeader = headers.find((header) => !numericKeys.has(header));
  const rowLabels = records.map((record, index) => {
    if (labelHeader) {
      const label = String(record[labelHeader] ?? "").trim();
      if (label) return label;
    }
    return `Row ${index + 1}`;
  });

  return {
    name,
    rowLabels,
    columns: numericColumns,
  };
}

