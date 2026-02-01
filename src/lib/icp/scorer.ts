import type { Subscriber } from '@/db/schema';

/**
 * ICP (Ideal Customer Profile) scoring criteria configuration
 */
export interface ICPCriteria {
  targetHeadcountMin: number;
  targetHeadcountMax: number;
  targetIndustries: string[];
  decisionMakerTitles: string[];
}

/**
 * Weights for different scoring components
 */
export interface ScoringWeights {
  headcount: number;
  industry: number;
  jobTitle: number;
}

/**
 * Default ICP criteria based on requirements
 */
export const DEFAULT_ICP_CRITERIA: ICPCriteria = {
  targetHeadcountMin: 50,
  targetHeadcountMax: 500,
  targetIndustries: ['SaaS', 'Technology', 'Financial Services'],
  decisionMakerTitles: ['VP', 'Director', 'Head of', 'Chief'],
};

/**
 * Default scoring weights (must sum to 1.0)
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  headcount: 0.4,
  industry: 0.3,
  jobTitle: 0.3,
};

/**
 * Calculate ICP score for a subscriber based on enriched data
 * 
 * @param subscriber - The subscriber with enriched data
 * @param criteria - ICP criteria configuration (optional, uses defaults if not provided)
 * @param weights - Scoring weights (optional, uses defaults if not provided)
 * @returns ICP score as integer between 0-100
 */
export function calculateICPScore(
  subscriber: Subscriber,
  criteria: ICPCriteria = DEFAULT_ICP_CRITERIA,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  // If subscriber lacks enrichment data, return 0
  if (!hasEnrichmentData(subscriber)) {
    return 0;
  }

  // Calculate individual component scores (0-100 each)
  const headcountScore = scoreHeadcount(subscriber.headcount, criteria);
  const industryScore = scoreIndustry(subscriber.industry, criteria);
  const jobTitleScore = scoreJobTitle(subscriber.jobTitle, criteria);

  // Combine scores with weights
  const weightedScore =
    headcountScore * weights.headcount +
    industryScore * weights.industry +
    jobTitleScore * weights.jobTitle;

  // Ensure result is integer between 0-100
  return Math.round(Math.max(0, Math.min(100, weightedScore)));
}

/**
 * Check if subscriber has enrichment data needed for scoring
 */
function hasEnrichmentData(subscriber: Subscriber): boolean {
  return !!(
    subscriber.companyName ||
    subscriber.headcount ||
    subscriber.industry ||
    subscriber.jobTitle
  );
}

/**
 * Score headcount component
 * Higher scores for companies in target range (50-500 employees)
 * 
 * @param headcount - Company headcount
 * @param criteria - ICP criteria
 * @returns Score between 0-100
 */
export function scoreHeadcount(
  headcount: number | null | undefined,
  criteria: ICPCriteria
): number {
  if (!headcount || headcount <= 0) {
    return 0;
  }

  const { targetHeadcountMin, targetHeadcountMax } = criteria;

  // Perfect score for companies in target range
  if (headcount >= targetHeadcountMin && headcount <= targetHeadcountMax) {
    return 100;
  }

  // Partial score for companies close to target range
  if (headcount < targetHeadcountMin) {
    // Score decreases as headcount gets smaller
    // 25-49: 70 points, 10-24: 40 points, 1-9: 10 points
    if (headcount >= 25) {
      return 70;
    } else if (headcount >= 10) {
      return 40;
    } else {
      return 10;
    }
  } else {
    // headcount > targetHeadcountMax
    // Score decreases as headcount gets larger
    // 501-1000: 70 points, 1001-5000: 40 points, >5000: 10 points
    if (headcount <= 1000) {
      return 70;
    } else if (headcount <= 5000) {
      return 40;
    } else {
      return 10;
    }
  }
}

/**
 * Score industry component
 * Higher scores for target industries (SaaS, Technology, Financial Services)
 * 
 * @param industry - Company industry
 * @param criteria - ICP criteria
 * @returns Score between 0-100
 */
export function scoreIndustry(
  industry: string | null | undefined,
  criteria: ICPCriteria
): number {
  if (!industry) {
    return 0;
  }

  const normalizedIndustry = industry.trim().toLowerCase();
  const targetIndustries = criteria.targetIndustries.map(i => i.toLowerCase());

  // Check for exact or partial match with target industries
  for (const targetIndustry of targetIndustries) {
    if (
      normalizedIndustry === targetIndustry.toLowerCase() ||
      normalizedIndustry.includes(targetIndustry.toLowerCase()) ||
      targetIndustry.toLowerCase().includes(normalizedIndustry)
    ) {
      return 100;
    }
  }

  // Partial score for related industries
  const relatedIndustries = [
    'software',
    'tech',
    'it',
    'information technology',
    'finance',
    'banking',
    'fintech',
    'b2b',
    'enterprise',
  ];

  for (const related of relatedIndustries) {
    if (normalizedIndustry.includes(related) || related.includes(normalizedIndustry)) {
      return 50;
    }
  }

  // Some score for having any industry data
  return 20;
}

/**
 * Score job title component
 * Higher scores for decision-maker titles (VP, Director, Head of, Chief)
 * 
 * @param jobTitle - Job title
 * @param criteria - ICP criteria
 * @returns Score between 0-100
 */
export function scoreJobTitle(
  jobTitle: string | null | undefined,
  criteria: ICPCriteria
): number {
  if (!jobTitle) {
    return 0;
  }

  const normalizedTitle = jobTitle.trim().toLowerCase();

  // Check for decision-maker titles
  for (const decisionMakerTitle of criteria.decisionMakerTitles) {
    const normalizedDecisionMaker = decisionMakerTitle.toLowerCase();
    
    if (normalizedTitle.includes(normalizedDecisionMaker)) {
      // C-level gets highest score
      if (normalizedDecisionMaker.includes('chief') || normalizedTitle.startsWith('c')) {
        return 100;
      }
      // VP gets high score
      if (normalizedDecisionMaker.includes('vp') || normalizedTitle.includes('vice president')) {
        return 90;
      }
      // Director and Head of get good score
      if (normalizedDecisionMaker.includes('director') || normalizedDecisionMaker.includes('head of')) {
        return 80;
      }
      // Other decision-maker titles
      return 70;
    }
  }

  // Partial score for manager-level titles
  if (
    normalizedTitle.includes('manager') ||
    normalizedTitle.includes('lead') ||
    normalizedTitle.includes('senior')
  ) {
    return 40;
  }

  // Some score for having any job title data
  return 10;
}
