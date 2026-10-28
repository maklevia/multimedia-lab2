import type { NumericColumn } from "./types";

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function normalizeValues(values: Array<number | null>): number[] {
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );

  if (valid.length === 0) {
    return values.map(() => 0.5);
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const span = max - min;

  return values.map((value) => {
    if (value === null || !Number.isFinite(value)) {
      return 0.5;
    }
    if (span < 1e-12) {
      return 0.5;
    }
    return clamp01((value - min) / span);
  });
}

export function getColumnStats(values: Array<number | null>): {
  min: number;
  max: number;
  numericCount: number;
} {
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (valid.length === 0) {
    return { min: 0, max: 0, numericCount: 0 };
  }
  return {
    min: Math.min(...valid),
    max: Math.max(...valid),
    numericCount: valid.length,
  };
}

export function normalizeColumns(
  columns: NumericColumn[],
): Record<string, number[]> {
  return Object.fromEntries(
    columns.map((column) => [column.key, normalizeValues(column.values)]),
  );
}

export function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}
