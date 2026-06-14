import { parse } from 'csv-parse/sync';

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export function parseCsv(buffer: Buffer): ParsedData {
  const content = buffer.toString('utf-8');

  const records: string[][] = parse(content, {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  if (records.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row.');
  }

  const headers = records[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = records.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i]?.trim() || '';
    });
    return obj;
  });

  return { headers, rows, rowCount: rows.length };
}
