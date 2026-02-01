import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/db';
import { subscribers, enrichmentJobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { processFileUpload } from '@/lib/upload/handler';
import { initializeTestDatabase, cleanupTestDatabase, closeTestDatabase } from '@/test/db-setup';

/**
 * Integration test for file upload flow
 * 
 * Tests the complete flow:
 * 1. File upload → parsing
 * 2. Deduplication within file
 * 3. Subscriber creation
 * 4. Job creation for personal emails
 * 5. Upload summary accuracy
 */

describe('File Upload Flow Integration', () => {
  beforeAll(async () => {
    await initializeTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  it('should process CSV file upload with complete flow', async () => {
    // Create CSV file content
    const csvContent = `email,name,company
john@gmail.com,John Doe,Acme Corp
jane@yahoo.com,Jane Smith,Tech Inc
bob@outlook.com,Bob Johnson,StartupCo
alice@acme.com,Alice Brown,Acme Corp`;

    const file = new File([csvContent], 'subscribers.csv', { type: 'text/csv' });

    // Process file upload
    const result = await processFileUpload(file);

    // Verify upload succeeded
    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();

    const summary = result.summary!;

    // Verify upload summary
    expect(summary.totalRows).toBe(4);
    expect(summary.newSubscribers).toBe(4);
    expect(summary.duplicatesSkipped).toBe(0);
    expect(summary.errors.length).toBe(0);

    // Verify all subscribers were created
    const allSubscribers = await db.select().from(subscribers);
    expect(allSubscribers.length).toBe(4);

    // Verify email classification
    const personalEmails = allSubscribers.filter(s => s.emailType === 'personal');
    const corporateEmails = allSubscribers.filter(s => s.emailType === 'corporate');

    expect(personalEmails.length).toBe(3); // gmail, yahoo, outlook
    expect(corporateEmails.length).toBe(1); // acme.com

    // Verify enrichment jobs were created for personal emails only
    const allJobs = await db.select().from(enrichmentJobs);
    expect(allJobs.length).toBe(3);

    // Verify all jobs are pending
    allJobs.forEach(job => {
      expect(job.status).toBe('pending');
      expect(job.estimatedCredits).toBe(3);
    });
  });

  it('should handle intra-file deduplication correctly', async () => {
    // Create CSV with duplicate emails
    const csvContent = `email,source
john@gmail.com,newsletter
jane@yahoo.com,waitlist
john@gmail.com,blog
bob@gmail.com,newsletter
jane@yahoo.com,product`;

    const file = new File([csvContent], 'duplicates.csv', { type: 'text/csv' });

    const result = await processFileUpload(file);

    expect(result.success).toBe(true);
    const summary = result.summary!;

    // Verify summary shows deduplication
    expect(summary.totalRows).toBe(5);
    expect(summary.newSubscribers).toBe(3); // Only unique emails
    expect(summary.duplicatesSkipped).toBe(2); // 2 duplicates

    // Verify only unique subscribers were created
    const allSubscribers = await db.select().from(subscribers);
    expect(allSubscribers.length).toBe(3);

    const emails = allSubscribers.map(s => s.email).sort();
    expect(emails).toEqual([
      'bob@gmail.com',
      'jane@yahoo.com',
      'john@gmail.com',
    ]);
  });

  it('should handle cross-file deduplication (existing subscribers)', async () => {
    // First upload
    const csvContent1 = `email
john@gmail.com
jane@yahoo.com`;

    const file1 = new File([csvContent1], 'batch1.csv', { type: 'text/csv' });
    const result1 = await processFileUpload(file1);

    expect(result1.success).toBe(true);
    expect(result1.summary!.newSubscribers).toBe(2);

    // Second upload with overlapping emails
    const csvContent2 = `email
jane@yahoo.com
bob@gmail.com
alice@outlook.com`;

    const file2 = new File([csvContent2], 'batch2.csv', { type: 'text/csv' });
    const result2 = await processFileUpload(file2);

    expect(result2.success).toBe(true);
    const summary2 = result2.summary!;

    // jane@yahoo.com already exists, so only 2 new subscribers
    expect(summary2.totalRows).toBe(3);
    expect(summary2.newSubscribers).toBe(2); // bob and alice

    // Verify total unique subscribers
    const allSubscribers = await db.select().from(subscribers);
    expect(allSubscribers.length).toBe(4); // john, jane, bob, alice

    // Verify jane was updated, not duplicated
    const janeRecords = allSubscribers.filter(s => s.email === 'jane@yahoo.com');
    expect(janeRecords.length).toBe(1);
  });

  it('should handle file with missing email column', async () => {
    // CSV without email column
    const csvContent = `name,company
John Doe,Acme Corp
Jane Smith,Tech Inc`;

    const file = new File([csvContent], 'invalid.csv', { type: 'text/csv' });

    const result = await processFileUpload(file);

    // Should fail with descriptive error
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('email');

    // Verify no subscribers were created
    const allSubscribers = await db.select().from(subscribers);
    expect(allSubscribers.length).toBe(0);
  });

  it('should handle empty file gracefully', async () => {
    const csvContent = `email`;

    const file = new File([csvContent], 'empty.csv', { type: 'text/csv' });

    const result = await processFileUpload(file);

    // Should fail with descriptive error
    expect(result.success).toBe(false);
    expect(result.error).toContain('No valid rows');

    // Verify no subscribers were created
    const allSubscribers = await db.select().from(subscribers);
    expect(allSubscribers.length).toBe(0);
  });

  it('should handle file with invalid emails', async () => {
    const csvContent = `email
john@gmail.com
invalid-email
jane@yahoo.com
@nodomain.com
bob@outlook.com`;

    const file = new File([csvContent], 'mixed.csv', { type: 'text/csv' });

    const result = await processFileUpload(file);

    expect(result.success).toBe(true);
    const summary = result.summary!;

    // Valid emails should be processed
    expect(summary.newSubscribers).toBeGreaterThan(0);

    // Invalid emails should be reported in errors
    expect(summary.errors.length).toBeGreaterThan(0);

    // Verify only valid subscribers were created
    const allSubscribers = await db.select().from(subscribers);
    const emails = allSubscribers.map(s => s.email);

    expect(emails).toContain('john@gmail.com');
    expect(emails).toContain('jane@yahoo.com');
    expect(emails).toContain('bob@outlook.com');
    expect(emails).not.toContain('invalid-email');
    expect(emails).not.toContain('@nodomain.com');
  });

  it('should handle large file upload efficiently', async () => {
    // Generate CSV with 1000 rows
    const rows = ['email'];
    for (let i = 0; i < 1000; i++) {
      rows.push(`user${i}@gmail.com`);
    }
    const csvContent = rows.join('\n');

    const file = new File([csvContent], 'large.csv', { type: 'text/csv' });

    const startTime = Date.now();
    const result = await processFileUpload(file);
    const duration = Date.now() - startTime;

    expect(result.success).toBe(true);
    const summary = result.summary!;

    expect(summary.totalRows).toBe(1000);
    expect(summary.newSubscribers).toBe(1000);
    expect(summary.duplicatesSkipped).toBe(0);

    // Verify all subscribers were created
    const allSubscribers = await db.select().from(subscribers);
    expect(allSubscribers.length).toBe(1000);

    // Verify all enrichment jobs were created
    const allJobs = await db.select().from(enrichmentJobs);
    expect(allJobs.length).toBe(1000);

    // Should complete in reasonable time (< 30 seconds)
    expect(duration).toBeLessThan(30000);
  });

  it('should preserve source information from upload', async () => {
    const csvContent = `email,source
john@gmail.com,newsletter
jane@yahoo.com,waitlist`;

    const file = new File([csvContent], 'sources.csv', { type: 'text/csv' });

    const result = await processFileUpload(file);

    expect(result.success).toBe(true);

    // Verify source was preserved
    const allSubscribers = await db.select().from(subscribers);

    const john = allSubscribers.find(s => s.email === 'john@gmail.com');
    const jane = allSubscribers.find(s => s.email === 'jane@yahoo.com');

    expect(john?.source).toBe('newsletter');
    expect(jane?.source).toBe('waitlist');
  });

  it('should handle mixed personal and corporate emails correctly', async () => {
    const csvContent = `email
john@gmail.com
alice@acme.com
jane@yahoo.com
bob@techcorp.io
charlie@outlook.com`;

    const file = new File([csvContent], 'mixed.csv', { type: 'text/csv' });

    const result = await processFileUpload(file);

    expect(result.success).toBe(true);
    expect(result.summary!.newSubscribers).toBe(5);

    // Verify email classification
    const allSubscribers = await db.select().from(subscribers);
    const personalEmails = allSubscribers.filter(s => s.emailType === 'personal');
    const corporateEmails = allSubscribers.filter(s => s.emailType === 'corporate');

    expect(personalEmails.length).toBe(3); // gmail, yahoo, outlook
    expect(corporateEmails.length).toBe(2); // acme.com, techcorp.io

    // Verify only personal emails have enrichment jobs
    const allJobs = await db.select().from(enrichmentJobs);
    expect(allJobs.length).toBe(3);

    const jobSubscriberIds = allJobs.map(j => j.subscriberId);
    const personalSubscriberIds = personalEmails.map(s => s.id);

    // All jobs should be for personal email subscribers
    jobSubscriberIds.forEach(jobId => {
      expect(personalSubscriberIds).toContain(jobId);
    });
  });

  it('should handle file size limit', async () => {
    // Create file larger than 10MB
    const largeContent = 'email\n' + 'a'.repeat(11 * 1024 * 1024);
    const file = new File([largeContent], 'toolarge.csv', { type: 'text/csv' });

    const result = await processFileUpload(file);

    expect(result.success).toBe(false);
    expect(result.error).toContain('size exceeds maximum');

    // Verify no subscribers were created
    const allSubscribers = await db.select().from(subscribers);
    expect(allSubscribers.length).toBe(0);
  });
});
