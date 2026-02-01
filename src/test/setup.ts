// Test setup file for Vitest
import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  // Setup test environment variables
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/lumina_test';
  process.env.FULLENRICH_API_KEY = process.env.FULLENRICH_API_KEY || 'test-api-key';
  process.env.FULLENRICH_WEBHOOK_URL = process.env.FULLENRICH_WEBHOOK_URL || 'https://test.com/webhook';
  process.env.NEWSLETTER_WEBHOOK_SECRET = process.env.NEWSLETTER_WEBHOOK_SECRET || 'test-newsletter-secret';
  process.env.FULLENRICH_WEBHOOK_SECRET = process.env.FULLENRICH_WEBHOOK_SECRET || 'test-fullenrich-secret';
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3000';
});

afterAll(() => {
  // Cleanup code after all tests
});
