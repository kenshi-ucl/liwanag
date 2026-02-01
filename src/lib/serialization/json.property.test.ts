/**
 * Property-Based Tests for JSON Serialization
 * 
 * Tests Properties 36 and 38 from the design document
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  serialize,
  deserialize,
  serializeWithOptionals,
  deserializeWithOptionals,
  isValidJSON,
  SerializationError,
} from './json';

describe('JSON Serialization Properties', () => {
  // Feature: lumina-mvp, Property 36: JSON serialization round-trip
  // Validates: Requirements 13.3
  describe('Property 36: JSON serialization round-trip', () => {
    it('should preserve primitive values through serialize/deserialize cycle', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.double().filter(n => !Object.is(n, -0)), // Filter out -0 as JSON converts it to 0
            fc.boolean(),
            fc.constant(null)
          ),
          (value) => {
            const serialized = serialize(value);
            const deserialized = deserialize(serialized);
            expect(deserialized).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve arrays through serialize/deserialize cycle', () => {
      fc.assert(
        fc.property(
          fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean())),
          (value) => {
            const serialized = serialize(value);
            const deserialized = deserialize<typeof value>(serialized);
            expect(deserialized).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve objects through serialize/deserialize cycle', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string(),
            age: fc.integer({ min: 0, max: 120 }),
            active: fc.boolean(),
          }),
          (value) => {
            const serialized = serialize(value);
            const deserialized = deserialize<typeof value>(serialized);
            expect(deserialized).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve nested objects through serialize/deserialize cycle', () => {
      fc.assert(
        fc.property(
          fc.record({
            user: fc.record({
              email: fc.emailAddress(),
              profile: fc.record({
                name: fc.string(),
                age: fc.integer({ min: 0, max: 120 }),
              }),
            }),
            metadata: fc.record({
              timestamp: fc.integer({ min: 946684800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
              source: fc.constantFrom('newsletter', 'waitlist', 'upload'),
            }),
          }),
          (value) => {
            const serialized = serialize(value);
            const deserialized = deserialize<typeof value>(serialized);
            expect(deserialized).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve enrichment request objects through round-trip', () => {
      fc.assert(
        fc.property(
          fc.record({
            emails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 100 }),
            webhookUrl: fc.webUrl(),
          }),
          (value) => {
            const serialized = serialize(value);
            const deserialized = deserialize<typeof value>(serialized);
            expect(deserialized).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve webhook payload objects through round-trip', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            source: fc.constantFrom('newsletter', 'waitlist', 'upload'),
            metadata: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
            timestamp: fc.integer({ min: 946684800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
          }),
          (value) => {
            const serialized = serialize(value);
            const deserialized = deserialize<typeof value>(serialized);
            expect(deserialized).toEqual(value);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: lumina-mvp, Property 38: Optional field handling
  // Validates: Requirements 13.5
  describe('Property 38: Optional field handling', () => {
    it('should handle objects with missing optional fields during deserialization', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            linkedinUrl: fc.option(fc.webUrl(), { nil: undefined }),
            jobTitle: fc.option(fc.string(), { nil: undefined }),
            companyName: fc.option(fc.string(), { nil: undefined }),
            headcount: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: undefined }),
          }),
          (value) => {
            // Serialize (undefined fields will be omitted)
            const serialized = serialize(value);
            
            // Deserialize should succeed even with missing fields
            const deserialized = deserialize<typeof value>(serialized);
            
            // Required fields should be present
            expect(deserialized.email).toBe(value.email);
            
            // Optional fields should match (undefined becomes absent in JSON)
            if (value.linkedinUrl !== undefined) {
              expect(deserialized.linkedinUrl).toBe(value.linkedinUrl);
            }
            if (value.jobTitle !== undefined) {
              expect(deserialized.jobTitle).toBe(value.jobTitle);
            }
            if (value.companyName !== undefined) {
              expect(deserialized.companyName).toBe(value.companyName);
            }
            if (value.headcount !== undefined) {
              expect(deserialized.headcount).toBe(value.headcount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null values differently from undefined in optional fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            linkedinUrl: fc.option(fc.webUrl(), { nil: null }),
            jobTitle: fc.option(fc.string(), { nil: null }),
          }),
          (value) => {
            const serialized = serialize(value);
            const deserialized = deserialize<typeof value>(serialized);
            
            // Null values should be preserved
            expect(deserialized.linkedinUrl).toBe(value.linkedinUrl);
            expect(deserialized.jobTitle).toBe(value.jobTitle);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle enrichment results with optional fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            linkedinUrl: fc.option(fc.webUrl()),
            jobTitle: fc.option(fc.string()),
            companyName: fc.option(fc.string()),
            companyDomain: fc.option(fc.domain()),
            headcount: fc.option(fc.integer({ min: 1, max: 100000 })),
            industry: fc.option(fc.constantFrom('SaaS', 'Technology', 'Financial Services', 'Healthcare')),
            creditsUsed: fc.integer({ min: 1, max: 10 }),
          }),
          (value) => {
            const serialized = serialize(value);
            const deserialized = deserialize<typeof value>(serialized);
            
            // Required fields must be present
            expect(deserialized.email).toBe(value.email);
            expect(deserialized.creditsUsed).toBe(value.creditsUsed);
            
            // Optional fields should be handled gracefully
            // (undefined in input becomes absent in JSON, which becomes undefined in output)
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle serializeWithOptionals removing undefined fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            required: fc.string(),
            optional1: fc.option(fc.string(), { nil: undefined }),
            optional2: fc.option(fc.integer(), { nil: undefined }),
          }),
          (value) => {
            const serialized = serializeWithOptionals(value);
            const parsed = JSON.parse(serialized);
            
            // Required field should always be present
            expect(parsed.required).toBe(value.required);
            
            // Undefined fields should be removed
            if (value.optional1 === undefined) {
              expect(parsed).not.toHaveProperty('optional1');
            } else {
              expect(parsed.optional1).toBe(value.optional1);
            }
            
            if (value.optional2 === undefined) {
              expect(parsed).not.toHaveProperty('optional2');
            } else {
              expect(parsed.optional2).toBe(value.optional2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deserializeWithOptionals with defaults', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            status: fc.option(fc.constantFrom('pending', 'enriched', 'failed'), { nil: undefined }),
          }),
          fc.constantFrom('pending', 'enriched', 'failed'),
          (value, defaultStatus) => {
            // Serialize without the optional field sometimes
            const serialized = serialize({ email: value.email });
            
            // Deserialize with defaults
            const deserialized = deserializeWithOptionals(serialized, {
              status: defaultStatus,
            });
            
            // Should have the default value
            expect(deserialized.email).toBe(value.email);
            expect(deserialized.status).toBe(defaultStatus);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('JSON validation properties', () => {
    it('should correctly identify valid JSON strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.record({ key: fc.string() }),
            fc.array(fc.integer())
          ),
          (value) => {
            const json = JSON.stringify(value);
            expect(isValidJSON(json)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify invalid JSON strings', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            try {
              JSON.parse(s);
              return false;
            } catch {
              return true;
            }
          }),
          (invalidJson) => {
            expect(isValidJSON(invalidJson)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Error handling properties', () => {
    it('should throw SerializationError for circular references', () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      
      expect(() => serialize(circular)).toThrow(SerializationError);
    });

    it('should throw SerializationError for invalid JSON during deserialization', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            try {
              JSON.parse(s);
              return false;
            } catch {
              return true;
            }
          }),
          (invalidJson) => {
            expect(() => deserialize(invalidJson)).toThrow(SerializationError);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
