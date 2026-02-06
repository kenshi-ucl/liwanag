import { db } from '@/db';
import { subscribers, type Subscriber } from '@/db/schema';
import { and, gte, ilike, eq, isNotNull, SQL } from 'drizzle-orm';

/**
 * Lead filtering options
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export interface LeadFilter {
  minICPScore?: number;
  companyName?: string;
  jobTitle?: string;
  syncStatus?: 'synced' | 'unsynced';
}

/**
 * Result of lead filtering query
 */
export interface FilteredLeadsResult {
  leads: Subscriber[];
  totalCount: number;
}

/**
 * Filter leads based on multiple criteria with AND logic
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * @param filter - Filtering criteria
 * @param organizationId - The organization ID for multi-tenant support
 * @returns Filtered leads and total count
 */
export async function filterLeads(filter: LeadFilter, organizationId?: string): Promise<FilteredLeadsResult> {
  const conditions: SQL[] = [];

  // Add organization filter if provided
  if (organizationId) {
    conditions.push(eq(subscribers.organizationId, organizationId));
  }

  // Filter by minimum ICP score (Requirement 8.1)
  if (filter.minICPScore !== undefined) {
    conditions.push(gte(subscribers.icpScore, filter.minICPScore));
  }

  // Filter by company name - case-insensitive partial match (Requirement 8.2)
  if (filter.companyName) {
    conditions.push(ilike(subscribers.companyName, `%${filter.companyName}%`));
  }

  // Filter by job title - case-insensitive partial match (Requirement 8.3)
  if (filter.jobTitle) {
    conditions.push(ilike(subscribers.jobTitle, `%${filter.jobTitle}%`));
  }

  // Filter by sync status (Requirement 8.4)
  if (filter.syncStatus === 'synced') {
    conditions.push(eq(subscribers.syncedToCRM, true));
  } else if (filter.syncStatus === 'unsynced') {
    conditions.push(eq(subscribers.syncedToCRM, false));
  }

  // Combine filters with AND logic (Requirement 8.4)
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Execute query to get filtered leads
  const leads = await db
    .select()
    .from(subscribers)
    .where(whereClause);

  // Return total count of matching records (Requirement 8.5)
  return {
    leads,
    totalCount: leads.length,
  };
}

/**
 * Get "Hidden Gems" - enriched subscribers with high ICP scores
 * Requirements: 7.4, 7.5
 * 
 * @param minScore - Minimum ICP score threshold (default: 70)
 * @param organizationId - The organization ID for multi-tenant support
 * @returns Enriched subscribers with ICP score > threshold
 */
export async function getHiddenGems(minScore: number = 70, organizationId?: string): Promise<Subscriber[]> {
  const conditions: SQL[] = [
    isNotNull(subscribers.linkedinUrl), // Must be enriched
    gte(subscribers.icpScore, minScore + 1) // ICP score > threshold (strictly greater)
  ];
  
  // Add organization filter if provided
  if (organizationId) {
    conditions.push(eq(subscribers.organizationId, organizationId));
  }
  
  // Query enriched subscribers with ICP score > threshold
  // Enriched means they have linkedin_url populated (Requirement 7.4)
  const hiddenGems = await db
    .select()
    .from(subscribers)
    .where(and(...conditions));

  // All enrichment fields are included in the Subscriber type (Requirement 7.5)
  // Fields: linkedinUrl, jobTitle, companyName, companyDomain, headcount, industry
  return hiddenGems;
}
