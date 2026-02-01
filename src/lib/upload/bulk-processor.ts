import { db } from '../../db';
import { subscribers } from '../../db/schema';
import { classifyEmail } from '../email/classifier';
import type { ParsedRow } from './file-parser';
import { eq } from 'drizzle-orm';
import { triggerEnrichmentForSubscriber } from '../workflow/triggers';
import { nowUTC, toUTCString } from '../../db/timestamp-utils';

/**
 * Upload summary result
 */
export interface UploadSummary {
  totalRows: number;
  newSubscribers: number;
  duplicatesSkipped: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Batch processing configuration
 */
export interface BatchConfig {
  batchSize: number;
}

const DEFAULT_BATCH_SIZE = 100;

/**
 * Deduplicates emails within a file (keeps first occurrence)
 */
export function deduplicateEmails(rows: ParsedRow[]): {
  uniqueRows: ParsedRow[];
  duplicateCount: number;
} {
  const seen = new Set<string>();
  const uniqueRows: ParsedRow[] = [];
  let duplicateCount = 0;
  
  for (const row of rows) {
    const normalizedEmail = row.email.toLowerCase().trim();
    
    if (seen.has(normalizedEmail)) {
      duplicateCount++;
      continue;
    }
    
    seen.add(normalizedEmail);
    uniqueRows.push(row);
  }
  
  return { uniqueRows, duplicateCount };
}

/**
 * Processes a single row and upserts subscriber
 */
async function processRow(row: ParsedRow, source: string = 'upload'): Promise<'created' | 'updated'> {
  const email = row.email.toLowerCase().trim();
  const emailType = classifyEmail(email);
  
  // Check if subscriber already exists
  const existing = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);
  
  const rawPayload = {
    source,
    uploadedAt: toUTCString(nowUTC()),
    originalData: row,
  };
  
  if (existing.length > 0) {
    // Update existing subscriber
    await db
      .update(subscribers)
      .set({
        emailType,
        source,
        rawPayload,
        updatedAt: nowUTC(),
      })
      .where(eq(subscribers.email, email));
    
    return 'updated';
  } else {
    // Create new subscriber
    const [newSubscriber] = await db.insert(subscribers).values({
      email,
      emailType,
      source,
      rawPayload,
    }).returning();
    
    // Trigger enrichment workflow for personal emails
    if (emailType === 'personal') {
      try {
        await triggerEnrichmentForSubscriber(newSubscriber);
      } catch (error) {
        // Log error but don't fail the upload
        console.error('Failed to trigger enrichment workflow:', error);
      }
    }
    
    return 'created';
  }
}

/**
 * Processes rows in batches
 */
async function processBatch(
  rows: ParsedRow[],
  source: string = 'upload'
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  
  for (const row of rows) {
    try {
      const result = await processRow(row, source);
      if (result === 'created') {
        created++;
      } else {
        updated++;
      }
    } catch (error) {
      // Log error but continue processing
      console.error(`Error processing row with email ${row.email}:`, error);
      throw error;
    }
  }
  
  return { created, updated };
}

/**
 * Main bulk upload processor
 * Processes rows in batches, deduplicates emails, and generates summary
 */
export async function processBulkUpload(
  rows: ParsedRow[],
  config: Partial<BatchConfig> = {}
): Promise<UploadSummary> {
  const batchSize = config.batchSize || DEFAULT_BATCH_SIZE;
  const errors: Array<{ row: number; error: string }> = [];
  
  // Deduplicate emails within file
  const { uniqueRows, duplicateCount } = deduplicateEmails(rows);
  
  let totalCreated = 0;
  let totalUpdated = 0;
  
  // Process in batches
  for (let i = 0; i < uniqueRows.length; i += batchSize) {
    const batch = uniqueRows.slice(i, i + batchSize);
    
    try {
      const { created, updated } = await processBatch(batch);
      totalCreated += created;
      totalUpdated += updated;
    } catch (error) {
      // Record error for this batch
      errors.push({
        row: i + 2, // +2 for header and 0-based index
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return {
    totalRows: rows.length,
    newSubscribers: totalCreated,
    duplicatesSkipped: duplicateCount + totalUpdated, // Duplicates in file + existing in DB
    errors,
  };
}
