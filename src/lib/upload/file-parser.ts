import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as iconv from 'iconv-lite';

/**
 * Supported file encodings
 */
export type FileEncoding = 'utf-8' | 'utf-16' | 'iso-8859-1';

/**
 * Supported file formats
 */
export type FileFormat = 'csv' | 'xlsx' | 'xls';

/**
 * Parsed row data
 */
export interface ParsedRow {
  email: string;
  [key: string]: string | undefined;
}

/**
 * File validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  missingColumns?: string[];
}

/**
 * File parsing result
 */
export interface ParseResult {
  rows: ParsedRow[];
  totalRows: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Validates that a file contains required columns
 */
export function validateFileColumns(headers: string[]): ValidationResult {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const hasEmailColumn = normalizedHeaders.includes('email');
  
  if (!hasEmailColumn) {
    return {
      isValid: false,
      error: 'Missing required column: email',
      missingColumns: ['email'],
    };
  }
  
  return { isValid: true };
}

/**
 * Detects file format from filename
 */
export function detectFileFormat(filename: string): FileFormat | null {
  const ext = filename.toLowerCase().split('.').pop();
  
  if (ext === 'csv') return 'csv';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'xls') return 'xls';
  
  return null;
}

/**
 * Parses CSV file with specified encoding
 */
export async function parseCSV(
  file: File,
  encoding: FileEncoding = 'utf-8'
): Promise<ParseResult> {
  const errors: Array<{ row: number; error: string }> = [];
  
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Decode with specified encoding
    let content: string;
    if (encoding === 'utf-8') {
      content = buffer.toString('utf-8');
    } else if (encoding === 'utf-16') {
      content = iconv.decode(buffer, 'utf-16le');
    } else {
      content = iconv.decode(buffer, 'iso-8859-1');
    }
    
    // Parse CSV
    const parseResult = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });
    
    // Validate columns
    const headers = parseResult.meta.fields || [];
    const validation = validateFileColumns(headers);
    
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Extract rows and validate emails
    const rows: ParsedRow[] = [];
    parseResult.data.forEach((row, index) => {
      const email = row.email?.trim();
      
      if (!email) {
        errors.push({
          row: index + 2, // +2 because index is 0-based and header is row 1
          error: 'Missing email address',
        });
        return;
      }
      
      // Basic email validation
      if (!email.includes('@')) {
        errors.push({
          row: index + 2,
          error: `Invalid email format: ${email}`,
        });
        return;
      }
      
      rows.push({
        email,
        ...row,
      });
    });
    
    return {
      rows,
      totalRows: parseResult.data.length,
      errors,
    };
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses Excel file (.xlsx or .xls)
 */
export async function parseExcel(file: File): Promise<ParseResult> {
  const errors: Array<{ row: number; error: string }> = [];
  
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Workbook contains no sheets');
    }
    
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
      raw: false,
      defval: '',
    });
    
    if (data.length === 0) {
      throw new Error('Sheet is empty');
    }
    
    // Validate columns
    const headers = Object.keys(data[0] || {});
    const validation = validateFileColumns(headers);
    
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Extract rows and validate emails
    const rows: ParsedRow[] = [];
    data.forEach((row, index) => {
      const email = row.email?.trim() || row.Email?.trim();
      
      if (!email) {
        errors.push({
          row: index + 2, // +2 because index is 0-based and header is row 1
          error: 'Missing email address',
        });
        return;
      }
      
      // Basic email validation
      if (!email.includes('@')) {
        errors.push({
          row: index + 2,
          error: `Invalid email format: ${email}`,
        });
        return;
      }
      
      rows.push({
        email,
        ...row,
      });
    });
    
    return {
      rows,
      totalRows: data.length,
      errors,
    };
  } catch (error) {
    throw new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main file parser that detects format and delegates to appropriate parser
 */
export async function parseFile(
  file: File,
  encoding: FileEncoding = 'utf-8'
): Promise<ParseResult> {
  const format = detectFileFormat(file.name);
  
  if (!format) {
    throw new Error('Unsupported file format. Please upload CSV, XLSX, or XLS files.');
  }
  
  if (format === 'csv') {
    return parseCSV(file, encoding);
  } else {
    return parseExcel(file);
  }
}
