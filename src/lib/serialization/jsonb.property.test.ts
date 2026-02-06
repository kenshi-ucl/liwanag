/**
 * Property-Based Tests for JSONB Validation
 * 
 * Tests Property 37 from the design document
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateJSONB,
  safeValidateJSONB,
  isValidJSONB,
  prepareForJSONB,
  validateWebhookPayloadForJSONB,
  validateEnrichmentDataForJSONB,
  JSONBValidationError,
} from './jsonb';

describe('JSONB Validation Properties', () => {
  // Feature: liwanag-mvp, Property 37: JSONB storage validation
  // Validates: Requirements 13.4
  describe('Property 37: JSONB storage validation', () => {
    it('should validate that all JSON-serializable data is valid for JSONB storage', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.double().filter(n => !Object.is(n, -0)), // Filter out -0 as JSON converts it to 0
            fc.boolean(),
            fc.constant(null),
            fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean())),
            fc.record({
              key1: fc.string(),
              key2: fc.integer(),
              key3: fc.boolean(),
            })
          ),
          (value) => {
            // Should not throw for valid JSON-serializable data
            const validated = validateJSONB(value);

            // Validated data should be equivalent to original
            expect(validated).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate webhook payloads for JSONB storage', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            source: fc.constantFrom('newsletter', 'waitlist', 'upload'),
            metadata: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
            timestamp: fc.integer({ min: 946684800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
          }),
          (payload) => {
            // Should validate successfully
            const validated = validateWebhookPayloadForJSONB(payload);

            // Should preserve all fields
            expect(validated).toEqual(payload);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate enrichment data for JSONB storage', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            linkedinUrl: fc.option(fc.webUrl()),
            jobTitle: fc.option(fc.string()),
            companyName: fc.option(fc.string()),
            companyDomain: fc.option(fc.domain()),
            headcount: fc.option(fc.integer({ min: 1, max: 100000 })),
            industry: fc.option(fc.constantFrom('SaaS', 'Technology', 'Financial Services')),
            creditsUsed: fc.integer({ min: 1, max: 10 }),
          }),
          (data) => {
            // Should validate successfully
            const validated = validateEnrichmentDataForJSONB(data);

            // Should preserve all fields
            expect(validated).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate nested objects for JSONB storage', () => {
      fc.assert(
        fc.property(
          fc.record({
            subscriber: fc.record({
              email: fc.emailAddress(),
              profile: fc.record({
                name: fc.string(),
                age: fc.integer({ min: 0, max: 120 }),
              }),
            }),
            enrichment: fc.record({
              status: fc.constantFrom('pending', 'enriched', 'failed'),
              data: fc.option(fc.record({
                company: fc.string(),
                title: fc.string(),
              })),
            }),
          }),
          (data) => {
            const validated = validateJSONB(data);
            expect(validated).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate arrays for JSONB storage', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              email: fc.emailAddress(),
              status: fc.constantFrom('pending', 'enriched', 'failed'),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (data) => {
            const validated = validateJSONB(data);
            expect(validated).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle round-trip through JSONB validation', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            metadata: fc.record({
              source: fc.string(),
              timestamp: fc.date().map(d => d.toISOString()),
              tags: fc.array(fc.string()),
            }),
          }),
          (data) => {
            // First validation
            const validated1 = validateJSONB(data);

            // Second validation (should be idempotent)
            const validated2 = validateJSONB(validated1);

            // Both should be equal
            expect(validated1).toEqual(validated2);
            expect(validated2).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('JSONB validation with malformed data', () => {
    it('should reject circular references', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      expect(() => validateJSONB(circular)).toThrow(JSONBValidationError);
    });

    it('should reject undefined as top-level value', () => {
      expect(() => validateWebhookPayloadForJSONB(undefined)).toThrow(JSONBValidationError);
    });

    it('should reject null as webhook payload', () => {
      expect(() => validateWebhookPayloadForJSONB(null)).toThrow(JSONBValidationError);
    });

    it('should handle functions gracefully (cannot be serialized)', () => {
      const dataWithFunction = {
        email: 'test@example.com',
        callback: () => console.log('test'),
      };

      // Functions are omitted during JSON serialization
      const validated = validateJSONB(dataWithFunction);
      expect(validated).not.toHaveProperty('callback');
    });

    it('should handle symbols gracefully (cannot be serialized)', () => {
      const sym = Symbol('test');
      const dataWithSymbol = {
        email: 'test@example.com',
        [sym]: 'value',
      };

      // Symbols are omitted during JSON serialization
      const validated = validateJSONB(dataWithSymbol);
      // Check that the symbol property is not in the validated object
      expect(Object.getOwnPropertySymbols(validated as object)).toHaveLength(0);
      expect((validated as any).email).toBe('test@example.com');
    });
  });

  describe('Safe JSONB validation', () => {
    it('should return success for valid data', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string(),
          }),
          (data) => {
            const result = safeValidateJSONB(data);

            expect(result.isValid).toBe(true);
            expect(result.data).toEqual(data);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return failure for circular references without throwing', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      const result = safeValidateJSONB(circular);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });
  });

  describe('JSONB string validation', () => {
    it('should validate well-formed JSON strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({ key: fc.string() }),
            fc.array(fc.integer()),
            fc.string(),
            fc.integer(),
            fc.boolean()
          ),
          (value) => {
            const json = JSON.stringify(value);
            expect(isValidJSONB(json)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject malformed JSON strings', () => {
      const malformedExamples = [
        '{invalid}',
        '{"key": undefined}',
        "{'key': 'value'}",  // Single quotes
        '{key: "value"}',     // Unquoted key
        '{"key": "value",}',  // Trailing comma
      ];

      for (const malformed of malformedExamples) {
        expect(isValidJSONB(malformed)).toBe(false);
      }
    });
  });

  describe('JSONB preparation', () => {
    it('should prepare valid data for JSONB storage', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            metadata: fc.dictionary(fc.string(), fc.string()),
          }),
          (data) => {
            const prepared = prepareForJSONB(data);

            // Should be equivalent to original
            expect(prepared).toEqual(data);

            // Should be valid JSON
            const json = JSON.stringify(prepared);
            expect(isValidJSONB(json)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle complex nested structures', () => {
      fc.assert(
        fc.property(
          fc.record({
            level1: fc.record({
              level2: fc.record({
                level3: fc.record({
                  value: fc.string(),
                }),
              }),
            }),
          }),
          (data) => {
            const prepared = prepareForJSONB(data);
            expect(prepared).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Real-world JSONB scenarios', () => {
    it('should validate subscriber raw payload data', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            source: fc.constantFrom('newsletter', 'waitlist', 'upload'),
            subscribedAt: fc.integer({ min: 946684800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
            metadata: fc.record({
              ip: fc.ipV4(),
              userAgent: fc.string(),
              referrer: fc.option(fc.webUrl()),
            }),
          }),
          (payload) => {
            const validated = validateJSONB(payload);

            // Should preserve all fields
            expect(validated.email).toBe(payload.email);
            expect(validated.source).toBe(payload.source);
            expect(validated.subscribedAt).toBe(payload.subscribedAt);
            expect(validated.metadata).toEqual(payload.metadata);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate enrichment webhook callback data', () => {
      fc.assert(
        fc.property(
          fc.record({
            enrichmentId: fc.uuid(),
            results: fc.array(
              fc.record({
                email: fc.emailAddress(),
                linkedinUrl: fc.option(fc.webUrl()),
                jobTitle: fc.option(fc.string()),
                companyName: fc.option(fc.string()),
                creditsUsed: fc.integer({ min: 1, max: 10 }),
              }),
              { minLength: 1, maxLength: 100 }
            ),
          }),
          (callback) => {
            const validated = validateJSONB(callback);

            // Should preserve structure
            expect(validated.enrichmentId).toBe(callback.enrichmentId);
            expect(validated.results).toHaveLength(callback.results.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
