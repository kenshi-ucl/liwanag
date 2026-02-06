# Dashboard Module

This module provides dashboard analytics, metrics calculation, and lead filtering functionality for the Liwanag MVP.

## Components

### Metrics Calculation (`metrics.ts`)

Calculates dashboard metrics including:
- Total subscribers count
- Personal email count
- Enriched count
- Pending enrichment count
- Dark funnel percentage
- Credit usage statistics

**Requirements:** 7.1, 7.2, 7.3, 4.1

### Lead Filtering (`lead-filter.ts`)

Provides lead filtering and hidden gems query functionality:

#### `filterLeads(filter: LeadFilter): Promise<FilteredLeadsResult>`

Filters leads based on multiple criteria with AND logic:
- **minICPScore**: Filter by minimum ICP score (0-100)
- **companyName**: Case-insensitive partial match on company name
- **jobTitle**: Case-insensitive partial match on job title
- **syncStatus**: Filter by CRM sync status ('synced' | 'unsynced')

Returns filtered leads and total count.

**Requirements:** 8.1, 8.2, 8.3, 8.4, 8.5

#### `getHiddenGems(minScore?: number): Promise<Subscriber[]>`

Queries enriched subscribers with high ICP scores (default threshold: 70).

Returns subscribers that:
- Have been enriched (linkedinUrl is not null)
- Have ICP score strictly greater than the threshold

All enrichment fields are included in the response:
- linkedinUrl
- jobTitle
- companyName
- companyDomain
- headcount
- industry

**Requirements:** 7.4, 7.5

## API Endpoints

### GET /api/dashboard/metrics

Returns all dashboard metrics in a single response.

**Response:**
```json
{
  "totalSubscribers": 1000,
  "personalEmailCount": 600,
  "enrichedCount": 450,
  "pendingCount": 150,
  "darkFunnelPercentage": 75.00,
  "totalCreditsUsed": 1350,
  "estimatedPendingCredits": 450
}
```

### GET /api/leads

Returns filtered leads based on query parameters.

**Query Parameters:**
- `minICPScore` (optional): Minimum ICP score (0-100)
- `companyName` (optional): Company name search term
- `jobTitle` (optional): Job title search term
- `syncStatus` (optional): 'synced' or 'unsynced'

**Example:**
```
GET /api/leads?minICPScore=70&companyName=Acme&syncStatus=unsynced
```

**Response:**
```json
{
  "leads": [
    {
      "id": "uuid",
      "email": "john@gmail.com",
      "linkedinUrl": "https://linkedin.com/in/johndoe",
      "jobTitle": "VP of Engineering",
      "companyName": "Acme Corporation",
      "companyDomain": "acme.com",
      "headcount": 250,
      "industry": "SaaS",
      "icpScore": 85,
      "syncedToCRM": false,
      ...
    }
  ],
  "totalCount": 1
}
```

## Property-Based Tests

### Metrics Tests (`metrics.property.test.ts`)

- **Property 24**: Dark funnel percentage calculation
- **Property 25**: Dashboard metrics completeness

### Filtering Tests (`lead-filter.property.test.ts`)

- **Property 28**: ICP score filtering
- **Property 29**: Case-insensitive partial search
- **Property 30**: Filter combination with AND logic
- **Property 31**: Filtered result count accuracy

### Hidden Gems Tests (`hidden-gems.property.test.ts`)

- **Property 26**: Hidden gems filtering
- **Property 27**: Lead detail completeness

## Usage Examples

### Calculate Dashboard Metrics

```typescript
import { calculateDashboardMetrics } from '@/lib/dashboard/metrics';

const metrics = await calculateDashboardMetrics();
console.log(`Dark Funnel: ${metrics.darkFunnelPercentage}%`);
```

### Filter Leads

```typescript
import { filterLeads } from '@/lib/dashboard/lead-filter';

const result = await filterLeads({
  minICPScore: 70,
  companyName: 'tech',
  syncStatus: 'unsynced'
});

console.log(`Found ${result.totalCount} matching leads`);
```

### Get Hidden Gems

```typescript
import { getHiddenGems } from '@/lib/dashboard/lead-filter';

const hiddenGems = await getHiddenGems(80);
console.log(`Found ${hiddenGems.length} high-value leads`);
```
