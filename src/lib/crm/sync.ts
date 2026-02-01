import { db } from '@/db';
import { subscribers } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Result of a CRM sync operation
 */
export interface SyncResult {
  synced: number;
  alreadySynced: number;
  notFound: number;
}

/**
 * Sync a single subscriber to CRM
 * 
 * @param subscriberId - UUID of the subscriber to sync
 * @returns true if synced, false if already synced or not found
 */
export async function syncSubscriberToCRM(subscriberId: string): Promise<boolean> {
  const now = new Date();
  
  // Check if subscriber exists and is not already synced
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, subscriberId))
    .limit(1);
  
  if (!subscriber) {
    return false;
  }
  
  // Prevent duplicate sync (idempotency)
  if (subscriber.syncedToCRM) {
    return false;
  }
  
  // Mark subscriber as synced with timestamp
  await db
    .update(subscribers)
    .set({
      syncedToCRM: true,
      syncedAt: now,
      updatedAt: now,
    })
    .where(eq(subscribers.id, subscriberId));
  
  return true;
}

/**
 * Sync multiple subscribers to CRM in bulk
 * 
 * @param subscriberIds - Array of subscriber UUIDs to sync
 * @returns SyncResult with counts of synced, already synced, and not found
 */
export async function bulkSyncToCRM(subscriberIds: string[]): Promise<SyncResult> {
  if (subscriberIds.length === 0) {
    return { synced: 0, alreadySynced: 0, notFound: 0 };
  }
  
  const now = new Date();
  
  // Fetch all subscribers by IDs
  const existingSubscribers = await db
    .select()
    .from(subscribers)
    .where(inArray(subscribers.id, subscriberIds));
  
  // Separate into already synced and not synced
  const alreadySynced = existingSubscribers.filter(s => s.syncedToCRM);
  const toSync = existingSubscribers.filter(s => !s.syncedToCRM);
  const notFound = subscriberIds.length - existingSubscribers.length;
  
  // Bulk update subscribers that need syncing
  if (toSync.length > 0) {
    const idsToSync = toSync.map(s => s.id);
    await db
      .update(subscribers)
      .set({
        syncedToCRM: true,
        syncedAt: now,
        updatedAt: now,
      })
      .where(inArray(subscribers.id, idsToSync));
  }
  
  return {
    synced: toSync.length,
    alreadySynced: alreadySynced.length,
    notFound,
  };
}
