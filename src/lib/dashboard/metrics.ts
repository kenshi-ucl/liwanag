import { db } from '@/db';
import { subscribers, enrichmentJobs } from '@/db/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';

export interface DashboardMetrics {
  totalSubscribers: number;
  personalEmailCount: number;
  enrichedCount: number;
  pendingCount: number;
  darkFunnelPercentage: number;
  totalCreditsUsed: number;
  estimatedPendingCredits: number;
}

export interface EnrichmentStatusCounts {
  pending: number;
  enriched: number;
  failed: number;
}

/**
 * Calculate all dashboard metrics in a single query batch
 * Requirements: 7.1, 7.2, 7.3
 * 
 * @param organizationId - The organization ID for multi-tenant support
 */
export async function calculateDashboardMetrics(organizationId?: string): Promise<DashboardMetrics> {
  // Build where clause for organization filtering
  const orgFilter = organizationId ? eq(subscribers.organizationId, organizationId) : undefined;
  
  // Query 1: Subscriber counts
  const subscriberStats = await db
    .select({
      totalSubscribers: sql<number>`count(*)::int`,
      personalEmailCount: sql<number>`count(*) filter (where ${subscribers.emailType} = 'personal')::int`,
      enrichedCount: sql<number>`count(*) filter (where ${subscribers.emailType} = 'personal' and ${subscribers.linkedinUrl} is not null)::int`,
    })
    .from(subscribers)
    .where(orgFilter);

  const stats = subscriberStats[0] || {
    totalSubscribers: 0,
    personalEmailCount: 0,
    enrichedCount: 0,
  };

  // Build where clause for enrichment jobs
  const jobOrgFilter = organizationId ? eq(enrichmentJobs.organizationId, organizationId) : undefined;
  
  // Query 2: Enrichment job counts and credit totals
  const jobStats = await db
    .select({
      pendingCount: sql<number>`count(*) filter (where ${enrichmentJobs.status} = 'pending')::int`,
      totalCreditsUsed: sql<number>`coalesce(sum(${enrichmentJobs.actualCredits}), 0)::int`,
      estimatedPendingCredits: sql<number>`coalesce(sum(${enrichmentJobs.estimatedCredits}) filter (where ${enrichmentJobs.status} = 'pending'), 0)::int`,
    })
    .from(enrichmentJobs)
    .where(jobOrgFilter);

  const jobs = jobStats[0] || {
    pendingCount: 0,
    totalCreditsUsed: 0,
    estimatedPendingCredits: 0,
  };

  // Calculate dark funnel percentage
  // Dark funnel percentage = (enriched personal emails / total personal emails) * 100
  const darkFunnelPercentage =
    stats.personalEmailCount > 0
      ? Math.round((stats.enrichedCount / stats.personalEmailCount) * 10000) / 100
      : 0;

  return {
    totalSubscribers: stats.totalSubscribers,
    personalEmailCount: stats.personalEmailCount,
    enrichedCount: stats.enrichedCount,
    pendingCount: jobs.pendingCount,
    darkFunnelPercentage,
    totalCreditsUsed: jobs.totalCreditsUsed,
    estimatedPendingCredits: jobs.estimatedPendingCredits,
  };
}

/**
 * Get enrichment job status aggregation
 * Requirements: 4.1
 * 
 * @param organizationId - The organization ID for multi-tenant support
 */
export async function getEnrichmentStatusCounts(organizationId?: string): Promise<EnrichmentStatusCounts> {
  const orgFilter = organizationId ? eq(enrichmentJobs.organizationId, organizationId) : undefined;
  
  const result = await db
    .select({
      pending: sql<number>`count(*) filter (where ${enrichmentJobs.status} = 'pending')::int`,
      enriched: sql<number>`count(*) filter (where ${enrichmentJobs.status} = 'enriched')::int`,
      failed: sql<number>`count(*) filter (where ${enrichmentJobs.status} = 'failed')::int`,
    })
    .from(enrichmentJobs)
    .where(orgFilter);

  return result[0] || {
    pending: 0,
    enriched: 0,
    failed: 0,
  };
}
