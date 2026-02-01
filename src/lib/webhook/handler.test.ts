import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { createHmac } from 'crypto';
import { processWebhook, upsertSubscriber } from './handler';
import { db } from '@/db';
import { subscribers, webhookLogs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// Skip database tests if DATABASE_URL contains test credentials (no real DB)
const skipDbTests = process.env.DATABASE_URL?.includes('test:test@localhost');

describe.skipIf(skipDbTests)('Webhook Processing', () => {
  // Clean up database before and after each test
  beforeEach(async () => {
    try {
      await db.delete(webhookLogs);
      await db.delete(subscribers);
    } catch (error) {
      // Ignore cleanup errors in test environment
    }
  });

  afterEach(async () => {
    try {
      await db.delete(webhookLogs);
      await db.delete(subscribers);
    } catch (error) {
      // Ignore cleanup errors in test environment
    }
  });

  // Feature: lumina-mvp, Property 2: Raw payload persistence
  // Validates: Requirements 1.3
  it('should store raw payload in JSONB format after processing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.record({ key: fc.string() }).map(obj => obj || {}),
        async (email, source, secret, metadata) => {
          const timestamp = new Date().toISOString();
          const payload = {
            email,
            source,
            metadata,
            timestamp,
          };
          const rawPayload = JSON.stringify(payload);

          // Generate valid signature
          const hmac = createHmac('sha256', secret);
          hmac.update(rawPayload);
          const signature = hmac.digest('hex');

          // Process webhook
          const result = await processWebhook(rawPayload, signature, secret);

          if (result.success && result.subscriberId) {
            // Retrieve subscriber from database
            const [subscriber] = await db
              .select()
              .from(subscribers)
              .where(eq(subscribers.id, result.subscriberId));

            // Verify raw payload is stored
            expect(subscriber).toBeDefined();
            expect(subscriber.rawPayload).toEqual(payload);
          }
        }
      ),
      { numRuns: 50 } // Reduced runs for database operations
    );
  });

  // Feature: lumina-mvp, Property 4: Subscriber upsert idempotency
  // Validates: Requirements 1.5
  it('should result in exactly one subscriber record for duplicate emails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.integer({ min: 2, max: 5 }),
        async (email, source, secret, submitCount) => {
          const timestamp = new Date().toISOString();
          const payload = {
            email,
            source,
            timestamp,
          };
          const rawPayload = JSON.stringify(payload);

          // Generate valid signature
          const hmac = createHmac('sha256', secret);
          hmac.update(rawPayload);
          const signature = hmac.digest('hex');

          // Submit the same email multiple times
          const results = [];
          for (let i = 0; i < submitCount; i++) {
            const result = await processWebhook(rawPayload, signature, secret);
            results.push(result);
          }

          // Verify all submissions succeeded
          expect(results.every(r => r.success)).toBe(true);

          // Verify only one subscriber record exists
          const allSubscribers = await db
            .select()
            .from(subscribers)
            .where(eq(subscribers.email, email));

          expect(allSubscribers.length).toBe(1);

          // Verify first submission was 'created', rest were 'updated'
          expect(results[0].status).toBe('created');
          for (let i = 1; i < submitCount; i++) {
            expect(results[i].status).toBe('updated');
          }
        }
      ),
      { numRuns: 20 } // Reduced runs for multiple database operations
    );
  });

  // Feature: lumina-mvp, Property 5: Successful webhook response format
  // Validates: Requirements 1.6
  it('should return 200 with valid UUID subscriber ID on success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (email, source, secret) => {
          const timestamp = new Date().toISOString();
          const payload = {
            email,
            source,
            timestamp,
          };
          const rawPayload = JSON.stringify(payload);

          // Generate valid signature
          const hmac = createHmac('sha256', secret);
          hmac.update(rawPayload);
          const signature = hmac.digest('hex');

          // Process webhook
          const result = await processWebhook(rawPayload, signature, secret);

          // Verify success
          expect(result.success).toBe(true);
          expect(result.subscriberId).toBeDefined();

          // Verify UUID format (8-4-4-4-12 hex digits)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          expect(result.subscriberId).toMatch(uuidRegex);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject webhooks with invalid signatures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 64, maxLength: 64 }),
        async (email, source, secret, invalidSignature) => {
          const timestamp = new Date().toISOString();
          const payload = {
            email,
            source,
            timestamp,
          };
          const rawPayload = JSON.stringify(payload);

          // Process webhook with invalid signature
          const result = await processWebhook(rawPayload, invalidSignature, secret);

          // Verify failure
          expect(result.success).toBe(false);
          expect(result.subscriberId).toBeUndefined();
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle malformed JSON payloads gracefully', async () => {
    const malformedPayloads = [
      '{invalid json}',
      '{"email": "notanemail"}',
      '{"email": "test@example.com"}', // missing required fields
      '',
    ];

    for (const rawPayload of malformedPayloads) {
      const secret = 'test-secret';
      const hmac = createHmac('sha256', secret);
      hmac.update(rawPayload);
      const signature = hmac.digest('hex');

      const result = await processWebhook(rawPayload, signature, secret);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }
  });
});

describe.skipIf(skipDbTests)('Subscriber Upsert', () => {
  beforeEach(async () => {
    try {
      await db.delete(subscribers);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    try {
      await db.delete(subscribers);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should create new subscriber on first insert', async () => {
    const payload = {
      email: 'test@example.com',
      source: 'newsletter',
      timestamp: new Date().toISOString(),
    };

    const result = await upsertSubscriber(payload, 'corporate');

    expect(result.status).toBe('created');
    expect(result.id).toBeDefined();
    expect(result.email).toBe(payload.email);
  });

  it('should update existing subscriber on duplicate', async () => {
    const payload = {
      email: 'test@example.com',
      source: 'newsletter',
      timestamp: new Date().toISOString(),
    };

    // First insert
    const first = await upsertSubscriber(payload, 'corporate');
    expect(first.status).toBe('created');

    // Second insert (should update)
    const second = await upsertSubscriber(payload, 'corporate');
    expect(second.status).toBe('updated');
    expect(second.id).toBe(first.id);
  });
});
