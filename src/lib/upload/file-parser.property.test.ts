import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateFileColumns, parseCSV, parseExcel } from './file-parser';

describe('File Upload - Property-Based Tests', () => {
  // Feature: lumina-mvp, Property 6: File validation detects missing columns
  // Validates: Requirements 2.1, 2.2
  describe('Property 6: File validation detects missing columns', () => {
    it('should return invalid when email column is missing', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string().filter(s => s.toLowerCase() !== 'email'), { minLength: 0, maxLength: 10 }),
          (headers) => {
            const result = validateFileColumns(headers);
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.missingColumns).toContain('email');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should return valid when email column is present', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
          (otherHeaders) => {
            const headers = ['email', ...otherHeaders];
            const result = validateFileColumns(headers);
            
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should detect email column case-insensitively', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('email', 'Email', 'EMAIL', 'eMail', 'EMAI L'),
          fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
          (emailHeader, otherHeaders) => {
            // Only test valid email variations
            if (emailHeader.toLowerCase().trim() === 'email') {
              const headers = [emailHeader, ...otherHeaders];
              const result = validateFileColumns(headers);
              
              expect(result.isValid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('CSV Parsing with Missing Email Column', () => {
    it('should throw error when CSV has no email column', async () => {
      fc.assert(
        await fc.asyncProperty(
          fc.array(fc.string().filter(s => s.toLowerCase() !== 'email'), { minLength: 1, maxLength: 5 }),
          fc.array(fc.array(fc.string(), { minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 3 }),
          async (headers, rows) => {
            // Create CSV content without email column
            const csvContent = [
              headers.join(','),
              ...rows.map(row => row.join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const file = new File([blob], 'test.csv', { type: 'text/csv' });
            
            await expect(parseCSV(file)).rejects.toThrow(/Missing required column: email/);
          }
        ),
        { numRuns: 50 } // Reduced runs for async tests
      );
    });
  });
  
  describe('Excel Parsing with Missing Email Column', () => {
    it('should throw error when Excel has no email column', async () => {
      // Note: Creating valid Excel files programmatically is complex
      // This test validates the error handling logic
      const XLSX = await import('xlsx');
      
      fc.assert(
        await fc.asyncProperty(
          fc.array(fc.string().filter(s => s.toLowerCase() !== 'email'), { minLength: 1, maxLength: 5 }),
          fc.array(fc.record({
            name: fc.string(),
            value: fc.string(),
          }), { minLength: 1, maxLength: 3 }),
          async (headers, rows) => {
            // Create worksheet without email column
            const data = rows.map(row => {
              const obj: Record<string, string> = {};
              headers.forEach((header, i) => {
                obj[header] = row.name || `value${i}`;
              });
              return obj;
            });
            
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const file = new File([blob], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            await expect(parseExcel(file)).rejects.toThrow(/Missing required column: email/);
          }
        ),
        { numRuns: 50 } // Reduced runs for async tests
      );
    });
  });
});
