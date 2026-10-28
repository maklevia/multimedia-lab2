export interface NumericColumn {
  key: string;
  label: string;
  values: Array<number | null>;
  min: number;
  max: number;
  numericCount: number;
}

export interface Dataset {
  name: string;
  rowLabels: string[];
  columns: NumericColumn[];
}

export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  csv: string;
}
