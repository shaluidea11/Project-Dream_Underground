import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream', // Some systems send CSV as octet-stream
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// XLSX magic bytes: ZIP header (PK\x03\x04)
const XLSX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export function validateUploadFile(file: Express.Multer.File): void {
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException(
      `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    );
  }

  // 2. Check extension
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
    throw new BadRequestException(
      'Invalid file type. Only CSV and Excel (.xlsx, .xls) files are allowed.',
    );
  }

  // 3. Check magic bytes for Excel files
  if (['xlsx', 'xls'].includes(ext)) {
    const magicBytes = file.buffer.slice(0, 4);
    if (!magicBytes.equals(XLSX_MAGIC)) {
      throw new BadRequestException(
        'File content does not match declared type. Expected an Excel file.',
      );
    }
  }

  // 4. Basic CSV check — should contain printable text
  if (ext === 'csv') {
    const sample = file.buffer.slice(0, 1000).toString('utf-8');
    // Check for a minimum of printable characters and at least one comma/newline
    if (!/[,;\t\n]/.test(sample)) {
      throw new BadRequestException(
        'File does not appear to be a valid CSV file.',
      );
    }
  }
}

export function detectFileType(file: Express.Multer.File): 'csv' | 'excel' {
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return 'csv';
  return 'excel';
}
