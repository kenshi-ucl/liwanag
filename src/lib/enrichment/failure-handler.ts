import { db } from '@/db';
import { enrichmentJobs } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import type { EnrichmentJob } from '@/db/schema';

export interface FailureHandlerConfig {
  maxRetries: number;
  staleThresholdHours: number;
}

export const defaultFailureConfig: FailureHandlerConfig = {
  maxRetries: 3,
  staleThresholdHours: 24,
};

/**
 * Mark an enrichment job as failed
 * Stores failure reason and timestamp
 */
export async function markJobAsFailed(
  jobId: string,
  failureReason: string
): Promise<void> {
  await db
    .update(enrichmentJobs)
    .set({
      status: 'failed',
      failureReason,
      updatedAt: new Date(),
      completedAt: new Date(),
    })
    .where(eq(enrichmentJobs.id, jobId));
}

/**
 * Increment retry count for a job
 * Returns the new retry count
 */
export async function incrementRetryCount(jobId: string): Promise<number> {
  const [job] = await db
    .select()
    .from(enrichmentJobs)
    .where(eq(enrichmentJobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const newRetryCount = (job.retryCount || 0) + 1;

  await db
    .update(enrichmentJobs)
    .set({
      retryCount: newRetryCount,
      updatedAt: new Date(),
    })
    .where(eq(enrichmentJobs.id, jobId));

  return newRetryCount;
}

/**
 * Check if a job has exceeded max retries
 * If so, mark it as failed
 */
export async function checkAndFailIfMaxRetriesExceeded(
  jobId: string,
  maxRetries: number = defaultFailureConfig.maxRetries
): Promise<boolean> {
  const [job] = await db
    .select()
    .from(enrichmentJobs)
    .where(eq(enrichmentJobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const retryCount = job.retryCount || 0;

  if (retryCount >= maxRetries) {
    await markJobAsFailed(
      jobId,
      `Maximum retry attempts (${maxRetries}) exceeded`
    );
    return true;
  }

  return false;
}

/**
 * Find and mark stale jobs
 * Jobs are considered stale if they've been pending for more than the threshold
 */
export async function markStaleJobs(
  thresholdHours: number = defaultFailureConfig.staleThresholdHours
): Promise<number> {
  const thresholdDate = new Date();
  thresholdDate.setHours(thresholdDate.getHours() - thresholdHours);

  // Find pending jobs older than threshold
  const staleJobs = await db
    .select()
    .from(enrichmentJobs)
    .where(
      and(
        eq(enrichmentJobs.status, 'pending'),
        lt(enrichmentJobs.createdAt, thresholdDate)
      )
    );

  // Mark each as stale
  for (const job of staleJobs) {
    await db
      .update(enrichmentJobs)
      .set({
        status: 'stale',
        failureReason: `Job pending for more than ${thresholdHours} hours`,
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(enrichmentJobs.id, job.id));
  }

  return staleJobs.length;
}

/**
 * Handle job failure with retry logic
 * Increments retry count and marks as failed if max retries exceeded
 */
export async function handleJobFailure(
  jobId: string,
  error: Error | string,
  config: FailureHandlerConfig = defaultFailureConfig
): Promise<{ shouldRetry: boolean; retryCount: number }> {
  const failureReason = error instanceof Error ? error.message : error;

  // Increment retry count
  const newRetryCount = await incrementRetryCount(jobId);

  // Check if max retries exceeded
  if (newRetryCount >= config.maxRetries) {
    await markJobAsFailed(jobId, failureReason);
    return {
      shouldRetry: false,
      retryCount: newRetryCount,
    };
  }

  return {
    shouldRetry: true,
    retryCount: newRetryCount,
  };
}

/**
 * Get failure statistics for monitoring
 */
export async function getFailureStats(): Promise<{
  totalFailed: number;
  totalStale: number;
  failureReasons: Record<string, number>;
}> {
  const failedJobs = await db
    .select()
    .from(enrichmentJobs)
    .where(eq(enrichmentJobs.status, 'failed'));

  const staleJobs = await db
    .select()
    .from(enrichmentJobs)
    .where(eq(enrichmentJobs.status, 'stale'));

  // Count failure reasons
  const failureReasons: Record<string, number> = {};
  
  for (const job of failedJobs) {
    const reason = job.failureReason || 'Unknown';
    failureReasons[reason] = (failureReasons[reason] || 0) + 1;
  }

  return {
    totalFailed: failedJobs.length,
    totalStale: staleJobs.length,
    failureReasons,
  };
}

/**
 * Retry a failed job
 * Resets status to pending and clears failure reason
 */
export async function retryFailedJob(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(enrichmentJobs)
    .where(eq(enrichmentJobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (job.status !== 'failed' && job.status !== 'stale') {
    throw new Error(`Job is not in failed or stale status: ${job.status}`);
  }

  await db
    .update(enrichmentJobs)
    .set({
      status: 'pending',
      failureReason: null,
      enrichmentId: null,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(enrichmentJobs.id, jobId));
}
