/**
 * Tests for enrichment workflow integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichmentWorkflow } from './enrichment-workflow';
import { triggerEnrichmentForSubscriber, triggerScheduledEnrichmentBatch } from './triggers';
import { registerWorkflowForEnrichment, getWorkflowIdForEnrichment, unregisterWorkflowForEnrichment } from './workflow-tracker';
import type { Subscriber } from '@/db/schema';

describe('Enrichment Workflow Integration', () => {
  beforeEach(() => {
    // Clear any existing workflow mappings
    vi.clearAllMocks();
  });

  describe('Workflow Definition', () => {
    it('should have correct workflow name', () => {
      expect(enrichmentWorkflow.name).toBe('subscriber-enrichment');
    });

    it('should have all required steps', () => {
      expect(enrichmentWorkflow.steps).toHaveLength(4);
      expect(enrichmentWorkflow.steps[0].name).toBe('batch-pending-jobs');
      expect(enrichmentWorkflow.steps[1].name).toBe('submit-to-fullenrich');
      expect(enrichmentWorkflow.steps[2].name).toBe('wait-for-webhook');
      expect(enrichmentWorkflow.steps[3].name).toBe('process-results');
    });

    it('should have retry policies configured', () => {
      const batchStep = enrichmentWorkflow.steps[0];
      expect(batchStep.retry).toBeDefined();
      expect(batchStep.retry?.maxAttempts).toBe(3);
      expect(batchStep.retry?.backoff).toBe('exponential');

      const submitStep = enrichmentWorkflow.steps[1];
      expect(submitStep.retry).toBeDefined();
      expect(submitStep.retry?.maxAttempts).toBe(5);
      expect(submitStep.retry?.retryOn).toContain(429);
      expect(submitStep.retry?.retryOn).toContain(500);
    });

    it('should have 24-hour timeout for webhook wait', () => {
      const waitStep = enrichmentWorkflow.steps[2];
      expect(waitStep.timeout).toBe('24h');
    });
  });

  describe('Workflow Triggers', () => {
    it('should trigger workflow for personal email subscriber', async () => {
      const subscriber: Subscriber = {
        id: 'test-id',
        email: 'test@gmail.com',
        emailType: 'personal',
        source: 'newsletter',
        linkedinUrl: null,
        jobTitle: null,
        companyName: null,
        companyDomain: null,
        headcount: null,
        industry: null,
        icpScore: null,
        syncedToCRM: false,
        syncedAt: null,
        rawPayload: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const workflowId = await triggerEnrichmentForSubscriber(subscriber);
      expect(workflowId).toBeTruthy();
      expect(typeof workflowId).toBe('string');
    });

    it('should not trigger workflow for corporate email subscriber', async () => {
      const subscriber: Subscriber = {
        id: 'test-id',
        email: 'test@company.com',
        emailType: 'corporate',
        source: 'newsletter',
        linkedinUrl: null,
        jobTitle: null,
        companyName: null,
        companyDomain: null,
        headcount: null,
        industry: null,
        icpScore: null,
        syncedToCRM: false,
        syncedAt: null,
        rawPayload: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const workflowId = await triggerEnrichmentForSubscriber(subscriber);
      expect(workflowId).toBeNull();
    });

    it('should trigger scheduled batch workflow', async () => {
      const workflowId = await triggerScheduledEnrichmentBatch();
      expect(workflowId).toBeTruthy();
      expect(typeof workflowId).toBe('string');
    });
  });

  describe('Workflow Tracker', () => {
    it('should register and retrieve workflow ID for enrichment', () => {
      const enrichmentId = 'enrich-123';
      const workflowId = 'workflow-456';

      registerWorkflowForEnrichment(enrichmentId, workflowId);
      
      const retrievedWorkflowId = getWorkflowIdForEnrichment(enrichmentId);
      expect(retrievedWorkflowId).toBe(workflowId);
    });

    it('should unregister workflow mapping', () => {
      const enrichmentId = 'enrich-123';
      const workflowId = 'workflow-456';

      registerWorkflowForEnrichment(enrichmentId, workflowId);
      unregisterWorkflowForEnrichment(enrichmentId);
      
      const retrievedWorkflowId = getWorkflowIdForEnrichment(enrichmentId);
      expect(retrievedWorkflowId).toBeUndefined();
    });

    it('should return undefined for unknown enrichment ID', () => {
      const retrievedWorkflowId = getWorkflowIdForEnrichment('unknown-id');
      expect(retrievedWorkflowId).toBeUndefined();
    });
  });
});
