# Webhook Handler Implementation

This module implements the data ingestion layer for webhook handling in the Liwanag MVP.

## Components

### 1. Signature Validation (`signature.ts`)
- **Function**: `validateWebhookSignature(payload, signature, secret)`
- **Purpose**: Validates webhook signatures using HMAC-SHA256
- **Security**: Uses timing-safe comparison to prevent timing attacks
- **Tests**: Property-based tests in `signature.test.ts` (Property 1)

### 2. Email Classification (`../email/classifier.ts`)
- **Function**: `classifyEmail(email)`
- **Purpose**: Classifies emails as 'personal' or 'corporate' based on domain
- **Supported Consumer Domains**: gmail.com, yahoo.com, outlook.com, hotmail.com, icloud.com, aol.com, protonmail.com, mail.com, zoho.com, yandex.com, gmx.com, live.com, msn.com, me.com, mac.com
- **Tests**: Property-based tests in `classifier.test.ts` (Property 3)

### 3. Payload Schema (`schema.ts`)
- **Schema**: `webhookPayloadSchema` (Zod)
- **Fields**: email (required), source (required), metadata (optional), timestamp (required)
- **Function**: `parseWebhookPayload(rawPayload)`
- **Purpose**: Validates and parses webhook payloads

### 4. Webhook Handler (`handler.ts`)
- **Function**: `processWebhook(rawPayload, signature, secret)`
- **Purpose**: Orchestrates the complete webhook processing flow
- **Steps**:
  1. Validate webhook signature
  2. Log webhook attempt
  3. Parse and validate payload
  4. Classify email type
  5. Upsert subscriber record
- **Function**: `upsertSubscriber(payload, emailType)`
- **Purpose**: Insert new subscriber or update existing one (idempotent)
- **Tests**: Property-based tests in `handler.test.ts` (Properties 2, 4, 5)

### 5. API Endpoint (`../../routes/api/webhooks/subscribe.ts`)
- **Route**: `POST /api/webhooks/subscribe`
- **Headers**: `X-Webhook-Signature` (required)
- **Success Response** (200):
  ```json
  {
    "subscriberId": "uuid",
    "status": "created" | "updated"
  }
  ```
- **Error Response** (401):
  ```json
  {
    "error": "error message",
    "code": "INVALID_SIGNATURE" | "MISSING_SIGNATURE",
    "timestamp": "ISO 8601 timestamp"
  }
  ```

## Requirements Validated

- **Requirement 1.1**: Webhook signature validation ✓
- **Requirement 1.2**: Reject invalid signatures with 401 ✓
- **Requirement 1.3**: Store raw payload in JSONB format ✓
- **Requirement 1.4**: Email classification ✓
- **Requirement 1.5**: Upsert logic for duplicate emails ✓
- **Requirement 1.6**: Return 200 with subscriber UUID ✓

## Correctness Properties

- **Property 1**: Webhook signature validation (HMAC-SHA256)
- **Property 2**: Raw payload persistence
- **Property 3**: Email classification correctness
- **Property 4**: Subscriber upsert idempotency
- **Property 5**: Successful webhook response format

## Testing

All property-based tests use fast-check with 100 iterations minimum.

### Running Tests

```bash
# Run all tests
npm test

# Run specific test files
npm test -- signature.test.ts
npm test -- classifier.test.ts
npm test -- handler.test.ts
```

### Database Tests

The handler tests require a PostgreSQL database. They are automatically skipped if no database is configured. To run them:

1. Set up a PostgreSQL database
2. Configure `DATABASE_URL` in `.env`
3. Run migrations: `npm run db:push`
4. Run tests: `npm test -- handler.test.ts`

## Usage Example

```typescript
import { processWebhook } from '@/lib/webhook/handler';
import { env } from '@/config/env';

// In API route handler
const signature = request.headers.get('X-Webhook-Signature');
const rawPayload = await request.text();

const result = await processWebhook(
  rawPayload,
  signature,
  env.NEWSLETTER_WEBHOOK_SECRET
);

if (result.success) {
  console.log('Subscriber ID:', result.subscriberId);
  console.log('Status:', result.status); // 'created' or 'updated'
} else {
  console.error('Error:', result.error);
}
```

## Security Considerations

1. **Timing-Safe Comparison**: Signature validation uses `timingSafeEqual` to prevent timing attacks
2. **Secret Management**: Webhook secrets are loaded from environment variables
3. **Audit Logging**: All webhook attempts are logged to `webhook_logs` table
4. **Input Validation**: All payloads are validated with Zod schemas before processing

## Next Steps

- Task 3: Implement file upload handler for bulk CSV/Excel imports
- Task 5: Implement FullEnrich API client for enrichment
- Task 6: Implement enrichment pipeline orchestration
