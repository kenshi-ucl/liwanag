# ICP Scoring Module

This module implements the Ideal Customer Profile (ICP) scoring engine for Liwanag MVP. It calculates scores (0-100) for enriched subscribers based on company data to help identify high-value leads.

## Overview

The ICP scoring engine evaluates subscribers based on three key criteria:
- **Headcount**: Company size (target: 50-500 employees)
- **Industry**: Business sector (target: SaaS, Technology, Financial Services)
- **Job Title**: Decision-maker level (target: VP, Director, Head of, Chief)

## Usage

### Basic Usage

```typescript
import { calculateICPScore } from '@/lib/icp/scorer';
import type { Subscriber } from '@/db/schema';

// After enrichment, calculate ICP score
const subscriber: Subscriber = {
  // ... subscriber data
  headcount: 250,
  industry: 'SaaS',
  jobTitle: 'VP of Engineering',
  companyName: 'Acme Corp',
  // ...
};

const score = calculateICPScore(subscriber);
// Returns: 100 (perfect match)
```

### Custom Criteria

```typescript
import { calculateICPScore, type ICPCriteria, type ScoringWeights } from '@/lib/icp/scorer';

const customCriteria: ICPCriteria = {
  targetHeadcountMin: 100,
  targetHeadcountMax: 1000,
  targetIndustries: ['FinTech', 'Enterprise Software'],
  decisionMakerTitles: ['C-Level', 'VP', 'SVP'],
};

const customWeights: ScoringWeights = {
  headcount: 0.5,  // 50% weight
  industry: 0.3,   // 30% weight
  jobTitle: 0.2,   // 20% weight
};

const score = calculateICPScore(subscriber, customCriteria, customWeights);
```

## Scoring Algorithm

### Component Scores (0-100 each)

#### Headcount Score
- **100 points**: 50-500 employees (target range)
- **70 points**: 25-49 or 501-1000 employees
- **40 points**: 10-24 or 1001-5000 employees
- **10 points**: 1-9 or >5000 employees
- **0 points**: No headcount data

#### Industry Score
- **100 points**: Exact match with target industries
- **50 points**: Related industries (software, tech, fintech, etc.)
- **20 points**: Any industry data
- **0 points**: No industry data

#### Job Title Score
- **100 points**: C-level (Chief, CXO)
- **90 points**: VP level
- **80 points**: Director or Head of
- **70 points**: Other decision-maker titles
- **40 points**: Manager, Lead, Senior
- **10 points**: Any job title data
- **0 points**: No job title data

### Final Score Calculation

The final ICP score is a weighted combination of component scores:

```
ICP Score = (Headcount Score × 0.4) + (Industry Score × 0.3) + (Job Title Score × 0.3)
```

The result is rounded to the nearest integer and clamped to 0-100 range.

## Integration with Enrichment Pipeline

The ICP scoring is automatically triggered when enrichment data is received:

```typescript
// In webhook-receiver.ts
import { calculateICPScore } from '@/lib/icp/scorer';

async function updateSubscriberWithEnrichment(
  subscriberId: string,
  result: EnrichmentResult
): Promise<void> {
  // Update subscriber with enriched data
  await db.update(subscribers).set({
    linkedinUrl: result.linkedinUrl,
    jobTitle: result.jobTitle,
    companyName: result.companyName,
    headcount: result.headcount,
    industry: result.industry,
  });

  // Calculate and store ICP score
  const updatedSubscriber = await db.select().from(subscribers).where(...);
  const icpScore = calculateICPScore(updatedSubscriber);
  
  await db.update(subscribers).set({ icpScore });
}
```

## Hidden Gems

Subscribers with ICP scores > 70 are considered "Hidden Gems" - high-value leads that warrant immediate attention from sales teams.

```typescript
// Query hidden gems
const hiddenGems = await db
  .select()
  .from(subscribers)
  .where(gt(subscribers.icpScore, 70))
  .orderBy(desc(subscribers.icpScore));
```

## Testing

The module includes comprehensive test coverage:

### Unit Tests (`integration.test.ts`)
- Basic scoring functionality
- Edge cases and boundary conditions
- Integration with enrichment data

### Property-Based Tests (`scorer.property.test.ts`)
- **Property 21**: ICP score calculation triggers
- **Property 22**: ICP scoring criteria correctness
- **Property 23**: ICP score bounds (0-100)

Run tests:
```bash
npm test -- src/lib/icp --run
```

## Requirements Validation

This module validates the following requirements:
- **6.1**: ICP score calculation on enrichment
- **6.2**: Headcount scoring (50-500 employees)
- **6.3**: Industry scoring (SaaS, Technology, Financial Services)
- **6.4**: Job title scoring (VP, Director, Head of, Chief)
- **6.6**: Score bounds (0-100 integer)

## API Reference

### `calculateICPScore(subscriber, criteria?, weights?)`

Calculates ICP score for a subscriber.

**Parameters:**
- `subscriber: Subscriber` - Subscriber with enrichment data
- `criteria?: ICPCriteria` - Optional custom criteria (uses defaults if not provided)
- `weights?: ScoringWeights` - Optional custom weights (uses defaults if not provided)

**Returns:** `number` - Integer score between 0-100

### `scoreHeadcount(headcount, criteria)`

Scores the headcount component.

**Parameters:**
- `headcount: number | null | undefined` - Company headcount
- `criteria: ICPCriteria` - ICP criteria

**Returns:** `number` - Score between 0-100

### `scoreIndustry(industry, criteria)`

Scores the industry component.

**Parameters:**
- `industry: string | null | undefined` - Company industry
- `criteria: ICPCriteria` - ICP criteria

**Returns:** `number` - Score between 0-100

### `scoreJobTitle(jobTitle, criteria)`

Scores the job title component.

**Parameters:**
- `jobTitle: string | null | undefined` - Job title
- `criteria: ICPCriteria` - ICP criteria

**Returns:** `number` - Score between 0-100

## Default Configuration

```typescript
export const DEFAULT_ICP_CRITERIA: ICPCriteria = {
  targetHeadcountMin: 50,
  targetHeadcountMax: 500,
  targetIndustries: ['SaaS', 'Technology', 'Financial Services'],
  decisionMakerTitles: ['VP', 'Director', 'Head of', 'Chief'],
};

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  headcount: 0.4,  // 40%
  industry: 0.3,   // 30%
  jobTitle: 0.3,   // 30%
};
```

## Notes

- Scoring is case-insensitive for industry and job title matching
- Partial matches are supported (e.g., "saas" matches "SaaS")
- Subscribers without enrichment data receive a score of 0
- Scores are calculated server-side to prevent manipulation
- All scores are integers for database storage compatibility
