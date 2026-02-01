# CRM Synchronization Module

This module handles synchronization of enriched leads to CRM systems.

## Features

- **Single Sync**: Mark individual subscribers as synced to CRM
- **Bulk Sync**: Sync multiple subscribers in a single operation
- **Idempotency**: Prevents duplicate sync actions for already-synced subscribers
- **Timestamp Tracking**: Records when each subscriber was synced

## Usage

### Single Subscriber Sync

```typescript
import { syncSubscriberToCRM } from '@/lib/crm/sync';

const synced = await syncSubscriberToCRM(subscriberId);
if (synced) {
  console.log('Subscriber synced successfully');
} else {
  console.log('Subscriber already synced or not found');
}
```

### Bulk Sync

```typescript
import { bulkSyncToCRM } from '@/lib/crm/sync';

const result = await bulkSyncToCRM([id1, id2, id3]);
console.log(`Synced: ${result.synced}`);
console.log(`Already synced: ${result.alreadySynced}`);
console.log(`Not found: ${result.notFound}`);
```

## Properties

This module validates the following correctness properties:

- **Property 32**: Sync status persistence - synced subscribers have `syncedToCRM=true` and valid `syncedAt` timestamp
- **Property 33**: Sync idempotency - attempting to sync already-synced subscribers is prevented
- **Property 34**: Bulk sync operations - multiple subscribers can be synced with accurate counts

## Database Schema

The sync operations update the following fields in the `subscribers` table:

- `syncedToCRM`: Boolean flag indicating sync status
- `syncedAt`: Timestamp when the subscriber was synced
- `updatedAt`: Timestamp of the last update
