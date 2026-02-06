# Workflow Orchestration Module

This module implements a Rilo-style workflow orchestration system for managing asynchronous enrichment processes in the Liwanag MVP.

## Overview

The workflow system orchestrates the complete enrichment pipeline:

1. **Batch Pending Jobs** - Query and batch pending enrichment jobs
2. **Submit to FullEnrich** - Submit batches to the FullEnrich API
3. **Wait for Webhook** - Pause workflow until enrichment results arrive
4. **Process Results** - Update subscriber records with enriched data

## Architecture

### Components

- **`types.ts`** - TypeScript type definitions for workflows
- **`engine.ts`** - Core workflow execution engine
- **`enrichment-workflow.ts`** - Enrichment workflow definition
- **`triggers.ts`** - Workflow trigger functions
- **`workflow-tracker.ts`** - Maps enrichment IDs to workflow IDs

### Workflow Lifecycle

```
Subscriber Created (Personal Email)
    ↓
Trigger Enrichment Workflow
    ↓
Batch Pending Jobs (max 100)
    ↓
Submit to FullEnrich API
    ↓
Register Workflow ID ← Store mapping
    ↓
Wait for Webhook (24h timeout)
    ↓
FullEnrich Webhook Received
    ↓
Emit "enrichment-complete" Event
    ↓
Resume Workflow
    ↓
Process Enrichment Results
    ↓
Update Subscriber Records
    ↓
Unregister Workflow ID
    ↓
Workflow Complete
```

## Usage

### Triggering Workflows

#### Automatic Trigger on Subscriber Creation

Workflows are automatically triggered when a personal email subscriber is created:

```typescript
import { triggerEnrichmentForSubscriber } from '@/lib/workflow/triggers';

// After creating a subscriber
const subscriber = await createSubscriber(email);

// Trigger enrichment workflow for personal emails
if (subscriber.emailType === 'personal') {
  const workflowId = await triggerEnrichmentForSubscriber(subscriber);
  console.log(`Workflow ${workflowId} started`);
}
```

#### Manual Batch Processing

Trigger batch processing manually (e.g., from a cron job):

```typescript
import { triggerScheduledEnrichmentBatch } from '@/lib/workflow/triggers';

// Trigger scheduled batch processing
const workflowId = await triggerScheduledEnrichmentBatch();
console.log(`Batch workflow ${workflowId} started`);
```

### Emitting Events

When enrichment results arrive via webhook, emit an event to resume the workflow:

```typescript
import { emitWorkflowEvent } from '@/lib/workflow/engine';
import { getWorkflowIdForEnrichment } from '@/lib/workflow/workflow-tracker';

// Get workflow ID for this enrichment
const workflowId = getWorkflowIdForEnrichment(enrichmentId);

if (workflowId) {
  // Emit event to resume workflow
  emitWorkflowEvent(workflowId, 'enrichment-complete', {
    results: enrichmentResults,
  });
}
```

## Workflow Configuration

### Retry Policies

Each workflow step can have a retry policy:

```typescript
{
  name: 'submit-to-fullenrich',
  action: async (context) => { /* ... */ },
  retry: {
    maxAttempts: 5,
    backoff: 'exponential',
    initialDelay: 1000,      // 1 second
    maxDelay: 60000,         // 1 minute
    retryOn: [429, 500, 502, 503, 504],  // HTTP status codes
  },
}
```

**Backoff Strategies:**
- `exponential` - Delay doubles each attempt (1s, 2s, 4s, 8s, ...)
- `linear` - Delay increases linearly (1s, 2s, 3s, 4s, ...)
- `constant` - Same delay for all attempts

### Timeouts

Steps can have timeouts to prevent indefinite waiting:

```typescript
{
  name: 'wait-for-webhook',
  action: createWaitForEventAction('enrichment-complete', 24 * 60 * 60 * 1000),
  timeout: '24h',  // Supports: '24h', '1h', '30m', '60s'
}
```

### Error Handling

Workflow-level error handler:

```typescript
export const enrichmentWorkflow = defineWorkflow({
  name: 'subscriber-enrichment',
  steps: [ /* ... */ ],
  
  onError: async (context, error) => {
    console.error(`Workflow ${context.workflowId} failed:`, error);
    
    // Mark jobs as failed
    const jobs = context.steps['batch-pending-jobs']?.jobs;
    if (jobs) {
      for (const job of jobs) {
        await markJobAsFailed(job.id, error.message);
      }
    }
  },
});
```

## Integration Points

### Webhook Handler

The webhook handler triggers workflows when subscribers are created:

```typescript
// In webhook handler
const result = await upsertSubscriber(payload, emailType);

if (result.status === 'created' && emailType === 'personal') {
  await triggerEnrichmentForSubscriber(result);
}
```

### Bulk Upload Processor

The bulk processor triggers workflows for each new personal email:

```typescript
// In bulk processor
const [newSubscriber] = await db.insert(subscribers).values({
  email,
  emailType,
  source,
  rawPayload,
}).returning();

if (emailType === 'personal') {
  await triggerEnrichmentForSubscriber(newSubscriber);
}
```

### Enrichment Webhook Receiver

The webhook receiver emits events to resume workflows:

```typescript
// In webhook receiver
const workflowId = getWorkflowIdForEnrichment(payload.enrichmentId);

if (workflowId) {
  emitWorkflowEvent(workflowId, 'enrichment-complete', {
    results: payload.results,
  });
}
```

## Requirements Validated

This workflow integration validates the following requirements:

- **14.1** - Workflow triggered when personal email subscriber is created
- **14.2** - Pending enrichment requests are batched
- **14.3** - Workflow waits for webhook callback
- **14.4** - Webhook callback resumes workflow
- **14.5** - Workflow steps have retry policies
- **14.6** - Workflow has timeout for webhook wait (24 hours)

## Testing

Run workflow tests:

```bash
npm test -- enrichment-workflow.test.ts
```

The test suite validates:
- Workflow definition structure
- Retry policy configuration
- Timeout configuration
- Trigger behavior for personal vs corporate emails
- Workflow tracker registration/unregistration

## Future Enhancements

- **Persistent Storage** - Store workflow state in database instead of memory
- **Workflow Monitoring** - Add metrics and observability
- **Workflow Cancellation** - Support cancelling in-progress workflows
- **Workflow History** - Track workflow execution history
- **Multiple Event Types** - Support waiting for multiple event types
- **Conditional Steps** - Add support for conditional step execution
