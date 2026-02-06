import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { classifyEmail } from './classifier';

describe('Email Classification', () => {
  // Feature: liwanag-mvp, Property 3: Email classification correctness
  // Validates: Requirements 1.4
  it('should classify consumer domains as personal and others as corporate', () => {
    const consumerDomains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'icloud.com',
      'aol.com',
      'protonmail.com',
      'mail.com',
      'zoho.com',
      'yandex.com',
      'gmx.com',
      'live.com',
      'msn.com',
      'me.com',
      'mac.com',
    ];

    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const classification = classifyEmail(email);
          const domain = email.split('@')[1]?.toLowerCase();

          if (domain && consumerDomains.includes(domain)) {
            expect(classification).toBe('personal');
          } else {
            expect(classification).toBe('corporate');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should classify specific consumer domains as personal', () => {
    const consumerDomains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
    ];

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => !s.includes('@')),
        fc.constantFrom(...consumerDomains),
        (localPart, domain) => {
          const email = `${localPart}@${domain}`;
          const classification = classifyEmail(email);
          expect(classification).toBe('personal');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should classify non-consumer domains as corporate', () => {
    const corporateDomains = [
      'acme.com',
      'example.org',
      'company.io',
      'business.net',
      'enterprise.co',
    ];

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => !s.includes('@')),
        fc.constantFrom(...corporateDomains),
        (localPart, domain) => {
          const email = `${localPart}@${domain}`;
          const classification = classifyEmail(email);
          expect(classification).toBe('corporate');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle case-insensitive domain matching', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => !s.includes('@')),
        fc.constantFrom('gmail.com', 'GMAIL.COM', 'Gmail.Com', 'GmAiL.cOm'),
        (localPart, domain) => {
          const email = `${localPart}@${domain}`;
          const classification = classifyEmail(email);
          expect(classification).toBe('personal');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should default to corporate for malformed emails', () => {
    const malformedEmails = [
      'notanemail',
      '@nodomain.com',
      'noatsign.com',
      '',
    ];

    malformedEmails.forEach(email => {
      const classification = classifyEmail(email);
      expect(classification).toBe('corporate');
    });
  });
});
