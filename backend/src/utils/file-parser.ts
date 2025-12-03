import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { Readable } from 'stream';

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
}

/**
 * Parse CSV file
 */
export const parseCSV = async (fileBuffer: Buffer): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const csvString = fileBuffer.toString('utf-8');
    
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
          return;
        }

        const rows = results.data as ParsedRow[];
        const headers = results.meta.fields || [];

        resolve({
          headers,
          rows,
          totalRows: rows.length,
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
};

/**
 * Parse XLSX file
 */
export const parseXLSX = async (fileBuffer: Buffer): Promise<ParseResult> => {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with headers
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
  }) as any[][];

  if (rows.length === 0) {
    throw new Error('Excel file is empty');
  }

  // First row is headers
  const headers = (rows[0] as string[]).map((h: any) => String(h || '').trim()).filter(Boolean);
  const dataRows = rows.slice(1);

  // Convert to object array
  const parsedRows: ParsedRow[] = dataRows
    .filter((row) => row.some((cell) => cell !== null && cell !== ''))
    .map((row) => {
      const obj: ParsedRow = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : null;
      });
      return obj;
    });

  return {
    headers,
    rows: parsedRows,
    totalRows: parsedRows.length,
  };
};

/**
 * Detect file type from buffer or filename
 */
export const detectFileType = (filename: string, buffer?: Buffer): 'csv' | 'xlsx' => {
  const ext = filename.toLowerCase().split('.').pop();
  
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  
  // Try to detect from buffer
  if (buffer) {
    // XLSX files start with PK (ZIP signature)
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      return 'xlsx';
    }
  }
  
  throw new Error('Unsupported file type. Please upload CSV or XLSX files.');
};

/**
 * Parse file (auto-detect type)
 */
export const parseFile = async (fileBuffer: Buffer, filename: string): Promise<ParseResult> => {
  const fileType = detectFileType(filename, fileBuffer);
  
  if (fileType === 'csv') {
    return parseCSV(fileBuffer);
  } else {
    return parseXLSX(fileBuffer);
  }
};

/**
 * Parse text data (CSV or TSV) from string
 */
export const parseTextData = async (textData: string): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    // Detect delimiter: check first line for tabs vs commas
    const firstLine = textData.split('\n')[0] || '';
    const hasTabs = firstLine.includes('\t');
    const delimiter = hasTabs ? '\t' : ',';
    
    Papa.parse(textData, {
      header: true,
      delimiter,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          // Filter out non-critical errors (like empty lines)
          const criticalErrors = results.errors.filter(
            (e) => e.type !== 'Quotes' && e.type !== 'Delimiter'
          );
          
          if (criticalErrors.length > 0) {
            reject(new Error(`Text parsing errors: ${criticalErrors.map(e => e.message).join(', ')}`));
            return;
          }
        }

        const rows = results.data as ParsedRow[];
        const headers = results.meta.fields || [];

        if (rows.length === 0) {
          reject(new Error('No data found in pasted content'));
          return;
        }

        resolve({
          headers,
          rows,
          totalRows: rows.length,
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
};

