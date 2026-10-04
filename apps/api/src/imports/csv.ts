import { parse } from 'csv-parse/sync';

const PREVIEW_SAMPLE_ROWS = 5;
const CSV_PARSE_OPTIONS = { skip_empty_lines: true, trim: true, relax_column_count: true };

export interface CsvPreview {
  columns: string[];
  sampleRows: string[][];
}

const parseCsv = (buffer: Buffer): string[][] | null => {
  try {
    return parse(buffer, CSV_PARSE_OPTIONS);
  } catch {
    return null;
  }
};

export const parseCsvPreview = (buffer: Buffer): CsvPreview | null => {
  const rows = parseCsv(buffer);
  if (rows === null) {
    return null;
  }
  const [columns, ...dataRows] = rows;
  if (columns === undefined) {
    return null;
  }
  return { columns, sampleRows: dataRows.slice(0, PREVIEW_SAMPLE_ROWS) };
};

export const parseCsvRows = (buffer: Buffer): string[][] | null => {
  const rows = parseCsv(buffer);
  if (rows === null) {
    return null;
  }
  const [, ...dataRows] = rows;
  return dataRows;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidIsoCalendarDate = (year: number, month: number, day: number): boolean => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

/**
 * Returns a canonical `YYYY-MM-DD` string so the caller never inserts a raw,
 * locale-ambiguous string into a `date` column (Postgres's interpretation of
 * e.g. `09/04/2026` depends on the session's DateStyle, not the app).
 */
export const normalizeCsvDate = (raw: string): string | null => {
  if (ISO_DATE_PATTERN.test(raw)) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(5, 7));
    const day = Number(raw.slice(8, 10));
    return isValidIsoCalendarDate(year, month, day) ? raw : null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${String(year)}-${month}-${day}`;
};
