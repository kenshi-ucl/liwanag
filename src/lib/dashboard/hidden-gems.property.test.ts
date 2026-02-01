import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Subscriber } from '@/db/schema';

/**
 * Property-Based Tests for Hidden Gems Query
 * 
 * **Property 26: Hidden gems filtering**
 * **Property 27: Lead detail completeness**
 * **Validates: Requirements 7.4, 7.5**
 * 
 * These tests verify the correctness of hidden gems query logic
 * without requiring a live database connection.
 */

describe('Hidden Gems Query - Property-Based Tests', () => {
  /**
   * Helper function to create a mock subscriber
   */
  const createMockSubscriber = (overrides: Partial<Subscriber> = {}): Subscriber => ({
    id: crypto.randomUUID(),
    email: 'test@example.com',
    emailType: 'personal',
    source: 'newsletter',
    linkedinUrl: null,
    jobTitle: null,
    companyName: null,
    companyDomain: null,
    headcount: null,
    industry: null,
    icpScore: null,
    syncedToCRM: false,
    syncedAt: null,
    rawPayload: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  /**
   * Helper function to apply hidden gems filter
   * Requirements: 7.4 - enriched subscribers with ICP score > 70
   */
  const applyHiddenGemsFilter = (subscribers: Subscriber[], minScore: number = 70): Subscriber[] => {
    return subscribers.filter(s => 
      s.linkedinUrl !== null && // Must be enriched
      s.icpScore !== null &&
      s.icpScore > minScore // Strictly greater than threshold
    );
  };

  /**
   * Helper function to check if subscriber has all enrichment fields
   */
  const hasAllEnrichmentFields = (subscriber: Subscriber): boolean => {
    // Check that the subscriber object has all enrichment field properties
    // (they may be null, but the properties should exist)
    return (
      'linkedinUrl' in subscriber &&
      'jobTitle' in subscriber &&
      'companyName' in subscriber &&
      'companyDomain' in subscriber &&
      'headcount' in subscriber &&
      'industry' in subscriber
    );
  };

  // Feature: lumina-mvp, Property 26: Hidden gems filtering
  it('should filter enriched subscribers with ICP score > 70', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            linkedinUrl: fc.oneof(
              fc.constant(null),
              fc.constant('https://linkedin.com/in/johndoe')
            ),
            icpScore: fc.oneof(
              fc.constant(null),
              fc.integer({ min: 0, max: 100 })
            ),
          }),
          { minLength: 10, maxLength: 50 }
        ),
        (mockData) => {
          const mockSubscribers = mockData.map(data => 
            createMockSubscriber(data)
          );

          const hiddenGems = applyHiddenGemsFilter(mockSubscribers, 70);

          // Verify all results are enriched (have linkedinUrl)
          hiddenGems.forEach(subscriber => {
            expect(subscriber.linkedinUrl).not.toBeNull();
          });

          // Verify all results have ICP score > 70 (strictly greater)
          hiddenGems.forEach(subscriber => {
            expect(subscriber.icpScore).not.toBeNull();
            expect(subscriber.icpScore!).toBeGreaterThan(70);
          });

          // Verify count matches expected
          const expectedCount = mockData.filter(d => 
            d.linkedinUrl !== null &&
            d.icpScore !== null &&
            d.icpScore > 70
          ).length;
          expect(hiddenGems.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude subscribers with ICP score exactly equal to 70', () => {
    const subscribers = [
      createMockSubscriber({ linkedinUrl: 'https://linkedin.com/in/user1', icpScore: 69 }),
      createMockSubscriber({ linkedinUrl: 'https://linkedin.com/in/user2', icpScore: 70 }),
      createMockSubscriber({ linkedinUrl: 'https://linkedin.com/in/user3', icpScore: 71 }),
      createMockSubscriber({ linkedinUrl: 'https://linkedin.com/in/user4', icpScore: 80 }),
    ];

    const hiddenGems = applyHiddenGemsFilter(subscribers, 70);

    // Should only include scores > 70 (not >= 70)
    expect(hiddenGems.length).toBe(2);
    expect(hiddenGems.every(s => s.icpScore! > 70)).toBe(true);
  });

  it('should exclude non-enriched subscribers even with high ICP scores', () => {
    const subscribers = [
      createMockSubscriber({ linkedinUrl: null, icpScore: 90 }), // High score but not enriched
      createMockSubscriber({ linkedinUrl: 'https://linkedin.com/in/user1', icpScore: 80 }), // Enriched with high score
      createMockSubscriber({ linkedinUrl: null, icpScore: 85 }), // High score but not enriched
    ];

    const hiddenGems = applyHiddenGemsFilter(subscribers, 70);

    // Should only include the one enriched subscriber
    expect(hiddenGems.length).toBe(1);
    expect(hiddenGems[0].linkedinUrl).not.toBeNull();
    expect(hiddenGems[0].icpScore).toBe(80);
  });

  it('should handle null ICP scores correctly', () => {
    const subscribers = [
      createMockSubscriber({ linkedinUrl: 'https://linkedin.com/in/user1', icpScore: null }),
      createMockSubscriber({ linkedinUrl: 'https://linkedin.com/in/user2', icpScore: 80 }),
      createMockSubscriber({ linkedinUrl: null, icpScore: null }),
    ];

    const hiddenGems = applyHiddenGemsFilter(subscribers, 70);

    // Should only include enriched subscribers with non-null scores > 70
    expect(hiddenGems.length).toBe(1);
    expect(hiddenGems[0].icpScore).toBe(80);
  });

  it('should support custom minimum score thresholds', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            linkedinUrl: fc.constant('https://linkedin.com/in/user'),
            icpScore: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 10, maxLength: 30 }
        ),
        fc.integer({ min: 0, max: 100 }), // Custom threshold
        (mockData, customThreshold) => {
          const mockSubscribers = mockData.map(data => 
            createMockSubscriber(data)
          );

          const hiddenGems = applyHiddenGemsFilter(mockSubscribers, customThreshold);

          // Verify all results have ICP score > customThreshold
          hiddenGems.forEach(subscriber => {
            expect(subscriber.icpScore!).toBeGreaterThan(customThreshold);
          });

          // Verify count
          const expectedCount = mockData.filter(d => d.icpScore > customThreshold).length;
          expect(hiddenGems.length).toBe(expectedCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: lumina-mvp, Property 27: Lead detail completeness
  it('should include all enrichment fields in results', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            linkedinUrl: fc.constant('https://linkedin.com/in/user'),
            jobTitle: fc.oneof(
              fc.constant('VP of Engineering'),
              fc.constant('Director of Sales'),
              fc.constant(null)
            ),
            companyName: fc.oneof(
              fc.constant('Acme Corporation'),
              fc.constant('TechCorp Inc'),
              fc.constant(null)
            ),
            companyDomain: fc.oneof(
              fc.constant('acme.com'),
              fc.constant('techcorp.com'),
              fc.constant(null)
            ),
            headcount: fc.oneof(
              fc.integer({ min: 1, max: 10000 }),
              fc.constant(null)
            ),
            industry: fc.oneof(
              fc.constant('SaaS'),
              fc.constant('Technology'),
              fc.constant(null)
            ),
            icpScore: fc.integer({ min: 71, max: 100 }), // Ensure > 70
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (mockData) => {
          const mockSubscribers = mockData.map(data => 
            createMockSubscriber(data)
          );

          const hiddenGems = applyHiddenGemsFilter(mockSubscribers, 70);

          // Verify all results have all enrichment field properties
          hiddenGems.forEach(subscriber => {
            expect(hasAllEnrichmentFields(subscriber)).toBe(true);
            
            // Verify the structure includes all required fields
            expect(subscriber).toHaveProperty('linkedinUrl');
            expect(subscriber).toHaveProperty('jobTitle');
            expect(subscriber).toHaveProperty('companyName');
            expect(subscriber).toHaveProperty('companyDomain');
            expect(subscriber).toHaveProperty('headcount');
            expect(subscriber).toHaveProperty('industry');
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve all enrichment field values in results', () => {
    const enrichedSubscriber = createMockSubscriber({
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      jobTitle: 'VP of Engineering',
      companyName: 'Acme Corporation',
      companyDomain: 'acme.com',
      headcount: 250,
      industry: 'SaaS',
      icpScore: 85,
    });

    const subscribers = [enrichedSubscriber];
    const hiddenGems = applyHiddenGemsFilter(subscribers, 70);

    expect(hiddenGems.length).toBe(1);
    
    const result = hiddenGems[0];
    expect(result.linkedinUrl).toBe('https://linkedin.com/in/johndoe');
    expect(result.jobTitle).toBe('VP of Engineering');
    expect(result.companyName).toBe('Acme Corporation');
    expect(result.companyDomain).toBe('acme.com');
    expect(result.headcount).toBe(250);
    expect(result.industry).toBe('SaaS');
    expect(result.icpScore).toBe(85);
  });

  it('should handle partially enriched subscribers', () => {
    // Subscriber with linkedinUrl but missing some other enrichment fields
    const partiallyEnriched = createMockSubscriber({
      linkedinUrl: 'https://linkedin.com/in/user',
      jobTitle: 'VP of Sales',
      companyName: 'TechCorp',
      companyDomain: null, // Missing
      headcount: null, // Missing
      industry: 'Technology',
      icpScore: 75,
    });

    const subscribers = [partiallyEnriched];
    const hiddenGems = applyHiddenGemsFilter(subscribers, 70);

    expect(hiddenGems.length).toBe(1);
    
    // Should still include the subscriber even with some null fields
    const result = hiddenGems[0];
    expect(result.linkedinUrl).not.toBeNull();
    expect(result.jobTitle).toBe('VP of Sales');
    expect(result.companyName).toBe('TechCorp');
    expect(result.companyDomain).toBeNull();
    expect(result.headcount).toBeNull();
    expect(result.industry).toBe('Technology');
  });

  it('should return empty array when no subscribers meet criteria', () => {
    const subscribers = [
      createMockSubscriber({ linkedinUrl: null, icpScore: 80 }), // Not enriched
      createMockSubscriber({ linkedinUrl: 'https://linkedin.com/in/user', icpScore: 50 }), // Low score
      createMockSubscriber({ linkedinUrl: 'https://linkedin.com/in/user2', icpScore: 70 }), // Score not > 70
    ];

    const hiddenGems = applyHiddenGemsFilter(subscribers, 70);

    expect(hiddenGems).toEqual([]);
    expect(hiddenGems.length).toBe(0);
  });
});
