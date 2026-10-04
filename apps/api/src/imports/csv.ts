import { parse } from 'csv-parse/sync';

const PREVIEW_SAMPLE_ROWS = 5;

export interface CsvPreview {
  columns: string[];
  sampleRows: string[][];
}

const parseCsv = (buffer: Buffer): string[][] =>
  parse(buffer, { skip_empty_lines: true, trim: true });

export const parseCsvPreview = (buffer: Buffer): CsvPreview | null => {
  const [columns, ...dataRows] = parseCsv(buffer);
  if (columns === undefined) {
    return null;
  }
  return { columns, sampleRows: dataRows.slice(0, PREVIEW_SAMPLE_ROWS) };
};

export const parseCsvRows = (buffer: Buffer): string[][] => {
  const [, ...dataRows] = parseCsv(buffer);
  return dataRows;
};
