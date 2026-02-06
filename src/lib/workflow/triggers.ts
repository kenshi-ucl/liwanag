/**
 * Workflow triggers
 * Handles automatic workflow triggering based on application events
 */

import { enrichmentWorkflow, type EnrichmentWorkflowInput } from './enrichment-workflow';
import type { Subscriber } from '@/db/schema';

/**
 * Trigger enrichment workflow when a personal email subscriber is created
 * 
 * This function should be called after a subscriber is created or updated
 * to automatically start the enrichment process for personal emails.
 * 
 * @param subscriber - The subscriber record
 * @param organizationId - The organization ID for multi-tenant support
 * @returns Workflow ID if triggered, null if not applicable
 */
export async function triggerEnrichmentForSubscriber(
  subscriber: Subscriber,
  organizationId: string
): Promise<string | null> {
  // Only trigger for personal email subscribers
  if (subscriber.emailType !== 'personal') {
    return null;
  }

  // Import job creator here to avoid circular dependency
  const { createEnrichmentJob } = await import('@/lib/enrichment/job-creator');
  
  // Create enrichment job directly (subscriber already exists)
  await createEnrichmentJob(subscriber.id, organizationId, 'personal');

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
