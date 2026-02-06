# File Upload Module

This module implements the bulk file upload functionality for the Liwanag MVP, allowing users to upload CSV and Excel files containing subscriber data.

## Components

### 1. File Parser (`file-parser.ts`)
Handles parsing of CSV and Excel files with multiple encoding support.

**Features:**
- Supports CSV, .xlsx, and .xls formats
- Handles UTF-8, UTF-16, and ISO-8859-1 encodings
- Validates presence of required email column
- Provides detailed error reporting for invalid rows

**Key Functions:**
- `parseFile(file, encoding)` - Main entry point for file parsing
- `parseCSV(file, encoding)` - CSV-specific parser
- `parseExcel(file)` - Excel-specific parser
- `validateFileColumns(headers)` - Validates required columns

### 2. Bulk Processor (`bulk-processor.ts`)
Processes parsed rows in batches and manages database operations.

**Features:**
- Deduplicates emails within uploaded file (keeps first occurrence)
- Processes rows in configurable batches (default: 100)
- Upserts subscribers (creates new or updates existing)
- Generates comprehensive upload summary

**Key Functions:**
- `processBulkUpload(rows, config)` - Main bulk processing function
- `deduplicateEmails(rows)` - Removes duplicate emails from file
- `processRow(row, source)` - Processes individual subscriber row

### 3. Upload Handler (`handler.ts`)
Orchestrates the complete upload workflow.

**Features:**
- File size validation (max 10MB)
- File format validation
- Error handling and reporting
- Combines parsing and processing results

**Key Functions:**
- `processFileUpload(file, encoding)` - Main upload handler

### 4. API Endpoint (`/api/upload`)
REST API endpoint for file uploads.

**Endpoint:** `POST /api/upload`

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `file` (required): CSV or Excel file
  - `encoding` (optional): File encoding (utf-8, utf-16, iso-8859-1)

**Response (200 OK):**
```json
{
  "totalRows": 100,
  "newSubscribers": 75,
  "duplicatesSkipped": 25,
  "errors": []
}
```

**Error Responses:**
- 400: Invalid file, missing email column, or parsing error
- 500: Internal server error

## Property-Based Tests

### Property 6: File validation detects missing columns
Validates that files without an email column are properly rejected.

**Test Coverage:**
- Missing email column detection
- Case-insensitive column matching
- CSV and Excel validation

### Property 7: Intra-file deduplication
Validates that duplicate emails within a file are properly handled.

**Test Coverage:**
- First occurrence preservation
- Case-insensitive email matching
- Accurate duplicate counting

### Property 8: Upload summary completeness
Validates that upload summaries contain all required fields with accurate counts.

**Test Coverage:**
- Summary structure validation
- Count accuracy (total, new, duplicates)
- Error array presence

## Usage Example

```typescript
import { processFileUpload } from '@/lib/upload/handler';

// Process uploaded file
const result = await processFileUpload(file, 'utf-8');

if (result.success) {
  console.log(`Processed ${result.summary.totalRows} rows`);
  console.log(`Created ${result.summary.newSubscribers} new subscribers`);
  console.log(`Skipped ${result.summary.duplicatesSkipped} duplicates`);
} else {
  console.error(`Upload failed: ${result.error}`);
}
```

## Requirements Satisfied

- **Requirement 2.1**: File format validation (CSV, XLSX, XLS)
- **Requirement 2.2**: Email column validation
- **Requirement 2.3**: Email classification (personal vs corporate)
- **Requirement 2.4**: Intra-file deduplication
- **Requirement 2.5**: Upload summary generation
- **Requirement 13.1**: Multiple encoding support
- **Requirement 13.2**: Excel format support

## Testing

Run tests with:
```bash
npm test -- file-parser.property.test.ts --run
npm test -- bulk-processor.property.test.ts --run
npm test -- handler.test.ts --run
```

All property-based tests run with 100 iterations (50 for async tests) to ensure comprehensive coverage.
