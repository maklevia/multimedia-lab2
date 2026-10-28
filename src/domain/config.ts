import { DEFAULT_CONFIG, defaultAssignments } from "./mapping";
import type { Dataset, MappingConfig } from "./types";

export function createConfigForDataset(dataset: Dataset): MappingConfig {
  return {
    ...DEFAULT_CONFIG,
    assignments: defaultAssignments(dataset.columns),
  };
}
