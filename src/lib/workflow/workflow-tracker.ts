/**
 * Workflow tracking utilities
 * Maps enrichment IDs to workflow IDs for event routing
 */

// In-memory mapping of enrichment IDs to workflow IDs
// In production, this would be stored in a database or cache
const enrichmentToWorkflowMap = new Map<string, string>();

/**
 * Register a workflow ID for an enrichment ID
 */
export function registerWorkflowForEnrichment(
  enrichmentId: string,
  workflowId: string
): void {
  enrichmentToWorkflowMap.set(enrichmentId, workflowId);
}

/**
 * Get the workflow ID for an enrichment ID
 */
export function getWorkflowIdForEnrichment(
  enrichmentId: string
): string | undefined {
  return enrichmentToWorkflowMap.get(enrichmentId);
}

/**
 * Remove the mapping when workflow completes
 */
export function unregisterWorkflowForEnrichment(
  enrichmentId: string
): void {
  enrichmentToWorkflowMap.delete(enrichmentId);
}

/**
 * Get all active workflow mappings (for debugging)
 */
export function getActiveWorkflowMappings(): Map<string, string> {
  return new Map(enrichmentToWorkflowMap);
}
