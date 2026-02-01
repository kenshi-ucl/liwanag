import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FullEnrichClient, FullEnrichAPIError } from './client';

describe('FullEnrich Client Error Handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect 402 payment required errors', async () => {
    const client = new FullEnrichClient('test-key', 'https://api.test.com');

    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 402,
      statusText: 'Payment Required',
      json: async () => ({ error: 'Insufficient credits' }),
      headers: new Headers(),
    })) as any;

    await expect(
      client.bulkEnrich({
        emails: ['test@example.com'],
        webhookUrl: 'https://webhook.test.com',
      })
    ).rejects.toThrow('Insufficient credits');

    await expect(
      client.bulkEnrich({
        emails: ['test@example.com'],
        webhookUrl: 'https://webhook.test.com',
      })
    ).rejects.toThrow(FullEnrichAPIError);
  });

  it('should include status code in 402 error', async () => {
    const client = new FullEnrichClient('test-key', 'https://api.test.com');

    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 402,
      statusText: 'Payment Required',
      json: async () => ({}),
      headers: new Headers(),
    })) as any;

    try {
      await client.bulkEnrich({
        emails: ['test@example.com'],
        webhookUrl: 'https://webhook.test.com',
      });
      expect.fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeInstanceOf(FullEnrichAPIError);
      if (error instanceof FullEnrichAPIError) {
        expect(error.statusCode).toBe(402);
        expect(error.message).toBe('Insufficient credits');
      }
    }
  });

  it('should not retry on 402 errors', async () => {
    const client = new FullEnrichClient('test-key', 'https://api.test.com');

    let callCount = 0;
    global.fetch = vi.fn(async () => {
      callCount++;
      return {
        ok: false,
        status: 402,
        statusText: 'Payment Required',
        json: async () => ({}),
        headers: new Headers(),
      };
    }) as any;

    await expect(
      client.bulkEnrich({
        emails: ['test@example.com'],
        webhookUrl: 'https://webhook.test.com',
      })
    ).rejects.toThrow();

    // Should only call once, no retries
    expect(callCount).toBe(1);
  });

  it('should handle rate limiting with Retry-After header', async () => {
    const client = new FullEnrichClient('test-key', 'https://api.test.com');

    let callCount = 0;
    global.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({}),
          headers: new Headers({ 'Retry-After': '1' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          enrichmentId: 'test-id',
          estimatedCredits: 3,
          status: 'accepted',
        }),
        headers: new Headers(),
      };
    }) as any;

    const result = await client.bulkEnrich({
      emails: ['test@example.com'],
      webhookUrl: 'https://webhook.test.com',
    });

    expect(callCount).toBe(2);
    expect(result.enrichmentId).toBe('test-id');
  });

  it('should retry on 500 errors', async () => {
    const client = new FullEnrichClient('test-key', 'https://api.test.com');

    let callCount = 0;
    global.fetch = vi.fn(async () => {
      callCount++;
      if (callCount < 3) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({}),
          headers: new Headers(),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          enrichmentId: 'test-id',
          estimatedCredits: 3,
          status: 'accepted',
        }),
        headers: new Headers(),
      };
    }) as any;

    const result = await client.bulkEnrich({
      emails: ['test@example.com'],
      webhookUrl: 'https://webhook.test.com',
    });

    expect(callCount).toBe(3);
    expect(result.enrichmentId).toBe('test-id');
  });

  it('should retry network errors up to 3 times', async () => {
    const client = new FullEnrichClient('test-key', 'https://api.test.com');

    let callCount = 0;
    global.fetch = vi.fn(async () => {
      callCount++;
      throw new TypeError('Network error');
    }) as any;

    await expect(
      client.bulkEnrich({
        emails: ['test@example.com'],
        webhookUrl: 'https://webhook.test.com',
      })
    ).rejects.toThrow('Network error');

    // Should retry network errors up to 3 times
    expect(callCount).toBe(3);
  });

  it('should validate request with Zod schema', async () => {
    const client = new FullEnrichClient('test-key', 'https://api.test.com');

    await expect(
      client.bulkEnrich({
        emails: [], // Empty array should fail validation
        webhookUrl: 'https://webhook.test.com',
      })
    ).rejects.toThrow();

    await expect(
      client.bulkEnrich({
        emails: ['invalid-email'], // Invalid email should fail validation
        webhookUrl: 'https://webhook.test.com',
      })
    ).rejects.toThrow();

    await expect(
      client.bulkEnrich({
        emails: ['test@example.com'],
        webhookUrl: 'not-a-url', // Invalid URL should fail validation
      })
    ).rejects.toThrow();
  });

  it('should validate response with Zod schema', async () => {
    const client = new FullEnrichClient('test-key', 'https://api.test.com');

    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        // Missing required fields
        enrichmentId: 'test-id',
        // Missing estimatedCredits
        // Missing status
      }),
      headers: new Headers(),
    })) as any;

    await expect(
      client.bulkEnrich({
        emails: ['test@example.com'],
        webhookUrl: 'https://webhook.test.com',
      })
    ).rejects.toThrow();
  });
});
