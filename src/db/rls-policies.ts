import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

/**
 * Row-Level Security (RLS) Policies for Lumina
 * 
 * These policies ensure that users can only access data belonging to their organization.
 * RLS is enforced at the database level, providing defense-in-depth security.
 */

/**
 * Enable RLS on subscribers table and create policies
 */
export async function enableSubscribersRLS(db: PostgresJsDatabase<typeof schema>) {
  // Enable RLS on subscribers table
  await db.execute(sql`ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY`);
  
  // Drop existing policies if they exist (for idempotency)
  await db.execute(sql`DROP POLICY IF EXISTS subscribers_isolation_policy ON subscribers`);
  
  // Create policy: Users can only access subscribers from their organization
  // This assumes the application sets current_setting('app.current_organization_id')
  await db.execute(sql`
    CREATE POLICY subscribers_isolation_policy ON subscribers
    USING (organization_id = current_setting('app.current_organization_id')::uuid)
    WITH CHECK (organization_id = current_setting('app.current_organization_id')::uuid)
  `);
}

/**
 * Enable RLS on enrichment_jobs table and create policies
 */
export async function enableEnrichmentJobsRLS(db: PostgresJsDatabase<typeof schema>) {
  // Enable RLS on enrichment_jobs table
  await db.execute(sql`ALTER TABLE enrichment_jobs ENABLE ROW LEVEL SECURITY`);
  
  // Drop existing policies if they exist (for idempotency)
  await db.execute(sql`DROP POLICY IF EXISTS enrichment_jobs_isolation_policy ON enrichment_jobs`);
  
  // Create policy: Users can only access enrichment jobs from their organization
  await db.execute(sql`
    CREATE POLICY enrichment_jobs_isolation_policy ON enrichment_jobs
    USING (organization_id = current_setting('app.current_organization_id')::uuid)
    WITH CHECK (organization_id = current_setting('app.current_organization_id')::uuid)
  `);
}

/**
 * Set the current organization context for the database session
 * This should be called at the beginning of each request with the authenticated user's organization
 */
export async function setOrganizationContext(db: PostgresJsDatabase<typeof schema>, organizationId: string) {
  await db.execute(sql`SET LOCAL app.current_organization_id = ${organizationId}`);
}

/**
 * Initialize all RLS policies
 * This should be run during application setup or migrations
 */
export async function initializeRLS(db: PostgresJsDatabase<typeof schema>) {
  await enableSubscribersRLS(db);
  await enableEnrichmentJobsRLS(db);
}

/**
 * Disable RLS (for testing or administrative operations)
 * Use with caution - this removes security isolation
 */
export async function disableRLS(db: PostgresJsDatabase<typeof schema>) {
  await db.execute(sql`ALTER TABLE subscribers DISABLE ROW LEVEL SECURITY`);
  await db.execute(sql`ALTER TABLE enrichment_jobs DISABLE ROW LEVEL SECURITY`);
}
