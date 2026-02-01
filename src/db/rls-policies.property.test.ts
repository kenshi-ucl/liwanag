/**
 * Property-Based Tests for Row-Level Security (RLS) Policies
 * 
 * **Property 20: Row-level security isolation**
 * **Validates: Requirements 5.6**
 * 
 * For any two users from different organizations, querying subscribers should return 
 * only records belonging to their respective organizations with no cross-contamination.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import fc from 'fast-check';
import { db } from './index';
import { subscribers, enrichmentJobs } from './schema';
import { initializeRLS, setOrganizationContext, disableRLS } from './rls-policies';
import { eq, sql } from 'drizzle-orm';
import { initializeTestDatabase, cleanupTestDatabase, closeTestDatabase, isDatabaseAccessible } from '@/test/db-setup';

describe('Property 20: Row-level security isolation', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    // Check if database is accessible
    dbAvailable = await isDatabaseAccessible();
    
    if (!dbAvailable) {
      console.warn('⚠️  Skipping RLS tests: PostgreSQL database not accessible');
      console.warn('   To run these tests, start the test database with:');
      console.warn('   docker-compose -f docker-compose.test.yml up -d');
      return;
    }

    // Initialize test database schema
    await initializeTestDatabase();
  });

  afterAll(async () => {
    if (dbAvailable) {
      await closeTestDatabase();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    // Clean up tables
    await cleanupTestDatabase();
    
    // Initialize RLS policies
    await initializeRLS(db);
  });

  afterEach(async () => {
    if (!dbAvailable) return;

    // Disable RLS after tests
    await disableRLS(db);
  });

  it('should isolate subscribers by organization', async () => {
    if (!dbAvailable) {
      console.log('⏭️  Skipping test: database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // org1Id
        fc.uuid(), // org2Id
        fc.array(fc.emailAddress(), { minLength: 1, maxLength: 5 }), // org1 emails
        fc.array(fc.emailAddress(), { minLength: 1, maxLength: 5 }), // org2 emails
        async (org1Id, org2Id, org1Emails, org2Emails) => {
          // Skip if organizations are the same
          fc.pre(org1Id !== org2Id);
          
          // Ensure unique emails
          const uniqueOrg1Emails = [...new Set(org1Emails)];
          const uniqueOrg2Emails = [...new Set(org2Emails)];
          
          // Skip if there's overlap between email sets
          const overlap = uniqueOrg1Emails.some(e => uniqueOrg2Emails.includes(e));
          fc.pre(!overlap);
          
          // Insert subscribers for org1 (bypass RLS for setup)
          await db.execute(sql`SET LOCAL app.current_organization_id = ${org1Id}`);
          for (const email of uniqueOrg1Emails) {
            await db.insert(subscribers).values({
              organizationId: org1Id,
              email,
              emailType: 'personal',
              source: 'test',
            });
          }
          
          // Insert subscribers for org2 (bypass RLS for setup)
          await db.execute(sql`SET LOCAL app.current_organization_id = ${org2Id}`);
          for (const email of uniqueOrg2Emails) {
            await db.insert(subscribers).values({
              organizationId: org2Id,
              email,
              emailType: 'personal',
              source: 'test',
            });
          }
          
          // Query as org1 user
          await setOrganizationContext(db, org1Id);
          const org1Results = await db.select().from(subscribers);
          
          // Query as org2 user
          await setOrganizationContext(db, org2Id);
          const org2Results = await db.select().from(subscribers);
          
          // Verify org1 only sees their own data
          expect(org1Results.length).toBe(uniqueOrg1Emails.length);
          expect(org1Results.every(s => s.organizationId === org1Id)).toBe(true);
          expect(org1Results.every(s => uniqueOrg1Emails.includes(s.email))).toBe(true);
          
          // Verify org2 only sees their own data
          expect(org2Results.length).toBe(uniqueOrg2Emails.length);
          expect(org2Results.every(s => s.organizationId === org2Id)).toBe(true);
          expect(org2Results.every(s => uniqueOrg2Emails.includes(s.email))).toBe(true);
          
          // Verify no cross-contamination
          const org1Ids = new Set(org1Results.map(s => s.id));
          const org2Ids = new Set(org2Results.map(s => s.id));
          const intersection = [...org1Ids].filter(id => org2Ids.has(id));
          expect(intersection.length).toBe(0);
          
          // Cleanup for next iteration
          await disableRLS(db);
          await db.delete(subscribers).where(eq(subscribers.organizationId, org1Id));
          await db.delete(subscribers).where(eq(subscribers.organizationId, org2Id));
          await initializeRLS(db);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should isolate enrichment jobs by organization', async () => {
    if (!dbAvailable) {
      console.log('⏭️  Skipping test: database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // org1Id
        fc.uuid(), // org2Id
        fc.emailAddress(), // org1 email
        fc.emailAddress(), // org2 email
        async (org1Id, org2Id, org1Email, org2Email) => {
          // Skip if organizations are the same or emails are the same
          fc.pre(org1Id !== org2Id && org1Email !== org2Email);
          
          // Create subscribers for both orgs (bypass RLS for setup)
          await db.execute(sql`SET LOCAL app.current_organization_id = ${org1Id}`);
          const [org1Subscriber] = await db.insert(subscribers).values({
            organizationId: org1Id,
            email: org1Email,
            emailType: 'personal',
            source: 'test',
          }).returning();
          
          await db.execute(sql`SET LOCAL app.current_organization_id = ${org2Id}`);
          const [org2Subscriber] = await db.insert(subscribers).values({
            organizationId: org2Id,
            email: org2Email,
            emailType: 'personal',
            source: 'test',
          }).returning();
          
          // Create enrichment jobs for both orgs
          await db.execute(sql`SET LOCAL app.current_organization_id = ${org1Id}`);
          await db.insert(enrichmentJobs).values({
            organizationId: org1Id,
            subscriberId: org1Subscriber.id,
            status: 'pending',
            estimatedCredits: 3,
          });
          
          await db.execute(sql`SET LOCAL app.current_organization_id = ${org2Id}`);
          await db.insert(enrichmentJobs).values({
            organizationId: org2Id,
            subscriberId: org2Subscriber.id,
            status: 'pending',
            estimatedCredits: 3,
          });
          
          // Query as org1 user
          await setOrganizationContext(db, org1Id);
          const org1Jobs = await db.select().from(enrichmentJobs);
          
          // Query as org2 user
          await setOrganizationContext(db, org2Id);
          const org2Jobs = await db.select().from(enrichmentJobs);
          
          // Verify org1 only sees their own jobs
          expect(org1Jobs.length).toBe(1);
          expect(org1Jobs[0].organizationId).toBe(org1Id);
          expect(org1Jobs[0].subscriberId).toBe(org1Subscriber.id);
          
          // Verify org2 only sees their own jobs
          expect(org2Jobs.length).toBe(1);
          expect(org2Jobs[0].organizationId).toBe(org2Id);
          expect(org2Jobs[0].subscriberId).toBe(org2Subscriber.id);
          
          // Cleanup for next iteration
          await disableRLS(db);
          await db.delete(enrichmentJobs).where(eq(enrichmentJobs.organizationId, org1Id));
          await db.delete(enrichmentJobs).where(eq(enrichmentJobs.organizationId, org2Id));
          await db.delete(subscribers).where(eq(subscribers.organizationId, org1Id));
          await db.delete(subscribers).where(eq(subscribers.organizationId, org2Id));
          await initializeRLS(db);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should prevent cross-organization updates', async () => {
    if (!dbAvailable) {
      console.log('⏭️  Skipping test: database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // org1Id
        fc.uuid(), // org2Id
        fc.emailAddress(), // email
        fc.string({ minLength: 1, maxLength: 100 }), // new source value
        async (org1Id, org2Id, email, newSource) => {
          // Skip if organizations are the same
          fc.pre(org1Id !== org2Id);
          
          // Create subscriber for org1 (bypass RLS for setup)
          await db.execute(sql`SET LOCAL app.current_organization_id = ${org1Id}`);
          const [subscriber] = await db.insert(subscribers).values({
            organizationId: org1Id,
            email,
            emailType: 'personal',
            source: 'original',
          }).returning();
          
          // Try to update as org2 user (should fail due to RLS)
          await setOrganizationContext(db, org2Id);
          const updateResult = await db
            .update(subscribers)
            .set({ source: newSource })
            .where(eq(subscribers.id, subscriber.id))
            .returning();
          
          // Verify update was blocked (no rows returned)
          expect(updateResult.length).toBe(0);
          
          // Verify original data unchanged (query as org1)
          await setOrganizationContext(db, org1Id);
          const [unchanged] = await db
            .select()
            .from(subscribers)
            .where(eq(subscribers.id, subscriber.id));
          
          expect(unchanged.source).toBe('original');
          expect(unchanged.organizationId).toBe(org1Id);
          
          // Cleanup for next iteration
          await disableRLS(db);
          await db.delete(subscribers).where(eq(subscribers.id, subscriber.id));
          await initializeRLS(db);
        }
      ),
      { numRuns: 10 }
    );
  });
});
