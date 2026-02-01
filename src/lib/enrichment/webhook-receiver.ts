import { db } from '@/db';
import { enrichmentJobs, subscribers, webhookLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateWebhookSignature } from '@/lib/webhook/signature';
import { enrichmentWebhookCallbackSchema, type EnrichmentWebhookCallback, type EnrichmentResult } from '@/lib/fullenrich/schemas';
import { env } from '@/config/env';
import { emitWorkflowEvent } from '@/lib/workflow/engine';
import { getWorkflowIdForEnrichment } from '@/lib/workflow/workflow-tracker';
import { calculateICPScore } from '@/lib/icp/scorer';

/**
 * Result of enrichment webhook processing
 */
export interface EnrichmentWebhookResult {
  success: boolean;
  processed: number;
  error?: string;
}

/**
 * Process enrichment webhook callback from FullEnrich API
 * 
 * @param rawPayload - The raw webhook payload string
 * @param signature - The webhook signature from headers
 * @returns Processing result with count of processed enrichments
 */
export async function processEnrichmentWebhook(
  rawPayload: string,
  signature: string
): Promise<EnrichmentWebhookResult> {
  try {
    // Step 1: Validate webhook signature
    const validationResult = validateWebhookSignature(
      rawPayload,
      signature,
      env.FULLENRICH_WEBHOOK_SECRET
    );

    // Log webhook attempt
    await db.insert(webhookLogs).values({
      source: 'fullenrich',
      payload: JSON.parse(rawPayload),
      signature,
      isValid: validationResult.isValid,
    });

    if (!validationResult.isValid) {
      return {
        success: false,
        processed: 0,
        error: validationResult.error || 'Invalid signature',
      };
    }

    // Step 2: Parse and validate payload
    const payload: EnrichmentWebhookCallback = parseEnrichmentWebhook(rawPayload);

    // Step 3: Process each enrichment result
    let processedCount = 0;
    
    for (const result of payload.results) {
      try {
        await processEnrichmentResult(payload.enrichmentId, result);
        processedCount++;
      } catch (error) {
        console.error('Failed to process enrichment result:', error);
        // Continue processing other results
      }
    }

    // Step 4: Emit workflow event to resume waiting workflows
    try {
      // Get the workflow ID associated with this enrichment
      const workflowId = getWorkflowIdForEnrichment(payload.enrichmentId);
      
      if (workflowId) {
        emitWorkflowEvent(
          workflowId,
          'enrichment-complete',
          { results: payload.results }
        );
      } else {
        console.warn(`No workflow found for enrichment ID: ${payload.enrichmentId}`);
      }
    } catch (error) {
      console.error('Failed to emit workflow event:', error);
      // Don't fail the webhook processing if event emission fails
    }

    return {
      success: true,
      processed: processedCount,
    };
  } catch (error) {
    return {
      success: false,
      processed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse and validate enrichment webhook payload
 */
export function parseEnrichmentWebhook(rawPayload: string): EnrichmentWebhookCallback {
  const parsed = JSON.parse(rawPayload);
  return enrichmentWebhookCallbackSchema.parse(parsed);
}

/**
 * Process a single enrichment result
 * Updates subscriber record with enriched data and marks job as complete
 */
export async function processEnrichmentResult(
  enrichmentId: string,
  result: EnrichmentResult
): Promise<void> {
  // Find the subscriber by email
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, result.email))
    .limit(1);

  if (!subscriber) {
    throw new Error(`Subscriber not found for email: ${result.email}`);
  }

  // Update subscriber with enriched data
  await updateSubscriberWithEnrichment(subscriber.id, result);

  // Update enrichment job status
  await updateEnrichmentJobStatus(enrichmentId, subscriber.id, result.creditsUsed);
}

/**
 * Update subscriber record with enriched data
 */
export async function updateSubscriberWithEnrichment(
  subscriberId: string,
  result: EnrichmentResult
): Promise<void> {
  // First, update subscriber with enriched data
  await db
    .update(subscribers)
    .set({
      linkedinUrl: result.linkedinUrl || null,
      jobTitle: result.jobTitle || null,
      companyName: result.companyName || null,
      companyDomain: result.companyDomain || null,
      headcount: result.headcount || null,
      industry: result.industry || null,
      updatedAt: new Date(),
    })
    .where(eq(subscribers.id, subscriberId));

  // Fetch the updated subscriber to calculate ICP score
  const [updatedSubscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, subscriberId))
    .limit(1);

  if (updatedSubscriber) {
    // Calculate ICP score based on enriched data
    const icpScore = calculateICPScore(updatedSubscriber);

    // Update subscriber with ICP score
    await db
      .update(subscribers)
      .set({
        icpScore,
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, subscriberId));
  }
}

/**
 * Update enrichment job status to "enriched"
 */
export async function updateEnrichmentJobStatus(
  enrichmentId: string,
  subscriberId: string,
  creditsUsed: number
): Promise<void> {
  // Find the job by enrichmentId and subscriberId
  const [job] = await db
    .select()
    .from(enrichmentJobs)
    .where(
      eq(enrichmentJobs.enrichmentId, enrichmentId)
    )
    .limit(1);

  if (!job) {
    // If we can't find by enrichmentId, try by subscriberId
    const [jobBySubscriber] = await db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.subscriberId, subscriberId))
      .limit(1);

    if (jobBySubscriber) {
      await db
        .update(enrichmentJobs)
        .set({
          status: 'enriched',
          actualCredits: creditsUsed,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(enrichmentJobs.id, jobBySubscriber.id));
    }
    return;
  }

  // Update the job
  await db
    .update(enrichmentJobs)
    .set({
      status: 'enriched',
      actualCredits: creditsUsed,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(enrichmentJobs.id, job.id));
}
