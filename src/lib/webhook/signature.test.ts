import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createHmac } from 'crypto';
import { validateWebhookSignature } from './signature';

describe('Webhook Signature Validation', () => {
  // Feature: liwanag-mvp, Property 1: Webhook signature validation
  // Validates: Requirements 1.1
  it('should return true if and only if the signature is a valid HMAC-SHA256 hash', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // payload
        fc.string({ minLength: 1 }), // secret
        (payload, secret) => {
          // Generate valid signature
          const hmac = createHmac('sha256', secret);
          hmac.update(payload);
          const validSignature = hmac.digest('hex');

          // Test with valid signature
          const validResult = validateWebhookSignature(payload, validSignature, secret);
          expect(validResult.isValid).toBe(true);
          expect(validResult.error).toBeUndefined();

          // Test with invalid signature (modified)
          const invalidSignature = validSignature.slice(0, -1) + 'x';
          const invalidResult = validateWebhookSignature(payload, invalidSignature, secret);
          expect(invalidResult.isValid).toBe(false);
          expect(invalidResult.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject signatures with different secrets', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // payload
        fc.string({ minLength: 1 }), // secret1
        fc.string({ minLength: 1 }), // secret2
        (payload, secret1, secret2) => {
          fc.pre(secret1 !== secret2); // Only test when secrets are different

          // Generate signature with secret1
          const hmac = createHmac('sha256', secret1);
          hmac.update(payload);
          const signature = hmac.digest('hex');

          // Validate with secret2 should fail
          const result = validateWebhookSignature(payload, signature, secret2);
          expect(result.isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty payloads correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // secret
        (secret) => {
          const payload = '';
          const hmac = createHmac('sha256', secret);
          hmac.update(payload);
          const signature = hmac.digest('hex');

          const result = validateWebhookSignature(payload, signature, secret);
          expect(result.isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject signatures with incorrect length', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // payload
        fc.string({ minLength: 1 }), // secret
        fc.string({ minLength: 1, maxLength: 10 }), // short signature
        (payload, secret, shortSignature) => {
          const result = validateWebhookSignature(payload, shortSignature, secret);
          expect(result.isValid).toBe(false);
          expect(result.error).toBe('Signature length mismatch');
        }
      ),
      { numRuns: 100 }
    );
  });
});
