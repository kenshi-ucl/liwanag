import { db } from '@/db';
import { enrichmentJobs, subscribers } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { FullEnrichClient } from '@/lib/fullenrich/client';
import { env } from '@/config/env';
import type { EnrichmentJob } from '@/db/schema';

export interface BatchProcessorConfig {
  maxBatchSize: number;
  webhookUrl: string;
}

export const defaultBatchConfig: BatchProcessorConfig = {
  maxBatchSize: 100,
  webhookUrl: env.FULLENRICH_WEBHOOK_URL,
};

/**
 * Query pending enrichment jobs from the database
 * Returns jobs that are in 'pending' status and don't have an enrichmentId yet
 */
export async function queryPendingJobs(limit: number = 100): Promise<EnrichmentJob[]> {
  const jobs = await db
    .select()
    .from(enrichmentJobs)
    .where(
      and(
        eq(enrichmentJobs.status, 'pending'),
        isNull(enrichmentJobs.enrichmentId)
      )
    )
    .limit(limit);

  return jobs;
}

/**
 * Batch pending jobs into groups of specified size
 * Ensures no batch exceeds the maximum size (default 100)
 */
export function batchJobs(
  jobs: EnrichmentJob[],
  maxBatchSize: number = 100
): EnrichmentJob[][] {
  if (maxBatchSize <= 0) {
    throw new Error('Batch size must be positive');
  }

  const batches: EnrichmentJob[][] = [];
  
  for (let i = 0; i < jobs.length; i += maxBatchSize) {
    const batch = jobs.slice(i, i + maxBatchSize);
    batches.push(batch);
  }

  return batches;
}

/**
 * Submit a batch of enrichment jobs to FullEnrich API
 * Returns the enrichment ID from the API response
 */
export async function submitBatchToFullEnrich(
  jobs: EnrichmentJob[],
  client: FullEnrichClient,
  webhookUrl: string
): Promise<string> {
  if (jobs.length === 0) {
    throw new Error('Cannot submit empty batch');
  }

  if (jobs.length > 100) {
    throw new Error('Batch size exceeds maximum of 100');
  }

  // Get subscriber records for the jobs
  const subscriberIds = jobs.map(job => job.subscriberId);
  
  const allSubscribers = await Promise.all(
    subscriberIds.map(async (id) => {
      const [subscriber] = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.id, id))
        .limit(1);
      return subscriber;
    })
  );

  // Build contact data array for FullEnrich Reverse Email Lookup API
  // This endpoint only needs email and custom fields (no enrich_fields needed)
  const contactData = allSubscribers
    .filter(s => s !== undefined)
    .map(s => {
      return {
        email: s.email,
        custom: {
          subscriber_id: s.id,
        },
      };
    });

  // Submit to FullEnrich Reverse Email Lookup API
  const response = await client.bulkEnrich({
    name: `Liwanag Reverse Lookup - ${new Date().toISOString()}`,
    webhook_url: webhookUrl,
    data: contactData,
  });

  return response.enrichment_id;
}

/**
 * Store enrichment ID in job records after successful API submission
 */
export async function storeEnrichmentId(
  jobIds: string[],
  enrichmentId: string
): Promise<void> {
  if (jobIds.length === 0) {
    return;
  }

  // Update all jobs in the batch with the enrichment ID
  for (const jobId of jobIds) {
    await db
      .update(enrichmentJobs)
      .set({
        enrichmentId,
        updatedAt: new Date(),
      })
      .where(eq(enrichmentJobs.id, jobId));
  }
}

/**
 * Process pending enrichment jobs in batches
 * Main entry point for batch processing workflow
 */
export async function processPendingJobs(
  config: BatchProcessorConfig = defaultBatchConfig
): Promise<{ processed: number; batches: number }> {
  const client = new FullEnrichClient();
  
  // Query pending jobs
  const pendingJobs = await queryPendingJobs(config.maxBatchSize * 10); // Get up to 10 batches worth
  
  if (pendingJobs.length === 0) {
    return { processed: 0, batches: 0 };
  }

  // Batch the jobs
  const batches = batchJobs(pendingJobs, config.maxBatchSize);
  
  let processedCount = 0;
  
  // Process each batch
  for (const batch of batches) {
    try {
      // Submit batch to FullEnrich
      const enrichmentId = await submitBatchToFullEnrich(
        batch,
        client,
        config.webhookUrl
      );
      
      // Store enrichment ID in all jobs
      const jobIds = batch.map(job => job.id);
      await storeEnrichmentId(jobIds, enrichmentId);
      
      processedCount += batch.length;
    } catch (error) {
      // Log error but continue processing other batches
      console.error('Failed to process batch:', error);
      
      // Mark jobs as failed
      for (const job of batch) {
        await db
          .update(enrichmentJobs)
          .set({
            status: 'failed',
            failureReason: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(enrichmentJobs.id, job.id));
      }
    }
  }

  return {
    processed: processedCount,
    batches: batches.length,
  };
}
