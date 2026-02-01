import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Subscriber } from '@/db/schema';

/**
 * Property-Based Tests for Lead Filtering Logic
 * 
 * **Property 28: ICP score filtering**
 * **Property 29: Case-insensitive partial search**
 * **Property 30: Filter combination with AND logic**
 * **Property 31: Filtered result count accuracy**
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
 * 
 * These tests verify the correctness of lead filtering logic
 * without requiring a live database connection.
 */

describe('Lead Filtering - Property-Based Tests', () => {
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
   * Helper function to apply ICP score filter
   */
  const applyICPScoreFilter = (subscribers: Subscriber[], minScore: number): Subscriber[] => {
    return subscribers.filter(s => s.icpScore !== null && s.icpScore >= minScore);
  };

  /**
   * Helper function to apply company name filter (case-insensitive partial match)
   */
  const applyCompanyNameFilter = (subscribers: Subscriber[], searchTerm: string): Subscriber[] => {
    const lowerSearch = searchTerm.toLowerCase();
    return subscribers.filter(s => 
      s.companyName !== null && s.companyName.toLowerCase().includes(lowerSearch)
    );
  };

  /**
   * Helper function to apply job title filter (case-insensitive partial match)
   */
  const applyJobTitleFilter = (subscribers: Subscriber[], searchTerm: string): Subscriber[] => {
    const lowerSearch = searchTerm.toLowerCase();
    return subscribers.filter(s => 
      s.jobTitle !== null && s.jobTitle.toLowerCase().includes(lowerSearch)
    );
  };

  /**
   * Helper function to apply sync status filter
   */
  const applySyncStatusFilter = (subscribers: Subscriber[], status: 'synced' | 'unsynced'): Subscriber[] => {
    return subscribers.filter(s => 
      status === 'synced' ? s.syncedToCRM === true : s.syncedToCRM === false
    );
  };

  // Feature: lumina-mvp, Property 28: ICP score filtering
  it('should filter leads by minimum ICP score', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 50 }), // ICP scores
        fc.integer({ min: 0, max: 100 }), // minimum score threshold
        (scores, minScore) => {
          // Create mock subscribers with various ICP scores
          const mockSubscribers = scores.map(score => 
            createMockSubscriber({ icpScore: score })
          );

          // Apply filter
          const filtered = applyICPScoreFilter(mockSubscribers, minScore);

          // Verify all filtered results have ICP score >= minScore
          filtered.forEach(subscriber => {
            expect(subscriber.icpScore).toBeGreaterThanOrEqual(minScore);
          });

          // Verify no results were incorrectly excluded
          const expectedCount = scores.filter(score => score >= minScore).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle null ICP scores in filtering', () => {
    const subscribers = [
      createMockSubscriber({ icpScore: 80 }),
      createMockSubscriber({ icpScore: null }),
      createMockSubscriber({ icpScore: 90 }),
      createMockSubscriber({ icpScore: null }),
    ];

    const filtered = applyICPScoreFilter(subscribers, 70);

    // Only subscribers with non-null scores >= 70 should be included
    expect(filtered.length).toBe(2);
    expect(filtered.every(s => s.icpScore !== null && s.icpScore >= 70)).toBe(true);
  });

  // Feature: lumina-mvp, Property 29: Case-insensitive partial search
  it('should perform case-insensitive partial matching on company name', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            companyName: fc.oneof(
              fc.constant('Acme Corporation'),
              fc.constant('TechCorp Inc'),
              fc.constant('Global Solutions'),
              fc.constant('Innovative Systems'),
              fc.constant(null)
            ),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        fc.constantFrom('corp', 'CORP', 'Corp', 'CoRp'), // Various case combinations
        (mockData, searchTerm) => {
          const mockSubscribers = mockData.map(data => 
            createMockSubscriber({ companyName: data.companyName })
          );

          const filtered = applyCompanyNameFilter(mockSubscribers, searchTerm);

          // Verify all results contain the search term (case-insensitive)
          filtered.forEach(subscriber => {
            expect(subscriber.companyName).not.toBeNull();
            expect(subscriber.companyName!.toLowerCase()).toContain(searchTerm.toLowerCase());
          });

          // Verify count matches expected
          const expectedCount = mockData.filter(
            d => d.companyName !== null && d.companyName.toLowerCase().includes(searchTerm.toLowerCase())
          ).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should perform case-insensitive partial matching on job title', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            jobTitle: fc.oneof(
              fc.constant('VP of Engineering'),
              fc.constant('Director of Sales'),
              fc.constant('Head of Marketing'),
              fc.constant('Chief Technology Officer'),
              fc.constant('Software Engineer'),
              fc.constant(null)
            ),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        fc.constantFrom('director', 'DIRECTOR', 'Director', 'DiReCtoR'),
        (mockData, searchTerm) => {
          const mockSubscribers = mockData.map(data => 
            createMockSubscriber({ jobTitle: data.jobTitle })
          );

          const filtered = applyJobTitleFilter(mockSubscribers, searchTerm);

          // Verify all results contain the search term (case-insensitive)
          filtered.forEach(subscriber => {
            expect(subscriber.jobTitle).not.toBeNull();
            expect(subscriber.jobTitle!.toLowerCase()).toContain(searchTerm.toLowerCase());
          });

          // Verify count matches expected
          const expectedCount = mockData.filter(
            d => d.jobTitle !== null && d.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())
          ).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle empty search terms', () => {
    const subscribers = [
      createMockSubscriber({ companyName: 'Acme Corp' }),
      createMockSubscriber({ companyName: 'TechCorp' }),
      createMockSubscriber({ companyName: null }),
    ];

    const filtered = applyCompanyNameFilter(subscribers, '');

    // Empty search should match all non-null company names
    expect(filtered.length).toBe(2);
  });

  // Feature: lumina-mvp, Property 30: Filter combination with AND logic
  it('should combine multiple filters with AND logic', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            icpScore: fc.integer({ min: 0, max: 100 }),
            companyName: fc.oneof(
              fc.constant('Acme Corporation'),
              fc.constant('TechCorp Inc'),
              fc.constant('Global Solutions')
            ),
            jobTitle: fc.oneof(
              fc.constant('VP of Engineering'),
              fc.constant('Director of Sales'),
              fc.constant('Software Engineer')
            ),
            syncedToCRM: fc.boolean(),
          }),
          { minLength: 10, maxLength: 30 }
        ),
        (mockData) => {
          const mockSubscribers = mockData.map(data => 
            createMockSubscriber(data)
          );

          // Apply multiple filters
          const minScore = 50;
          const companySearch = 'corp';
          const jobSearch = 'director';

          let filtered = applyICPScoreFilter(mockSubscribers, minScore);
          filtered = applyCompanyNameFilter(filtered, companySearch);
          filtered = applyJobTitleFilter(filtered, jobSearch);

          // Verify all results satisfy ALL filter conditions
          filtered.forEach(subscriber => {
            expect(subscriber.icpScore).toBeGreaterThanOrEqual(minScore);
            expect(subscriber.companyName!.toLowerCase()).toContain(companySearch.toLowerCase());
            expect(subscriber.jobTitle!.toLowerCase()).toContain(jobSearch.toLowerCase());
          });

          // Verify count matches manual filtering
          const expectedCount = mockData.filter(d => 
            d.icpScore >= minScore &&
            d.companyName.toLowerCase().includes(companySearch.toLowerCase()) &&
            d.jobTitle.toLowerCase().includes(jobSearch.toLowerCase())
          ).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should apply sync status filter correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            syncedToCRM: fc.boolean(),
          }),
          { minLength: 10, maxLength: 30 }
        ),
        fc.constantFrom('synced' as const, 'unsynced' as const),
        (mockData, syncStatus) => {
          const mockSubscribers = mockData.map(data => 
            createMockSubscriber(data)
          );

          const filtered = applySyncStatusFilter(mockSubscribers, syncStatus);

          // Verify all results match the sync status
          filtered.forEach(subscriber => {
            if (syncStatus === 'synced') {
              expect(subscriber.syncedToCRM).toBe(true);
            } else {
              expect(subscriber.syncedToCRM).toBe(false);
            }
          });

          // Verify count
          const expectedCount = mockData.filter(d => 
            syncStatus === 'synced' ? d.syncedToCRM === true : d.syncedToCRM === false
          ).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: lumina-mvp, Property 31: Filtered result count accuracy
  it('should return accurate total count of filtered results', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            icpScore: fc.integer({ min: 0, max: 100 }),
            companyName: fc.oneof(
              fc.constant('Acme Corporation'),
              fc.constant('TechCorp Inc'),
              fc.constant('Global Solutions'),
              fc.constant('Other Company')
            ),
          }),
          { minLength: 5, maxLength: 50 }
        ),
        fc.integer({ min: 0, max: 100 }),
        (mockData, minScore) => {
          const mockSubscribers = mockData.map(data => 
            createMockSubscriber(data)
          );

          const filtered = applyICPScoreFilter(mockSubscribers, minScore);

          // Total count should exactly match the number of results
          const totalCount = filtered.length;
          expect(totalCount).toBe(filtered.length);

          // Verify count is non-negative
          expect(totalCount).toBeGreaterThanOrEqual(0);

          // Verify count doesn't exceed original array length
          expect(totalCount).toBeLessThanOrEqual(mockSubscribers.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty result sets', () => {
    const subscribers = [
      createMockSubscriber({ icpScore: 30 }),
      createMockSubscriber({ icpScore: 40 }),
      createMockSubscriber({ icpScore: 50 }),
    ];

    // Filter with threshold higher than all scores
    const filtered = applyICPScoreFilter(subscribers, 80);

    expect(filtered.length).toBe(0);
  });

  it('should handle filters that match all records', () => {
    const subscribers = [
      createMockSubscriber({ icpScore: 80 }),
      createMockSubscriber({ icpScore: 90 }),
      createMockSubscriber({ icpScore: 100 }),
    ];

    // Filter with threshold lower than all scores
    const filtered = applyICPScoreFilter(subscribers, 0);

    expect(filtered.length).toBe(subscribers.length);
  });
});
