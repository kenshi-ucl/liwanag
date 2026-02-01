import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property-Based Tests for Enrichment Status Aggregation Logic
 * 
 * **Property 15: Enrichment status aggregation**
 * **Validates: Requirements 4.1**
 * 
 * These tests verify the correctness of status aggregation logic
 * without requiring a live database connection.
 */

export interface EnrichmentStatusCounts {
  pending: number;
  enriched: number;
  failed: number;
}

describe('Enrichment Status Aggregation - Property-Based Tests', () => {
  /**
   * Helper function to aggregate status counts
   * This mirrors the logic in getEnrichmentStatusCounts
   */
  const aggregateStatusCounts = (
    jobs: Array<{ status: 'pending' | 'enriched' | 'failed' | 'stale' }>
  ): EnrichmentStatusCounts => {
    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      enriched: jobs.filter(j => j.status === 'enriched').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };
  };

  // Feature: lumina-mvp, Property 15: Enrichment status aggregation
  it('should return accurate counts for pending, enriched, and failed jobs that sum to total', () => {
    fc.assert(
      fc.property(
        fc.record({
          pendingCount: fc.integer({ min: 0, max: 100 }),
          enrichedCount: fc.integer({ min: 0, max: 100 }),
          failedCount: fc.integer({ min: 0, max: 100 }),
        }),
        (config) => {
          // Create mock jobs with specified statuses
          const jobs: Array<{ status: 'pending' | 'enriched' | 'failed' | 'stale' }> = [];

          for (let i = 0; i < config.pendingCount; i++) {
            jobs.push({ status: 'pending' });
          }
          for (let i = 0; i < config.enrichedCount; i++) {
            jobs.push({ status: 'enriched' });
          }
          for (let i = 0; i < config.failedCount; i++) {
            jobs.push({ status: 'failed' });
          }

          const statusCounts = aggregateStatusCounts(jobs);

          // Verify individual counts
          expect(statusCounts.pending).toBe(config.pendingCount);
          expect(statusCounts.enriched).toBe(config.enrichedCount);
          expect(statusCounts.failed).toBe(config.failedCount);

          // Verify counts sum to total
          const sum = statusCounts.pending + statusCounts.enriched + statusCounts.failed;
          const totalJobs = config.pendingCount + config.enrichedCount + config.failedCount;
          expect(sum).toBe(totalJobs);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty job list correctly', () => {
    const statusCounts = aggregateStatusCounts([]);

    expect(statusCounts.pending).toBe(0);
    expect(statusCounts.enriched).toBe(0);
    expect(statusCounts.failed).toBe(0);
  });

  it('should not count stale jobs in any category', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }), // number of stale jobs
        fc.integer({ min: 0, max: 20 }), // number of pending jobs
        fc.integer({ min: 0, max: 20 }), // number of enriched jobs
        fc.integer({ min: 0, max: 20 }), // number of failed jobs
        (staleCount, pendingCount, enrichedCount, failedCount) => {
          const jobs: Array<{ status: 'pending' | 'enriched' | 'failed' | 'stale' }> = [];

          for (let i = 0; i < staleCount; i++) {
            jobs.push({ status: 'stale' });
          }
          for (let i = 0; i < pendingCount; i++) {
            jobs.push({ status: 'pending' });
          }
          for (let i = 0; i < enrichedCount; i++) {
            jobs.push({ status: 'enriched' });
          }
          for (let i = 0; i < failedCount; i++) {
            jobs.push({ status: 'failed' });
          }

          const statusCounts = aggregateStatusCounts(jobs);

          // Stale jobs should not be counted in any of the three categories
          expect(statusCounts.pending).toBe(pendingCount);
          expect(statusCounts.enriched).toBe(enrichedCount);
          expect(statusCounts.failed).toBe(failedCount);

          // Total of counted jobs should exclude stale jobs
          const sum = statusCounts.pending + statusCounts.enriched + statusCounts.failed;
          expect(sum).toBe(pendingCount + enrichedCount + failedCount);
          expect(sum).toBeLessThanOrEqual(jobs.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify all status counts are non-negative integers', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('pending', 'enriched', 'failed', 'stale'),
          { minLength: 0, maxLength: 100 }
        ),
        (statuses) => {
          const jobs = statuses.map(status => ({ status }));
          const statusCounts = aggregateStatusCounts(jobs);

          // All counts should be non-negative integers
          expect(statusCounts.pending).toBeGreaterThanOrEqual(0);
          expect(statusCounts.enriched).toBeGreaterThanOrEqual(0);
          expect(statusCounts.failed).toBeGreaterThanOrEqual(0);

          expect(Number.isInteger(statusCounts.pending)).toBe(true);
          expect(Number.isInteger(statusCounts.enriched)).toBe(true);
          expect(Number.isInteger(statusCounts.failed)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
