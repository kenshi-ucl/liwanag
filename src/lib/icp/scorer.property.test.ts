import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateICPScore,
  scoreHeadcount,
  scoreIndustry,
  scoreJobTitle,
  DEFAULT_ICP_CRITERIA,
  DEFAULT_SCORING_WEIGHTS,
  type ICPCriteria,
} from './scorer';
import type { Subscriber } from '@/db/schema';

/**
 * Property-Based Tests for ICP Scoring
 * 
 * **Property 21: ICP score calculation triggers**
 * **Property 22: ICP scoring criteria correctness**
 * **Property 23: ICP score bounds**
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6**
 */

describe('ICP Scorer - Property Tests', () => {
  // Helper to create mock subscriber with enrichment data
  const createEnrichedSubscriber = (
    email: string,
    headcount?: number | null,
    industry?: string | null,
    jobTitle?: string | null,
    companyName?: string | null
  ): Subscriber => ({
    id: fc.sample(fc.uuid(), 1)[0],
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

  // Custom arbitraries for ICP scoring
  const targetHeadcountArb = fc.integer({ min: 50, max: 500 });
  const lowHeadcountArb = fc.integer({ min: 1, max: 49 });
  const highHeadcountArb = fc.integer({ min: 501, max: 10000 });
  
  const targetIndustryArb = fc.constantFrom('SaaS', 'Technology', 'Financial Services');
  const nonTargetIndustryArb = fc.constantFrom('Healthcare', 'Retail', 'Manufacturing', 'Education');
  
  const decisionMakerTitleArb = fc.constantFrom(
    'VP of Engineering',
    'Director of Sales',
    'Head of Marketing',
    'Chief Technology Officer',
    'Chief Executive Officer'
  );
  const nonDecisionMakerTitleArb = fc.constantFrom(
    'Software Engineer',
    'Marketing Coordinator',
    'Sales Representative',
    'Analyst'
  );

  describe('Property 21: ICP score calculation triggers', () => {
    it('should calculate ICP score when enrichment data is present', () => {
      /**
       * **Validates: Requirements 6.1**
       * For any subscriber that receives enrichment data (company_name, headcount, 
       * industry, job_title), an ICP score should be calculated and stored.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.option(fc.integer({ min: 1, max: 10000 })),
          fc.option(fc.string({ minLength: 3, maxLength: 50 })),
          fc.option(fc.string({ minLength: 3, maxLength: 50 })),
          fc.option(fc.string({ minLength: 3, maxLength: 50 })),
          (email, headcount, industry, jobTitle, companyName) => {
            // At least one enrichment field should be present
            fc.pre(headcount !== null || industry !== null || jobTitle !== null || companyName !== null);

            const subscriber = createEnrichedSubscriber(
              email,
              headcount,
              industry,
              jobTitle,
              companyName
            );

            const score = calculateICPScore(subscriber);

            // Score should be calculated (not null/undefined)
            expect(score).toBeDefined();
            expect(typeof score).toBe('number');
            expect(Number.isInteger(score)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when no enrichment data is present', () => {
      /**
       * **Validates: Requirements 6.1**
       * Subscribers without enrichment data should receive a score of 0.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            const subscriber = createEnrichedSubscriber(email, null, null, null, null);

            const score = calculateICPScore(subscriber);

            expect(score).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 22: ICP scoring criteria correctness', () => {
    it('should score target profile higher than non-target profile', () => {
      /**
       * **Validates: Requirements 6.2, 6.3, 6.4**
       * For any two enriched subscribers, if subscriber A has headcount in range 50-500,
       * industry in target list (SaaS, Technology, Financial Services), and decision-maker
       * job title (VP, Director, Head of, Chief), while subscriber B has none of these,
       * then subscriber A's ICP score should be higher than subscriber B's.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.emailAddress(),
          targetHeadcountArb,
          targetIndustryArb,
          decisionMakerTitleArb,
          lowHeadcountArb,
          nonTargetIndustryArb,
          nonDecisionMakerTitleArb,
          (emailA, emailB, targetHeadcount, targetIndustry, targetTitle, lowHeadcount, nonTargetIndustry, nonTargetTitle) => {
            // Subscriber A: Perfect ICP match
            const subscriberA = createEnrichedSubscriber(
              emailA,
              targetHeadcount,
              targetIndustry,
              targetTitle,
              'Acme Corp'
            );

            // Subscriber B: Poor ICP match
            const subscriberB = createEnrichedSubscriber(
              emailB,
              lowHeadcount,
              nonTargetIndustry,
              nonTargetTitle,
              'Small Shop'
            );

            const scoreA = calculateICPScore(subscriberA);
            const scoreB = calculateICPScore(subscriberB);

            // Subscriber A should have higher score
            expect(scoreA).toBeGreaterThan(scoreB);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should score headcount in target range (50-500) higher than outside range', () => {
      /**
       * **Validates: Requirements 6.2**
       * Companies with headcount between 50-500 employees should receive higher scores.
       */
      fc.assert(
        fc.property(
          targetHeadcountArb,
          fc.oneof(lowHeadcountArb, highHeadcountArb),
          (targetHeadcount, nonTargetHeadcount) => {
            const targetScore = scoreHeadcount(targetHeadcount, DEFAULT_ICP_CRITERIA);
            const nonTargetScore = scoreHeadcount(nonTargetHeadcount, DEFAULT_ICP_CRITERIA);

            // Target range should get perfect score
            expect(targetScore).toBe(100);
            // Non-target should get lower score
            expect(nonTargetScore).toBeLessThan(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should score target industries higher than non-target industries', () => {
      /**
       * **Validates: Requirements 6.3**
       * Target industries (SaaS, Technology, Financial Services) should receive higher scores.
       */
      fc.assert(
        fc.property(
          targetIndustryArb,
          nonTargetIndustryArb,
          (targetIndustry, nonTargetIndustry) => {
            const targetScore = scoreIndustry(targetIndustry, DEFAULT_ICP_CRITERIA);
            const nonTargetScore = scoreIndustry(nonTargetIndustry, DEFAULT_ICP_CRITERIA);

            // Target industry should get perfect score
            expect(targetScore).toBe(100);
            // Non-target should get lower score
            expect(nonTargetScore).toBeLessThan(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should score decision-maker titles higher than non-decision-maker titles', () => {
      /**
       * **Validates: Requirements 6.4**
       * Decision-maker job titles (VP, Director, Head of, Chief) should receive higher scores.
       */
      fc.assert(
        fc.property(
          decisionMakerTitleArb,
          nonDecisionMakerTitleArb,
          (decisionMakerTitle, nonDecisionMakerTitle) => {
            const decisionMakerScore = scoreJobTitle(decisionMakerTitle, DEFAULT_ICP_CRITERIA);
            const nonDecisionMakerScore = scoreJobTitle(nonDecisionMakerTitle, DEFAULT_ICP_CRITERIA);

            // Decision-maker should get high score (70-100)
            expect(decisionMakerScore).toBeGreaterThanOrEqual(70);
            // Non-decision-maker should get lower score
            expect(nonDecisionMakerScore).toBeLessThan(70);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle case-insensitive matching for industries and job titles', () => {
      /**
       * **Validates: Requirements 6.3, 6.4**
       * Industry and job title matching should be case-insensitive.
       */
      fc.assert(
        fc.property(
          fc.constantFrom('saas', 'SAAS', 'SaaS', 'SaAs'),
          fc.constantFrom('vp of engineering', 'VP OF ENGINEERING', 'VP of Engineering'),
          (industry, jobTitle) => {
            const industryScore = scoreIndustry(industry, DEFAULT_ICP_CRITERIA);
            const jobTitleScore = scoreJobTitle(jobTitle, DEFAULT_ICP_CRITERIA);

            // Should match regardless of case
            expect(industryScore).toBe(100);
            expect(jobTitleScore).toBeGreaterThanOrEqual(70);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should combine component scores with weights correctly', () => {
      /**
       * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
       * The final ICP score should be a weighted combination of component scores.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          targetHeadcountArb,
          targetIndustryArb,
          fc.constantFrom('Chief Technology Officer', 'Chief Executive Officer', 'Chief Financial Officer'),
          (email, headcount, industry, jobTitle) => {
            const subscriber = createEnrichedSubscriber(
              email,
              headcount,
              industry,
              jobTitle,
              'Perfect Corp'
            );

            const score = calculateICPScore(subscriber);

            // With all perfect scores (100 each) and default weights (0.4, 0.3, 0.3)
            // Expected: 100 * 0.4 + 100 * 0.3 + 100 * 0.3 = 100
            // Note: Using Chief titles which score 100, not VP which scores 90
            expect(score).toBe(100);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle partial enrichment data gracefully', () => {
      /**
       * **Validates: Requirements 6.1**
       * Scoring should work even when only some enrichment fields are present.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.option(targetHeadcountArb, { nil: null }),
          fc.option(targetIndustryArb, { nil: null }),
          fc.option(decisionMakerTitleArb, { nil: null }),
          (email, headcount, industry, jobTitle) => {
            // At least one field should be present
            fc.pre(headcount !== null || industry !== null || jobTitle !== null);

            const subscriber = createEnrichedSubscriber(
              email,
              headcount,
              industry,
              jobTitle,
              'Some Corp'
            );

            const score = calculateICPScore(subscriber);

            // Score should be calculated and valid
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
            expect(Number.isInteger(score)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 23: ICP score bounds', () => {
    it('should always return integer between 0 and 100 inclusive', () => {
      /**
       * **Validates: Requirements 6.6**
       * For any calculated ICP score, the value should be an integer between 0 and 100 inclusive.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.option(fc.integer({ min: 1, max: 100000 })),
          fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          fc.option(fc.string({ minLength: 1, max: 100 })),
          (email, headcount, industry, jobTitle) => {
            const subscriber = createEnrichedSubscriber(
              email,
              headcount,
              industry,
              jobTitle,
              'Any Corp'
            );

            const score = calculateICPScore(subscriber);

            // Verify bounds
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
            
            // Verify integer
            expect(Number.isInteger(score)).toBe(true);
            expect(score).toBe(Math.floor(score));
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should return 0 for completely missing enrichment data', () => {
      /**
       * **Validates: Requirements 6.6**
       * Minimum score should be 0 when no enrichment data is available.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            const subscriber = createEnrichedSubscriber(email, null, null, null, null);

            const score = calculateICPScore(subscriber);

            expect(score).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return 100 for perfect ICP match', () => {
      /**
       * **Validates: Requirements 6.6**
       * Maximum score should be 100 for perfect ICP matches.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          targetHeadcountArb,
          targetIndustryArb,
          fc.constantFrom('Chief Technology Officer', 'Chief Executive Officer', 'Chief Financial Officer'),
          (email, headcount, industry, jobTitle) => {
            const subscriber = createEnrichedSubscriber(
              email,
              headcount,
              industry,
              jobTitle,
              'Perfect Match Inc'
            );

            const score = calculateICPScore(subscriber);

            // Note: Using Chief titles which score 100, not VP which scores 90
            expect(score).toBe(100);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should never return negative scores', () => {
      /**
       * **Validates: Requirements 6.6**
       * Scores should never be negative, even with unusual input data.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.option(fc.integer({ min: -1000, max: 100000 })),
          fc.option(fc.string()),
          fc.option(fc.string()),
          (email, headcount, industry, jobTitle) => {
            const subscriber = createEnrichedSubscriber(
              email,
              headcount,
              industry,
              jobTitle,
              'Test Corp'
            );

            const score = calculateICPScore(subscriber);

            expect(score).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never return scores greater than 100', () => {
      /**
       * **Validates: Requirements 6.6**
       * Scores should never exceed 100, even with perfect matches.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.integer({ min: 1, max: 100000 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (email, headcount, industry, jobTitle) => {
            const subscriber = createEnrichedSubscriber(
              email,
              headcount,
              industry,
              jobTitle,
              'Test Corp'
            );

            const score = calculateICPScore(subscriber);

            expect(score).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle custom criteria and weights while maintaining bounds', () => {
      /**
       * **Validates: Requirements 6.6**
       * Even with custom criteria and weights, scores should remain within 0-100.
       */
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.integer({ min: 1, max: 10000 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 10, max: 1000 }),
          fc.integer({ min: 100, max: 5000 }),
          fc.double({ min: 0.1, max: 0.8, noNaN: true }),
          fc.double({ min: 0.1, max: 0.8, noNaN: true }),
          (email, headcount, industry, jobTitle, minHeadcount, maxHeadcount, weight1, weight2) => {
            // Ensure weights are valid numbers
            fc.pre(!isNaN(weight1) && !isNaN(weight2) && isFinite(weight1) && isFinite(weight2));
            
            // Ensure weights sum to approximately 1.0
            const weight3 = Math.max(0.01, 1.0 - weight1 - weight2);
            const normalizedWeight1 = weight1 / (weight1 + weight2 + weight3);
            const normalizedWeight2 = weight2 / (weight1 + weight2 + weight3);
            const normalizedWeight3 = weight3 / (weight1 + weight2 + weight3);

            // Verify normalized weights are valid
            fc.pre(
              !isNaN(normalizedWeight1) && 
              !isNaN(normalizedWeight2) && 
              !isNaN(normalizedWeight3) &&
              isFinite(normalizedWeight1) &&
              isFinite(normalizedWeight2) &&
              isFinite(normalizedWeight3)
            );

            const customCriteria: ICPCriteria = {
              targetHeadcountMin: Math.min(minHeadcount, maxHeadcount),
              targetHeadcountMax: Math.max(minHeadcount, maxHeadcount),
              targetIndustries: ['Custom Industry'],
              decisionMakerTitles: ['Custom Title'],
            };

            const customWeights = {
              headcount: normalizedWeight1,
              industry: normalizedWeight2,
              jobTitle: normalizedWeight3,
            };

            const subscriber = createEnrichedSubscriber(
              email,
              headcount,
              industry,
              jobTitle,
              'Custom Corp'
            );

            const score = calculateICPScore(subscriber, customCriteria, customWeights);

            // Verify bounds are maintained
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
            expect(Number.isInteger(score)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
