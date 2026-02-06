import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { FullEnrichClient, defaultRetryConfig } from './client';

describe('Exponential Backoff', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: liwanag-mvp, Property 39: Exponential backoff timing
  it('should calculate exponential backoff delays correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // Attempt number
        (attempt) => {
          const client = new FullEnrichClient('test-key', 'https://api.test.com');

          // Access private method via type assertion for testing
          const calculateBackoff = (client as any).calculateBackoff.bind(client);
          const delay = calculateBackoff(attempt);

          const expectedDelay = Math.min(
            defaultRetryConfig.initialDelay * Math.pow(defaultRetryConfig.multiplier, attempt - 1),
            defaultRetryConfig.maxDelay
          );

          expect(delay).toBe(expectedDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: liwanag-mvp, Property 39: Exponential backoff timing
  it('should respect exponential backoff pattern', () => {
    const delays: number[] = [];

    for (let attempt = 1; attempt <= 5; attempt++) {
      const delay = defaultRetryConfig.initialDelay * Math.pow(defaultRetryConfig.multiplier, attempt - 1);
      delays.push(Math.min(delay, defaultRetryConfig.maxDelay));
    }

    // Verify exponential growth
    for (let i = 1; i < delays.length; i++) {
      if (delays[i] < defaultRetryConfig.maxDelay) {
        expect(delays[i]).toBeGreaterThan(delays[i - 1]);
        expect(delays[i]).toBe(delays[i - 1] * defaultRetryConfig.multiplier);
      }
    }
  });

  // Feature: liwanag-mvp, Property 39: Exponential backoff timing
  it('should cap backoff delay at maxDelay', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // Large attempt numbers
        (attempt) => {
          const client = new FullEnrichClient('test-key', 'https://api.test.com');
          const calculateBackoff = (client as any).calculateBackoff.bind(client);
          const delay = calculateBackoff(attempt);

          expect(delay).toBeLessThanOrEqual(defaultRetryConfig.maxDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: liwanag-mvp, Property 39: Exponential backoff timing
  it('should parse Retry-After header correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3600 }), // Retry-After in seconds
        (retryAfterSeconds) => {
          const client = new FullEnrichClient('test-key', 'https://api.test.com');

          const mockResponse = {
            headers: new Headers({
              'Retry-After': retryAfterSeconds.toString(),
            }),
          } as Response;

          const getRetryAfter = (client as any).getRetryAfter.bind(client);
          const delay = getRetryAfter(mockResponse);

          expect(delay).toBe(retryAfterSeconds * 1000); // Should convert to milliseconds
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: liwanag-mvp, Property 39: Exponential backoff timing
  it('should use exponential backoff when Retry-After header is missing', () => {
    const client = new FullEnrichClient('test-key', 'https://api.test.com');

    const mockResponse = {
      headers: new Headers(),
    } as Response;

    const getRetryAfter = (client as any).getRetryAfter.bind(client);
    const delay = getRetryAfter(mockResponse);

    // Should fall back to initial delay
    expect(delay).toBe(defaultRetryConfig.initialDelay);
  });
});
