import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  bulkEnrichmentRequestSchema,
  bulkEnrichmentResponseSchema,
  enrichmentResultSchema,
  enrichmentWebhookCallbackSchema,
} from './schemas';

describe('FullEnrich API Response Validation', () => {
  // Feature: liwanag-mvp, Property 35: API response schema validation
  it('should validate bulk enrichment response against schema', () => {
    fc.assert(
      fc.property(
        fc.record({
          enrichmentId: fc.string({ minLength: 1 }),
          estimatedCredits: fc.integer({ min: 1, max: 1000 }),
          status: fc.constant('accepted' as const),
        }),
        (response) => {
          // Valid response should pass validation
          const result = bulkEnrichmentResponseSchema.safeParse(response);
          expect(result.success).toBe(true);

          if (result.success) {
            expect(result.data.enrichmentId).toBe(response.enrichmentId);
            expect(result.data.estimatedCredits).toBe(response.estimatedCredits);
            expect(result.data.status).toBe('accepted');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: liwanag-mvp, Property 35: API response schema validation
  it('should reject invalid bulk enrichment response', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Missing enrichmentId
          fc.record({
            estimatedCredits: fc.integer({ min: 1 }),
            status: fc.constant('accepted' as const),
          }),
          // Invalid estimatedCredits (negative)
          fc.record({
            enrichmentId: fc.string({ minLength: 1 }),
            estimatedCredits: fc.integer({ max: 0 }),
            status: fc.constant('accepted' as const),
          }),
          // Invalid status
          fc.record({
            enrichmentId: fc.string({ minLength: 1 }),
            estimatedCredits: fc.integer({ min: 1 }),
            status: fc.constant('rejected' as const),
          })
        ),
        (invalidResponse) => {
          const result = bulkEnrichmentResponseSchema.safeParse(invalidResponse);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: liwanag-mvp, Property 35: API response schema validation
  it('should validate enrichment result against schema', () => {
    // Custom email generator that produces valid emails
    const validEmailArb = fc.tuple(
      fc.stringMatching(/^[a-z0-9]+$/),
      fc.constantFrom('gmail.com', 'yahoo.com', 'example.com', 'test.com')
    ).map(([local, domain]) => `${local}@${domain}`);

    fc.assert(
      fc.property(
        fc.record({
          email: validEmailArb,
          linkedinUrl: fc.option(fc.webUrl(), { nil: undefined }),
          jobTitle: fc.option(fc.string(), { nil: undefined }),
          companyName: fc.option(fc.string(), { nil: undefined }),
          companyDomain: fc.option(fc.domain(), { nil: undefined }),
          headcount: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: undefined }),
          industry: fc.option(fc.string(), { nil: undefined }),
          creditsUsed: fc.integer({ min: 1, max: 10 }),
        }),
        (result) => {
          const validationResult = enrichmentResultSchema.safeParse(result);
          expect(validationResult.success).toBe(true);

          if (validationResult.success) {
            expect(validationResult.data.email).toBe(result.email);
            expect(validationResult.data.creditsUsed).toBe(result.creditsUsed);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: liwanag-mvp, Property 35: API response schema validation
  it('should reject enrichment result with invalid email', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string().filter(s => !s.includes('@')), // Invalid email
          creditsUsed: fc.integer({ min: 1, max: 10 }),
        }),
        (invalidResult) => {
          const result = enrichmentResultSchema.safeParse(invalidResult);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: liwanag-mvp, Property 35: API response schema validation
  it('should validate enrichment webhook callback against schema', () => {
    // Custom email generator that produces valid emails
    const validEmailArb = fc.tuple(
      fc.stringMatching(/^[a-z0-9]+$/),
      fc.constantFrom('gmail.com', 'yahoo.com', 'example.com', 'test.com')
    ).map(([local, domain]) => `${local}@${domain}`);

    fc.assert(
      fc.property(
        fc.record({
          enrichmentId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          results: fc.array(
            fc.record({
              email: validEmailArb,
              linkedinUrl: fc.option(fc.webUrl(), { nil: undefined }),
              jobTitle: fc.option(fc.string(), { nil: undefined }),
              companyName: fc.option(fc.string(), { nil: undefined }),
              companyDomain: fc.option(fc.domain(), { nil: undefined }),
              headcount: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: undefined }),
              industry: fc.option(fc.string(), { nil: undefined }),
              creditsUsed: fc.integer({ min: 1, max: 10 }),
            }),
            { minLength: 1, maxLength: 100 }
          ),
        }),
        (callback) => {
          const result = enrichmentWebhookCallbackSchema.safeParse(callback);
          expect(result.success).toBe(true);

          if (result.success) {
            expect(result.data.enrichmentId).toBe(callback.enrichmentId);
            expect(result.data.results.length).toBe(callback.results.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: liwanag-mvp, Property 35: API response schema validation
  it('should validate bulk enrichment request against schema', () => {
    // Custom email generator that produces valid emails
    const validEmailArb = fc.tuple(
      fc.stringMatching(/^[a-z0-9]+$/),
      fc.constantFrom('gmail.com', 'yahoo.com', 'example.com', 'test.com')
    ).map(([local, domain]) => `${local}@${domain}`);

    fc.assert(
      fc.property(
        fc.record({
          emails: fc.array(validEmailArb, { minLength: 1, maxLength: 100 }),
          webhookUrl: fc.webUrl(),
        }),
        (request) => {
          const result = bulkEnrichmentRequestSchema.safeParse(request);
          expect(result.success).toBe(true);

          if (result.success) {
            expect(result.data.emails.length).toBe(request.emails.length);
            expect(result.data.webhookUrl).toBe(request.webhookUrl);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: liwanag-mvp, Property 35: API response schema validation
  it('should reject bulk enrichment request with too many emails', () => {
    fc.assert(
      fc.property(
        fc.record({
          emails: fc.array(fc.emailAddress(), { minLength: 101, maxLength: 200 }),
          webhookUrl: fc.webUrl(),
        }),
        (invalidRequest) => {
          const result = bulkEnrichmentRequestSchema.safeParse(invalidRequest);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: liwanag-mvp, Property 35: API response schema validation
  it('should reject bulk enrichment request with empty emails array', () => {
    fc.assert(
      fc.property(
        fc.record({
          emails: fc.constant([]),
          webhookUrl: fc.webUrl(),
        }),
        (invalidRequest) => {
          const result = bulkEnrichmentRequestSchema.safeParse(invalidRequest);
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
