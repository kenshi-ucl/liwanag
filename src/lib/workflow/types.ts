/**
 * Workflow orchestration types
 * Implements a Rilo-style workflow system for managing asynchronous enrichment processes
 */

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout';

export interface WorkflowContext<TInput = unknown, TStepData = Record<string, unknown>> {
  workflowId: string;
  input: TInput;
  steps: TStepData;
  previousStep?: unknown;
  status: WorkflowStatus;
  error?: Error;
  startedAt: Date;
  completedAt?: Date;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoff: 'exponential' | 'linear' | 'constant';
  initialDelay?: number;
  maxDelay?: number;
  retryOn?: number[]; // HTTP status codes to retry on
}

export interface WorkflowStep<TInput = unknown, TOutput = unknown> {
  name: string;
  action: (context: WorkflowContext<TInput>) => Promise<TOutput>;
  retry?: RetryPolicy;
  timeout?: string; // e.g., '24h', '1h', '30m'
  onError?: (context: WorkflowContext<TInput>, error: Error) => Promise<void>;
}

export interface WorkflowDefinition<TInput = unknown> {
  name: string;
  steps: WorkflowStep<TInput, unknown>[];
  onError?: (context: WorkflowContext<TInput>, error: Error) => Promise<void>;
}

export interface WorkflowEvent {
  type: string;
  workflowId: string;
  data?: unknown;
  timestamp: Date;
}

export interface WorkflowTriggerResult {
  workflowId: string;
  status: WorkflowStatus;
}
