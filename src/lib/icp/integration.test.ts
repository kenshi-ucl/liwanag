import { describe, it, expect } from 'vitest';
import { calculateICPScore } from './scorer';
import type { Subscriber } from '@/db/schema';

/**
 * Integration tests for ICP scoring with enrichment data
 * 
 * These tests verify that ICP scoring works correctly when integrated
 * with the enrichment pipeline.
 */

describe('ICP Scoring Integration', () => {
  const createSubscriber = (
    email: string,
    headcount?: number | null,
    industry?: string | null,
    jobTitle?: string | null,
    companyName?: string | null
  ): Subscriber => ({
    id: 'test-id',
    email,
    emailType: 'personal',
    source: 'newsletter',
    linkedinUrl: null,
    jobTitle: jobTitle || null,
    companyName: companyName || null,
    companyDomain: null,
    headcount: headcount || null,
    industry: industry || null,
    icpScore: null,
    syncedToCRM: false,
    syncedAt: null,
    rawPayload: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('Enrichment completion triggers ICP scoring', () => {
    it('should calculate ICP score when enrichment data is received', () => {
      // Simulate a subscriber after enrichment
      const enrichedSubscriber = createSubscriber(
        'john@gmail.com',
        250, // headcount in target range
        'SaaS', // target industry
        'VP of Engineering', // decision-maker title
        'Acme Corp'
      );

      const score = calculateICPScore(enrichedSubscriber);

      // Should get a high score for perfect ICP match
      expect(score).toBeGreaterThan(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return 0 for subscribers without enrichment data', () => {
      const unenrichedSubscriber = createSubscriber('jane@gmail.com');

      const score = calculateICPScore(unenrichedSubscriber);

      expect(score).toBe(0);
    });

    it('should handle partial enrichment data', () => {
      // Only headcount is enriched
      const partiallyEnriched = createSubscriber(
        'bob@gmail.com',
        100, // headcount in target range
        null,
        null,
        'Some Company'
      );

      const score = calculateICPScore(partiallyEnriched);

      // Should get some score based on headcount alone
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('should score high-value leads correctly', () => {
      // Perfect ICP match
      const highValueLead = createSubscriber(
        'cto@gmail.com',
        150,
        'Technology',
        'Chief Technology Officer',
        'Tech Startup'
      );

      const score = calculateICPScore(highValueLead);

      // Should be in "Hidden Gems" range (>70)
      expect(score).toBeGreaterThan(70);
    });

    it('should score low-value leads correctly', () => {
      // Poor ICP match
      const lowValueLead = createSubscriber(
        'intern@gmail.com',
        5, // very small company
        'Retail', // non-target industry
        'Intern', // non-decision-maker
        'Small Shop'
      );

      const score = calculateICPScore(lowValueLead);

      // Should get low score
      expect(score).toBeLessThan(50);
    });

    it('should handle edge cases in enrichment data', () => {
      // Edge case: very large company
      const largeCompany = createSubscriber(
        'manager@gmail.com',
        50000, // very large
        'Technology',
        'Manager',
        'Enterprise Corp'
      );

      const score = calculateICPScore(largeCompany);

      // Should still get some score but not perfect
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('should be case-insensitive for industry and job title matching', () => {
      const subscriber1 = createSubscriber(
        'vp1@gmail.com',
        200,
        'saas',
        'vp of sales',
        'Company A'
      );

      const subscriber2 = createSubscriber(
        'vp2@gmail.com',
        200,
        'SAAS',
        'VP OF SALES',
        'Company B'
      );

      const score1 = calculateICPScore(subscriber1);
      const score2 = calculateICPScore(subscriber2);

      // Should get same score regardless of case
      expect(score1).toBe(score2);
    });
  });

  describe('ICP score storage', () => {
    it('should produce integer scores suitable for database storage', () => {
      const subscriber = createSubscriber(
        'test@gmail.com',
        300,
        'Financial Services',
        'Director of Sales',
        'FinTech Inc'
      );

      const score = calculateICPScore(subscriber);

      // Verify it's an integer
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBe(Math.floor(score));
    });

    it('should produce scores within database constraints (0-100)', () => {
      // Test with various enrichment data combinations
      const testCases = [
        createSubscriber('a@gmail.com', null, null, null, null),
        createSubscriber('b@gmail.com', 100, 'SaaS', 'CEO', 'Startup'),
        createSubscriber('c@gmail.com', 1, 'Other', 'Employee', 'Small'),
        createSubscriber('d@gmail.com', 100000, 'Enterprise', 'VP', 'Large'),
      ];

      testCases.forEach(subscriber => {
        const score = calculateICPScore(subscriber);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });
});
