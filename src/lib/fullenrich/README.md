# FullEnrich API Client

This module provides a TypeScript client for interacting with the FullEnrich API, which enriches personal email addresses with corporate identity data.

## Features

- **Zod Schema Validation**: All requests and responses are validated using Zod schemas
- **Automatic Retry Logic**: Implements exponential backoff for retryable errors
- **Rate Limiting**: Respects `Retry-After` headers from 429 responses
- **Credit Exhaustion Handling**: Detects 402 errors and halts enrichment
- **Network Error Handling**: Retries network errors up to 3 times
- **Type Safety**: Full TypeScript support with inferred types

## Usage

```typescript
import { FullEnrichClient } from './lib/fullenrich';

// Create client instance
const client = new FullEnrichClient();

// Submit bulk enrichment request
const response = await client.bulkEnrich({
  emails: ['user@gmail.com', 'contact@yahoo.com'],
  webhookUrl: 'https://your-app.com/api/webhooks/enrichment',
});

console.log(response.enrichmentId); // Track enrichment job
console.log(response.estimatedCredits); // Estimated credit cost
```

## Error Handling

The client throws `FullEnrichAPIError` for all API errors:

```typescript
try {
  await client.bulkEnrich({ emails, webhookUrl });
} catch (error) {
  if (error instanceof FullEnrichAPIError) {
    if (error.statusCode === 402) {
      // Credit exhaustion - halt pending jobs
      console.error('Insufficient credits');
    } else if (error.statusCode === 429) {
      // Rate limit - will auto-retry
      console.warn('Rate limited');
    }
  }
}
```

## Retry Configuration

Customize retry behavior:

```typescript
const client = new FullEnrichClient('api-key', 'https://api.fullenrich.com/v1', {
  maxAttempts: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 60000, // 1 minute
  multiplier: 2, // Exponential backoff
  retryableStatusCodes: [429, 500, 502, 503, 504],
});
```

## Schemas

All schemas are exported for reuse:

```typescript
import {
  bulkEnrichmentRequestSchema,
  bulkEnrichmentResponseSchema,
  enrichmentResultSchema,
  enrichmentWebhookCallbackSchema,
} from './lib/fullenrich/schemas';
```

## Requirements Validated

- **Requirement 10.1**: API response schema validation
- **Requirement 10.4**: Zod schemas for all endpoints
- **Requirement 3.5**: Retry logic with exponential backoff
- **Requirement 12.1**: Handle 429 rate limit with Retry-After
- **Requirement 12.2**: Exponential backoff timing
- **Requirement 12.5**: Retry network errors up to 3 times
- **Requirement 3.6**: Detect 402 credit exhaustion
- **Requirement 12.4**: Halt pending jobs on credit exhaustion
