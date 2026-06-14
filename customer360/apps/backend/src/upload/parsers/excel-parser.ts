import * as ExcelJS from 'exceljs';
import { ParsedData } from './csv-parser';

export async function parseExcel(buffer: Buffer): Promise<ParsedData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    throw new Error('Excel file must have at least a header row and one data row.');
  }

  // Extract headers from first row
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const value = cell.value?.toString().trim().toLowerCase().replace(/\s+/g, '_') || `column_${colNumber}`;
    headers.push(value);
  });

  // Extract data rows
  const rows: Record<string, string>[] = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const obj: Record<string, string> = {};
    let hasData = false;

    headers.forEach((header, idx) => {
      const cell = row.getCell(idx + 1);
      let value = '';

      if (cell.value !== null && cell.value !== undefined) {
        if (cell.value instanceof Date) {
          value = cell.value.toISOString();
        } else if (typeof cell.value === 'object' && 'result' in cell.value) {
          value = String((cell.value as any).result ?? '');
        } else {
          value = String(cell.value).trim();
        }
        if (value) hasData = true;
      }

      obj[header] = value;
    });

    if (hasData) rows.push(obj);
  }

  return { headers, rows, rowCount: rows.length };
}
