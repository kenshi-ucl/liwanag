/**
 * Workflow orchestration engine
 * Implements a Rilo-style workflow system for managing asynchronous processes
 */

import type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowStatus,
  WorkflowTriggerResult,
  RetryPolicy,
} from './types';
import { nowUTC } from '@/db/timestamp-utils';

// In-memory storage for workflow instances and events
// In production, this would be backed by a database
const workflowInstances = new Map<string, WorkflowContext>();
const workflowEvents = new Map<string, WorkflowEvent[]>();
const eventWaiters = new Map<string, Array<(event: WorkflowEvent) => void>>();

/**
 * Parse timeout string to milliseconds
 * Supports formats: '24h', '1h', '30m', '60s'
 */
function parseTimeout(timeout: string): number {
  const match = timeout.match(/^(\d+)(h|m|s)$/);
  if (!match) {
    throw new Error(`Invalid timeout format: ${timeout}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      throw new Error(`Unknown timeout unit: ${unit}`);
  }
}

/**
 * Calculate retry delay based on retry policy
 */
function calculateRetryDelay(
  attemptNumber: number,
  policy: RetryPolicy
): number {
  const initialDelay = policy.initialDelay || 1000;
  const maxDelay = policy.maxDelay || 60000;

  let delay: number;

  switch (policy.backoff) {
    case 'exponential':
      delay = initialDelay * Math.pow(2, attemptNumber - 1);
      break;
    case 'linear':
      delay = initialDelay * attemptNumber;
      break;
    case 'constant':
      delay = initialDelay;
      break;
    default:
      delay = initialDelay;
  }

  return Math.min(delay, maxDelay);
}

/**
 * Execute a workflow step with retry logic
 */
async function executeStepWithRetry<TInput, TOutput>(
  step: WorkflowDefinition<TInput>['steps'][0],
  context: WorkflowContext<TInput>,
  attemptNumber: number = 1
): Promise<TOutput> {
  try {
    const result = await step.action(context);
    return result as TOutput;
  } catch (error) {
    const retry = step.retry;

    if (!retry || attemptNumber >= retry.maxAttempts) {
      throw error;
    }

    // Check if error is retryable
    if (retry.retryOn && error instanceof Error) {
      const statusCode = (error as any).statusCode;
      if (statusCode && !retry.retryOn.includes(statusCode)) {
        throw error;
      }
    }

    // Calculate delay and retry
    const delay = calculateRetryDelay(attemptNumber, retry);
    await new Promise(resolve => setTimeout(resolve, delay));

    return executeStepWithRetry(step, context, attemptNumber + 1);
  }
}

/**
 * Wait for a workflow event with timeout
 */
async function waitForEvent(
  workflowId: string,
  eventType: string,
  timeoutMs: number
): Promise<WorkflowEvent> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      // Remove waiter
      const waiters = eventWaiters.get(workflowId) || [];
      const index = waiters.indexOf(handler);
      if (index > -1) {
        waiters.splice(index, 1);
      }
      
      reject(new Error(`Workflow timeout waiting for event: ${eventType}`));
    }, timeoutMs);

    const handler = (event: WorkflowEvent) => {
      if (event.type === eventType) {
        clearTimeout(timeoutId);
        resolve(event);
      }
    };

    // Register event waiter
    const waiters = eventWaiters.get(workflowId) || [];
    waiters.push(handler);
    eventWaiters.set(workflowId, waiters);

    // Check if event already exists
    const events = workflowEvents.get(workflowId) || [];
    const existingEvent = events.find(e => e.type === eventType);
    if (existingEvent) {
      clearTimeout(timeoutId);
      resolve(existingEvent);
    }
  });
}

/**
 * Define a workflow
 */
export function defineWorkflow<TInput = unknown>(
  definition: WorkflowDefinition<TInput>
): WorkflowDefinition<TInput> & {
  trigger: (input: TInput) => Promise<WorkflowTriggerResult>;
  waitForEvent: (eventType: string) => Promise<void>;
} {
  return {
    ...definition,
    
    /**
     * Trigger the workflow with input data
     */
    async trigger(input: TInput): Promise<WorkflowTriggerResult> {
      const workflowId = `${definition.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const context: WorkflowContext<TInput> = {
        workflowId,
        input,
        steps: {},
        status: 'pending',
        startedAt: nowUTC(),
      };

      // Store workflow instance
      workflowInstances.set(workflowId, context);
      workflowEvents.set(workflowId, []);

      // Execute workflow asynchronously
      executeWorkflow(definition, context).catch(error => {
        console.error(`Workflow ${workflowId} failed:`, error);
      });

      return {
        workflowId,
        status: 'running',
      };
    },

    /**
     * Wait for an event (used within workflow steps)
     */
    async waitForEvent(eventType: string): Promise<void> {
      // This is a placeholder - actual implementation would be in the step action
      throw new Error('waitForEvent should be called from within a workflow step');
    },
  };
}

/**
 * Execute a workflow
 */
async function executeWorkflow<TInput>(
  definition: WorkflowDefinition<TInput>,
  context: WorkflowContext<TInput>
): Promise<void> {
  try {
    context.status = 'running';
    workflowInstances.set(context.workflowId, context);

    // Execute each step in sequence
    for (const step of definition.steps) {
      try {
        // Handle timeout if specified
        let stepPromise: Promise<unknown>;

        if (step.timeout) {
          const timeoutMs = parseTimeout(step.timeout);
          
          // Special handling for wait-for-event steps
          if (step.name.includes('wait')) {
            stepPromise = step.action(context);
          } else {
            stepPromise = Promise.race([
              executeStepWithRetry(step, context),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Step timeout: ${step.name}`)), timeoutMs)
              ),
            ]);
          }
        } else {
          stepPromise = executeStepWithRetry(step, context);
        }

        const result = await stepPromise;

        // Store step result in context
        context.steps[step.name] = result;
        context.previousStep = result;
        workflowInstances.set(context.workflowId, context);

      } catch (error) {
        // Handle step error
        if (step.onError) {
          await step.onError(context, error as Error);
        }
        throw error;
      }
    }

    // Workflow completed successfully
    context.status = 'completed';
    context.completedAt = nowUTC();
    workflowInstances.set(context.workflowId, context);

  } catch (error) {
    // Workflow failed
    context.status = 'failed';
    context.error = error as Error;
    context.completedAt = nowUTC();
    workflowInstances.set(context.workflowId, context);

    // Call workflow-level error handler
    if (definition.onError) {
      await definition.onError(context, error as Error);
    }

    throw error;
  }
}

/**
 * Emit an event to resume a waiting workflow
 */
export function emitWorkflowEvent(
  workflowId: string,
  eventType: string,
  data?: unknown
): void {
  const event: WorkflowEvent = {
    type: eventType,
    workflowId,
    data,
    timestamp: nowUTC(),
  };

  // Store event
  const events = workflowEvents.get(workflowId) || [];
  events.push(event);
  workflowEvents.set(workflowId, events);

  // Notify waiters
  const waiters = eventWaiters.get(workflowId) || [];
  waiters.forEach(waiter => waiter(event));
  
  // Clear waiters after notification
  eventWaiters.delete(workflowId);
}

/**
 * Get workflow context by ID
 */
export function getWorkflowContext(workflowId: string): WorkflowContext | undefined {
  return workflowInstances.get(workflowId);
}

/**
 * Helper to create a wait-for-event action
 */
export function createWaitForEventAction(
  eventType: string,
  timeoutMs: number
): (context: WorkflowContext) => Promise<WorkflowEvent> {
  return async (context: WorkflowContext) => {
    return waitForEvent(context.workflowId, eventType, timeoutMs);
  };
}
