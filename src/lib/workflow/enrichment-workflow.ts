/**
 * Enrichment workflow definition
 * Orchestrates the complete enrichment process: batch → submit → wait → process
 */

import { defineWorkflow, createWaitForEventAction } from './engine';
import type { WorkflowContext } from './types';
import { queryPendingJobs, batchJobs, submitBatchToFullEnrich, storeEnrichmentId } from '@/lib/enrichment/batch-processor';
import { FullEnrichClient } from '@/lib/fullenrich/client';
import { env } from '@/config/env';
import { processEnrichmentResult } from '@/lib/enrichment/webhook-receiver';
import { markJobAsFailed } from '@/lib/enrichment/failure-handler';
import { registerWorkflowForEnrichment, unregisterWorkflowForEnrichment } from './workflow-tracker';
import type { EnrichmentJob } from '@/db/schema';
import type { EnrichmentResult } from '@/lib/fullenrich/schemas';

/**
 * Input for enrichment workflow
 */
export interface EnrichmentWorkflowInput {
  subscriberId?: string;
  email?: string;
  organizationId?: string;
  triggerType: 'subscriber-created' | 'scheduled-batch';
}

/**
 * Step data accumulated during workflow execution
 */
export interface EnrichmentWorkflowSteps {
  'batch-pending-jobs'?: {
    jobs: EnrichmentJob[];
    batchCount: number;
  };
  'submit-to-fullenrich'?: {
    enrichmentId: string;
    jobIds: string[];
  };
  'wait-for-webhook'?: {
    eventData: unknown;
  };
  'process-results'?: {
    processed: number;
  };
}

/**
 * Enrichment workflow definition
 * Implements the complete enrichment pipeline with retry logic and timeout handling
 */
export const enrichmentWorkflow = defineWorkflow<EnrichmentWorkflowInput>({
  name: 'subscriber-enrichment',
  
  steps: [
    {
      name: 'batch-pending-jobs',
      action: async (context: WorkflowContext<EnrichmentWorkflowInput>) => {
        // Query pending enrichment jobs
        const jobs = await queryPendingJobs(100);
        
        if (jobs.length === 0) {
          return {
            jobs: [],
            batchCount: 0,
          };
        }

        // Batch jobs (max 100 per batch)
        const batches = batchJobs(jobs, 100);
        
        return {
          jobs: jobs,
          batchCount: batches.length,
        };
      },
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000,
      },
    },
    
    {
      name: 'submit-to-fullenrich',
      action: async (context: WorkflowContext<EnrichmentWorkflowInput, EnrichmentWorkflowSteps>) => {
        const previousStep = context.steps['batch-pending-jobs'];
        
        if (!previousStep || previousStep.jobs.length === 0) {
          return {
            enrichmentId: '',
            jobIds: [],
          };
        }

        const { jobs } = previousStep;
        const client = new FullEnrichClient();
        
        // Submit batch to FullEnrich API
        const enrichmentId = await submitBatchToFullEnrich(
          jobs,
          client,
          env.FULLENRICH_WEBHOOK_URL
        );
        
        // Store enrichment ID in all jobs
        const jobIds = jobs.map(job => job.id);
        await storeEnrichmentId(jobIds, enrichmentId);
        
        // Register workflow ID for this enrichment
        registerWorkflowForEnrichment(enrichmentId, context.workflowId);
        
        return {
          enrichmentId,
          jobIds,
        };
      },
      retry: {
        maxAttempts: 5,
        backoff: 'exponential',
        initialDelay: 1000,
        maxDelay: 60000,
        retryOn: [429, 500, 502, 503, 504],
      },
    },
    
    {
      name: 'wait-for-webhook',
      action: createWaitForEventAction('enrichment-complete', 24 * 60 * 60 * 1000), // 24 hours
      timeout: '24h',
    },
    
    {
      name: 'process-results',
      action: async (context: WorkflowContext<EnrichmentWorkflowInput, EnrichmentWorkflowSteps>) => {
        const submitStep = context.steps['submit-to-fullenrich'];
        const waitStep = context.steps['wait-for-webhook'];
        
        if (!submitStep || !waitStep) {
          return { processed: 0 };
        }

        const { enrichmentId } = submitStep;
        const eventData = waitStep.eventData as { results: EnrichmentResult[] };
        
        if (!eventData || !eventData.results) {
          return { processed: 0 };
        }

        let processedCount = 0;
        
        // Process each enrichment result
        for (const result of eventData.results) {
          try {
            await processEnrichmentResult(enrichmentId, result);
            processedCount++;
          } catch (error) {
            console.error('Failed to process enrichment result:', error);
            // Continue processing other results
          }
        }
        
        // Unregister workflow mapping after completion
        unregisterWorkflowForEnrichment(enrichmentId);
        
        return {
          processed: processedCount,
        };
      },
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000,
      },
    },
  ],
  
  onError: async (context, error) => {
    console.error(`Enrichment workflow ${context.workflowId} failed:`, error);
    
    // Mark jobs as failed if we have them
    const batchStep = context.steps['batch-pending-jobs'] as EnrichmentWorkflowSteps['batch-pending-jobs'];
    
    if (batchStep && batchStep.jobs) {
      for (const job of batchStep.jobs) {
        try {
          await markJobAsFailed(job.id, error.message);
        } catch (markError) {
          console.error('Failed to mark job as failed:', markError);
        }
      }
    }
  },
});
