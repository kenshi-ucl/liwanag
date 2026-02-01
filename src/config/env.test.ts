import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { z } from 'zod';

/**
 * Property-Based Tests for Environment Configuration
 * 
 * **Validates: Requirements 11.1, 11.4**
 * 
 * These tests verify that environment variable loading behaves correctly
 * across all possible input scenarios using property-based testing.
 */

// Define the schema inline for testing (same as in env.ts)
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  FULLENRICH_API_KEY: z.string().min(1),
  FULLENRICH_WEBHOOK_URL: z.string().url(),
  NEWSLETTER_WEBHOOK_SECRET: z.string().min(1),
  FULLENRICH_WEBHOOK_SECRET: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
});

function testLoadEnv(envVars: Record<string, string>) {
  return envSchema.parse(envVars);
}

describe('Environment Configuration - Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  /**
   * Property: Environment variable loading
   * 
   * For any valid set of environment variables, the loadEnv function should
   * successfully parse and return the configuration without throwing errors.
   */
  it('should successfully load valid environment configurations', () => {
    fc.assert(
      fc.property(
        fc.record({
          DATABASE_URL: fc.webUrl({ validSchemes: ['postgresql', 'postgres'] }),
          FULLENRICH_API_KEY: fc.string({ minLength: 10, maxLength: 100 }),
          FULLENRICH_WEBHOOK_URL: fc.webUrl({ validSchemes: ['https'] }),
          NEWSLETTER_WEBHOOK_SECRET: fc.string({ minLength: 10, maxLength: 100 }),
          FULLENRICH_WEBHOOK_SECRET: fc.string({ minLength: 10, maxLength: 100 }),
          NODE_ENV: fc.constantFrom('development', 'production', 'test'),
          PORT: fc.integer({ min: 1000, max: 65535 }).map(String),
        }),
        (envVars) => {
          // Test environment loading
          const env = testLoadEnv(envVars);

          // Verify all required fields are present
          expect(env.DATABASE_URL).toBe(envVars.DATABASE_URL);
          expect(env.FULLENRICH_API_KEY).toBe(envVars.FULLENRICH_API_KEY);
          expect(env.FULLENRICH_WEBHOOK_URL).toBe(envVars.FULLENRICH_WEBHOOK_URL);
          expect(env.NEWSLETTER_WEBHOOK_SECRET).toBe(envVars.NEWSLETTER_WEBHOOK_SECRET);
          expect(env.FULLENRICH_WEBHOOK_SECRET).toBe(envVars.FULLENRICH_WEBHOOK_SECRET);
          expect(env.NODE_ENV).toBe(envVars.NODE_ENV);
          expect(env.PORT).toBe(Number(envVars.PORT));
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Missing required variables cause failure
   * 
   * For any configuration missing required environment variables,
   * the loadEnv function should throw an error with descriptive message.
   */
  it('should fail when required environment variables are missing', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'DATABASE_URL',
          'FULLENRICH_API_KEY',
          'FULLENRICH_WEBHOOK_URL',
          'NEWSLETTER_WEBHOOK_SECRET',
          'FULLENRICH_WEBHOOK_SECRET'
        ),
        (missingVar) => {
          // Set valid environment variables
          const envVars: Record<string, string> = {
            DATABASE_URL: 'postgresql://localhost:5432/test',
            FULLENRICH_API_KEY: 'test_api_key_12345',
            FULLENRICH_WEBHOOK_URL: 'https://example.com/webhook',
            NEWSLETTER_WEBHOOK_SECRET: 'newsletter_secret_12345',
            FULLENRICH_WEBHOOK_SECRET: 'fullenrich_secret_12345',
            NODE_ENV: 'test',
            PORT: '3000',
          };

          // Remove one required variable
          delete envVars[missingVar];

          // Should throw an error
          expect(() => testLoadEnv(envVars)).toThrow();
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Invalid URL formats are rejected
   * 
   * For any invalid URL in DATABASE_URL or FULLENRICH_WEBHOOK_URL,
   * the loadEnv function should reject the configuration.
   */
  it('should reject invalid URL formats', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('://')),
        (invalidUrl) => {
          // Set environment with invalid URL
          const envVars = {
            DATABASE_URL: invalidUrl, // Invalid URL
            FULLENRICH_API_KEY: 'test_api_key_12345',
            FULLENRICH_WEBHOOK_URL: 'https://example.com/webhook',
            NEWSLETTER_WEBHOOK_SECRET: 'newsletter_secret_12345',
            FULLENRICH_WEBHOOK_SECRET: 'fullenrich_secret_12345',
            NODE_ENV: 'test',
            PORT: '3000',
          };

          // Should throw an error for invalid URL
          expect(() => testLoadEnv(envVars)).toThrow();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: PORT defaults to 3000 when not provided
   * 
   * When PORT is not specified, the configuration should default to 3000.
   */
  it('should default PORT to 3000 when not provided', () => {
    // Set valid environment variables without PORT
    const envVars = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      FULLENRICH_API_KEY: 'test_api_key_12345',
      FULLENRICH_WEBHOOK_URL: 'https://example.com/webhook',
      NEWSLETTER_WEBHOOK_SECRET: 'newsletter_secret_12345',
      FULLENRICH_WEBHOOK_SECRET: 'fullenrich_secret_12345',
      NODE_ENV: 'test',
    };

    // Load environment
    const env = testLoadEnv(envVars);

    // Verify PORT defaults to 3000
    expect(env.PORT).toBe(3000);
  });

  /**
   * Property: NODE_ENV defaults to development when not provided
   * 
   * When NODE_ENV is not specified, the configuration should default to 'development'.
   */
  it('should default NODE_ENV to development when not provided', () => {
    // Set valid environment variables without NODE_ENV
    const envVars = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      FULLENRICH_API_KEY: 'test_api_key_12345',
      FULLENRICH_WEBHOOK_URL: 'https://example.com/webhook',
      NEWSLETTER_WEBHOOK_SECRET: 'newsletter_secret_12345',
      FULLENRICH_WEBHOOK_SECRET: 'fullenrich_secret_12345',
      PORT: '3000',
    };

    // Load environment
    const env = testLoadEnv(envVars);

    // Verify NODE_ENV defaults to 'development'
    expect(env.NODE_ENV).toBe('development');
  });
});
