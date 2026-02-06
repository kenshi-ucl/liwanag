import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/db';
import { subscribers, enrichmentJobs, webhookLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { processWebhook } from '@/lib/webhook/handler';
import { processEnrichmentWebhook } from '@/lib/enrichment/webhook-receiver';
import { createHmacSignature } from '@/lib/webhook/signature';
import { env } from '@/config/env';
import { initializeTestDatabase, cleanupTestDatabase, closeTestDatabase } from '@/test/db-setup';

/**
 * Integration test for webhook-to-enrichment flow
 * 
 * Tests the complete flow:
 * 1. Webhook received → subscriber created
 * 2. Job creation triggered for personal email
 * 3. Enrichment webhook callback received
 * 4. Subscriber updated with enriched data
 * 5. ICP score calculated
 */

describe('Webhook to Enrichment Flow Integration', () => {
  beforeAll(async () => {
    await initializeTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  it('should process complete webhook-to-enrichment flow for personal email', async () => {
    // Step 1: Receive newsletter webhook with personal email
    const webhookPayload = {
      email: 'john.doe@gmail.com',
      source: 'newsletter',
      metadata: { campaign: 'product-launch' },
      timestamp: new Date().toISOString(),
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = createHmacSignature(rawPayload, env.NEWSLETTER_WEBHOOK_SECRET);

    // Process webhook
    const webhookResult = await processWebhook(
      rawPayload,
      signature,
      env.NEWSLETTER_WEBHOOK_SECRET,
      '00000000-0000-4000-8000-000000000001' // Test organization ID
    );

    // Verify webhook processing succeeded
    expect(webhookResult.success).toBe(true);
    expect(webhookResult.status).toBe('created');
    expect(webhookResult.subscriberId).toBeDefined();

    const subscriberId = webhookResult.subscriberId!;

    // Verify subscriber was created
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId));

    expect(subscriber).toBeDefined();
    expect(subscriber.email).toBe('john.doe@gmail.com');
    expect(subscriber.emailType).toBe('personal');
    expect(subscriber.source).toBe('newsletter');

    // Verify webhook was logged
    const logs = await db.select().from(webhookLogs);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].source).toBe('newsletter');
    expect(logs[0].isValid).toBe(true);

    // Step 2: Verify enrichment job was created
    const [job] = await db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.subscriberId, subscriberId));

    expect(job).toBeDefined();
    expect(job.status).toBe('pending');
    expect(job.estimatedCredits).toBe(3); // Personal email = 3 credits

    // Step 3: Simulate FullEnrich API call (would happen in batch processor)
    // Update job with enrichment ID
    const enrichmentId = 'enrich_test_123';
    await db
      .update(enrichmentJobs)
      .set({ enrichmentId })
      .where(eq(enrichmentJobs.id, job.id));

    // Step 4: Receive enrichment webhook callback
    const enrichmentPayload = {
      enrichmentId,
      results: [
        {
          email: 'john.doe@gmail.com',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          jobTitle: 'VP of Engineering',
          companyName: 'Acme Corp',
          companyDomain: 'acme.com',
          headcount: 250,
          industry: 'SaaS',
          creditsUsed: 3,
        },
      ],
    };

    const enrichmentRawPayload = JSON.stringify(enrichmentPayload);
    const enrichmentSignature = createHmacSignature(
      enrichmentRawPayload,
      env.FULLENRICH_WEBHOOK_SECRET
    );

    // Process enrichment webhook
    const enrichmentResult = await processEnrichmentWebhook(
      enrichmentRawPayload,
      enrichmentSignature
    );

    // Verify enrichment processing succeeded
    expect(enrichmentResult.success).toBe(true);
    expect(enrichmentResult.processed).toBe(1);

    // Step 5: Verify subscriber was updated with enriched data
    const [enrichedSubscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId));

    expect(enrichedSubscriber.linkedinUrl).toBe('https://linkedin.com/in/johndoe');
    expect(enrichedSubscriber.jobTitle).toBe('VP of Engineering');
    expect(enrichedSubscriber.companyName).toBe('Acme Corp');
    expect(enrichedSubscriber.companyDomain).toBe('acme.com');
    expect(enrichedSubscriber.headcount).toBe(250);
    expect(enrichedSubscriber.industry).toBe('SaaS');

    // Step 6: Verify ICP score was calculated
    expect(enrichedSubscriber.icpScore).toBeDefined();
    expect(enrichedSubscriber.icpScore).toBeGreaterThan(70); // Should be high score for perfect ICP match

    // Step 7: Verify enrichment job was marked as complete
    const [completedJob] = await db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.id, job.id));

    expect(completedJob.status).toBe('enriched');
    expect(completedJob.actualCredits).toBe(3);
    expect(completedJob.completedAt).toBeDefined();
  });

  it('should not create enrichment job for corporate email', async () => {
    // Receive webhook with corporate email
    const webhookPayload = {
      email: 'john@acme.com',
      source: 'newsletter',
      timestamp: new Date().toISOString(),
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = createHmacSignature(rawPayload, env.NEWSLETTER_WEBHOOK_SECRET);

    const webhookResult = await processWebhook(
      rawPayload,
      signature,
      env.NEWSLETTER_WEBHOOK_SECRET,
      '00000000-0000-4000-8000-000000000001' // Test organization ID
    );

    expect(webhookResult.success).toBe(true);
    const subscriberId = webhookResult.subscriberId!;

    // Verify subscriber was created
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId));

    expect(subscriber.emailType).toBe('corporate');

    // Verify NO enrichment job was created
    const jobs = await db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.subscriberId, subscriberId));

    expect(jobs.length).toBe(0);
  });

  it('should handle partial enrichment data correctly', async () => {
    // Create subscriber
    const webhookPayload = {
      email: 'jane@gmail.com',
      source: 'waitlist',
      timestamp: new Date().toISOString(),
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = createHmacSignature(rawPayload, env.NEWSLETTER_WEBHOOK_SECRET);

    const webhookResult = await processWebhook(
      rawPayload,
      signature,
      env.NEWSLETTER_WEBHOOK_SECRET,
      '00000000-0000-4000-8000-000000000001' // Test organization ID
    );

    const subscriberId = webhookResult.subscriberId!;

    // Get enrichment job
    const [job] = await db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.subscriberId, subscriberId));

    const enrichmentId = 'enrich_partial_123';
    await db
      .update(enrichmentJobs)
      .set({ enrichmentId })
      .where(eq(enrichmentJobs.id, job.id));

    // Receive enrichment with partial data (only headcount)
    const enrichmentPayload = {
      enrichmentId,
      results: [
        {
          email: 'jane@gmail.com',
          headcount: 100,
          creditsUsed: 3,
        },
      ],
    };

    const enrichmentRawPayload = JSON.stringify(enrichmentPayload);
    const enrichmentSignature = createHmacSignature(
      enrichmentRawPayload,
      env.FULLENRICH_WEBHOOK_SECRET
    );

    const enrichmentResult = await processEnrichmentWebhook(
      enrichmentRawPayload,
      enrichmentSignature
    );

    expect(enrichmentResult.success).toBe(true);

    // Verify subscriber was updated with partial data
    const [enrichedSubscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, subscriberId));

    expect(enrichedSubscriber.headcount).toBe(100);
    expect(enrichedSubscriber.linkedinUrl).toBeNull();
    expect(enrichedSubscriber.jobTitle).toBeNull();

    // ICP score should still be calculated (based on headcount only)
    expect(enrichedSubscriber.icpScore).toBeDefined();
    expect(enrichedSubscriber.icpScore).toBeGreaterThan(0);
  });

  it('should handle duplicate webhook submissions idempotently', async () => {
    const webhookPayload = {
      email: 'duplicate@gmail.com',
      source: 'newsletter',
      timestamp: new Date().toISOString(),
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = createHmacSignature(rawPayload, env.NEWSLETTER_WEBHOOK_SECRET);

    // Submit webhook twice
    const result1 = await processWebhook(rawPayload, signature, env.NEWSLETTER_WEBHOOK_SECRET, '00000000-0000-4000-8000-000000000001');
    const result2 = await processWebhook(rawPayload, signature, env.NEWSLETTER_WEBHOOK_SECRET, '00000000-0000-4000-8000-000000000001');

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.status).toBe('created');
    expect(result2.status).toBe('updated');

    // Verify only one subscriber exists
    const allSubscribers = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, 'duplicate@gmail.com'));

    expect(allSubscribers.length).toBe(1);

    // Verify only one enrichment job was created
    const allJobs = await db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.subscriberId, allSubscribers[0].id));

    expect(allJobs.length).toBe(1);
  });

  it('should reject webhook with invalid signature', async () => {
    const webhookPayload = {
      email: 'invalid@gmail.com',
      source: 'newsletter',
      timestamp: new Date().toISOString(),
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const invalidSignature = 'invalid-signature';

    const result = await processWebhook(
      rawPayload,
      invalidSignature,
      env.NEWSLETTER_WEBHOOK_SECRET,
      '00000000-0000-4000-8000-000000000001' // Test organization ID
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid signature|Signature length mismatch/);

    // Verify no subscriber was created
    const allSubscribers = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, 'invalid@gmail.com'));

    expect(allSubscribers.length).toBe(0);

    // Verify webhook was logged as invalid
    const logs = await db.select().from(webhookLogs);
    const invalidLog = logs.find(log => log.isValid === false);
    expect(invalidLog).toBeDefined();
  });
});
