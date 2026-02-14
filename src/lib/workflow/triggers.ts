/**
 * Workflow triggers
 * Handles automatic workflow triggering based on application events
 */

import { enrichmentWorkflow, type EnrichmentWorkflowInput } from './enrichment-workflow';
import type { Subscriber } from '@/db/schema';

/**
 * Trigger enrichment workflow when a subscriber is created
 * 
 * This function should be called after a subscriber is created or updated
 * to automatically start the enrichment process for all emails.
 * 
 * @param subscriber - The subscriber record
 * @param organizationId - The organization ID for multi-tenant support
 * @returns Workflow ID if triggered, null if not applicable
 */
export async function triggerEnrichmentForSubscriber(
  subscriber: Subscriber,
  organizationId: string
): Promise<string | null> {
  // Import job creator here to avoid circular dependency
  const { createEnrichmentJob } = await import('@/lib/enrichment/job-creator');
  
  // Determine email type for credit estimation
  const emailType = subscriber.emailType === 'personal' ? 'personal' : 'corporate';
  
  // Create enrichment job for all email types
  await createEnrichmentJob(subscriber.id, organizationId, emailType);

  // Trigger the enrichment workflow
  const input: EnrichmentWorkflowInput = {
    subscriberId: subscriber.id,
    email: subscriber.email,
    organizationId,
    triggerType: 'subscriber-created',
  };

  const result = await enrichmentWorkflow.trigger(input);
  
  return result.workflowId;
}

/**
 * Trigger enrichment workflow for scheduled batch processing
 * 
 * This function can be called by a cron job or scheduler to process
 * pending enrichment jobs in batches.
 * 
 * @returns Workflow ID
 */
export async function triggerScheduledEnrichmentBatch(): Promise<string> {
  const input: EnrichmentWorkflowInput = {
    triggerType: 'scheduled-batch',
  };

  const result = await enrichmentWorkflow.trigger(input);
  
  return result.workflowId;
}
