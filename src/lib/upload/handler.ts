import { parseFile, type FileEncoding } from './file-parser';
import { processBulkUpload, type UploadSummary } from './bulk-processor';

/**
 * Upload handler result
 */
export interface UploadResult {
  success: boolean;
  summary?: UploadSummary;
  error?: string;
}

/**
 * Processes file upload request
 */
export async function processFileUpload(
  file: File,
  encoding: FileEncoding = 'utf-8'
): Promise<UploadResult> {
  try {
    // Validate file exists
    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      };
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds maximum limit of 10MB',
      };
    }
    
    // Parse file
    let parseResult;
    try {
      parseResult = await parseFile(file, encoding);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File parsing failed',
      };
    }
    
    // Check if any rows were parsed
    if (parseResult.rows.length === 0) {
      return {
        success: false,
        error: 'No valid rows found in file',
      };
    }
    
    // Process bulk upload
    const summary = await processBulkUpload(parseResult.rows);
    
    // Merge parsing errors with processing errors
    summary.errors = [...parseResult.errors, ...summary.errors];
    
    return {
      success: true,
      summary,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload processing failed',
    };
  }
}
