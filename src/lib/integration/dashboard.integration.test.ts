import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/db';
import { subscribers, enrichmentJobs, type NewSubscriber, type NewEnrichmentJob } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { calculateDashboardMetrics, getEnrichmentStatusCounts } from '@/lib/dashboard/metrics';
import { filterLeads, getHiddenGems } from '@/lib/dashboard/lead-filter';
import { bulkSyncToCRM } from '@/lib/crm/sync';
import { initializeTestDatabase, cleanupTestDatabase, closeTestDatabase } from '@/test/db-setup';

/**
 * Integration test for dashboard queries
 * 
 * Tests:
 * 1. Metrics calculation with real database data
 * 2. Filtering and search with various combinations
 * 3. Result counts match actual data
 */

// Test organization ID for all integration tests
const TEST_ORG_ID = '00000000-0000-4000-8000-000000000001';

describe('Dashboard Queries Integration', () => {
  beforeAll(async () => {
    await initializeTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  // Helper function to create test subscribers
  async function createTestSubscriber(data: Partial<NewSubscriber>) {
    const defaultData: NewSubscriber = {
      organizationId: data.organizationId || TEST_ORG_ID,
      email: data.email || 'test@example.com',
      emailType: data.emailType || 'personal',
      source: data.source || 'newsletter',
      linkedinUrl: data.linkedinUrl || null,
      jobTitle: data.jobTitle || null,
      companyName: data.companyName || null,
      companyDomain: data.companyDomain || null,
      headcount: data.headcount || null,
      industry: data.industry || null,
      icpScore: data.icpScore || null,
      syncedToCRM: data.syncedToCRM || false,
      syncedAt: data.syncedAt || null,
      rawPayload: data.rawPayload || null,
    };

    const [subscriber] = await db.insert(subscribers).values(defaultData).returning();
    return subscriber;
  }

  // Helper function to create test enrichment job
  async function createTestJob(subscriberId: string, data: Partial<NewEnrichmentJob> = {}) {
    const defaultData: NewEnrichmentJob = {
      organizationId: data.organizationId || TEST_ORG_ID,
      subscriberId,
      status: data.status || 'pending',
      enrichmentId: data.enrichmentId || null,
      estimatedCredits: data.estimatedCredits || 3,
      actualCredits: data.actualCredits || null,
      failureReason: data.failureReason || null,
      retryCount: data.retryCount || 0,
      completedAt: data.completedAt || null,
    };

    const [job] = await db.insert(enrichmentJobs).values(defaultData).returning();
    return job;
  }

  describe('Dashboard Metrics Calculation', () => {
    it('should calculate metrics correctly with mixed data', async () => {
      // Create test data
      // 3 personal emails (2 enriched, 1 pending)
      const personal1 = await createTestSubscriber({
        email: 'john@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/john',
        jobTitle: 'VP Engineering',
        companyName: 'Acme Corp',
        headcount: 250,
        industry: 'SaaS',
        icpScore: 85,
      });

      const personal2 = await createTestSubscriber({
        email: 'jane@yahoo.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/jane',
        jobTitle: 'Director Sales',
        companyName: 'Tech Inc',
        headcount: 150,
        industry: 'Technology',
        icpScore: 78,
      });

      const personal3 = await createTestSubscriber({
        email: 'bob@outlook.com',
        emailType: 'personal',
      });

      // 2 corporate emails (no enrichment)
      await createTestSubscriber({
        email: 'alice@acme.com',
        emailType: 'corporate',
      });

      await createTestSubscriber({
        email: 'charlie@techcorp.io',
        emailType: 'corporate',
      });

      // Create enrichment jobs
      await createTestJob(personal1.id, {
        status: 'enriched',
        actualCredits: 3,
        completedAt: new Date(),
      });

      await createTestJob(personal2.id, {
        status: 'enriched',
        actualCredits: 3,
        completedAt: new Date(),
      });

      await createTestJob(personal3.id, {
        status: 'pending',
        estimatedCredits: 3,
      });

      // Calculate metrics
      const metrics = await calculateDashboardMetrics(TEST_ORG_ID);

      // Verify metrics
      expect(metrics.totalSubscribers).toBe(5);
      expect(metrics.personalEmailCount).toBe(3);
      expect(metrics.enrichedCount).toBe(2);
      expect(metrics.pendingCount).toBe(1);
      expect(metrics.darkFunnelPercentage).toBe(66.67); // 2/3 * 100
      expect(metrics.totalCreditsUsed).toBe(6); // 3 + 3
      expect(metrics.estimatedPendingCredits).toBe(3);
    });

    it('should handle empty database', async () => {
      const metrics = await calculateDashboardMetrics(TEST_ORG_ID);

      expect(metrics.totalSubscribers).toBe(0);
      expect(metrics.personalEmailCount).toBe(0);
      expect(metrics.enrichedCount).toBe(0);
      expect(metrics.pendingCount).toBe(0);
      expect(metrics.darkFunnelPercentage).toBe(0);
      expect(metrics.totalCreditsUsed).toBe(0);
      expect(metrics.estimatedPendingCredits).toBe(0);
    });

    it('should calculate dark funnel percentage correctly', async () => {
      // 10 personal emails, 7 enriched
      for (let i = 0; i < 7; i++) {
        await createTestSubscriber({
          email: `enriched${i}@gmail.com`,
          emailType: 'personal',
          linkedinUrl: 'https://linkedin.com/in/user',
          icpScore: 50,
        });
      }

      for (let i = 0; i < 3; i++) {
        await createTestSubscriber({
          email: `pending${i}@gmail.com`,
          emailType: 'personal',
        });
      }

      const metrics = await calculateDashboardMetrics(TEST_ORG_ID);

      expect(metrics.personalEmailCount).toBe(10);
      expect(metrics.enrichedCount).toBe(7);
      expect(metrics.darkFunnelPercentage).toBe(70); // 7/10 * 100
    });

    it('should aggregate enrichment status counts correctly', async () => {
      const sub1 = await createTestSubscriber({ email: 'user1@gmail.com' });
      const sub2 = await createTestSubscriber({ email: 'user2@gmail.com' });
      const sub3 = await createTestSubscriber({ email: 'user3@gmail.com' });
      const sub4 = await createTestSubscriber({ email: 'user4@gmail.com' });
      const sub5 = await createTestSubscriber({ email: 'user5@gmail.com' });

      await createTestJob(sub1.id, { status: 'pending' });
      await createTestJob(sub2.id, { status: 'pending' });
      await createTestJob(sub3.id, { status: 'enriched', completedAt: new Date() });
      await createTestJob(sub4.id, { status: 'enriched', completedAt: new Date() });
      await createTestJob(sub5.id, { status: 'failed', failureReason: 'API error' });

      const counts = await getEnrichmentStatusCounts(TEST_ORG_ID);

      expect(counts.pending).toBe(2);
      expect(counts.enriched).toBe(2);
      expect(counts.failed).toBe(1);
    });
  });

  describe('Lead Filtering', () => {
    beforeEach(async () => {
      // Create diverse test data
      await createTestSubscriber({
        email: 'vp@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/vp',
        jobTitle: 'VP of Sales',
        companyName: 'Acme Corp',
        headcount: 250,
        industry: 'SaaS',
        icpScore: 90,
        syncedToCRM: false,
      });

      await createTestSubscriber({
        email: 'director@yahoo.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/director',
        jobTitle: 'Director of Engineering',
        companyName: 'Tech Startup',
        headcount: 100,
        industry: 'Technology',
        icpScore: 75,
        syncedToCRM: true,
        syncedAt: new Date(),
      });

      await createTestSubscriber({
        email: 'manager@outlook.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/manager',
        jobTitle: 'Engineering Manager',
        companyName: 'Small Co',
        headcount: 20,
        industry: 'Retail',
        icpScore: 45,
        syncedToCRM: false,
      });

      await createTestSubscriber({
        email: 'cto@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/cto',
        jobTitle: 'Chief Technology Officer',
        companyName: 'Acme Corp',
        headcount: 250,
        industry: 'SaaS',
        icpScore: 95,
        syncedToCRM: false,
      });
    });

    it('should filter by minimum ICP score', async () => {
      const result = await filterLeads({ minICPScore: 70 }, TEST_ORG_ID);

      expect(result.totalCount).toBe(3);
      expect(result.leads.length).toBe(3);

      const scores = result.leads.map(l => l.icpScore).sort();
      expect(scores).toEqual([75, 90, 95]);
    });

    it('should filter by company name (case-insensitive partial match)', async () => {
      const result = await filterLeads({ companyName: 'acme' }, TEST_ORG_ID);

      expect(result.totalCount).toBe(2);
      expect(result.leads.length).toBe(2);

      result.leads.forEach(lead => {
        expect(lead.companyName?.toLowerCase()).toContain('acme');
      });
    });

    it('should filter by job title (case-insensitive partial match)', async () => {
      const result = await filterLeads({ jobTitle: 'director' }, TEST_ORG_ID);

      expect(result.totalCount).toBe(1);
      expect(result.leads[0].jobTitle).toBe('Director of Engineering');
    });

    it('should filter by sync status', async () => {
      const syncedResult = await filterLeads({ syncStatus: 'synced' }, TEST_ORG_ID);
      expect(syncedResult.totalCount).toBe(1);
      expect(syncedResult.leads[0].syncedToCRM).toBe(true);

      const unsyncedResult = await filterLeads({ syncStatus: 'unsynced' }, TEST_ORG_ID);
      expect(unsyncedResult.totalCount).toBe(3);
      unsyncedResult.leads.forEach(lead => {
        expect(lead.syncedToCRM).toBe(false);
      });
    });

    it('should combine multiple filters with AND logic', async () => {
      const result = await filterLeads({
        minICPScore: 70,
        companyName: 'acme',
        syncStatus: 'unsynced',
      }, TEST_ORG_ID);

      expect(result.totalCount).toBe(2);
      result.leads.forEach(lead => {
        expect(lead.icpScore).toBeGreaterThanOrEqual(70);
        expect(lead.companyName?.toLowerCase()).toContain('acme');
        expect(lead.syncedToCRM).toBe(false);
      });
    });

    it('should return empty result when no matches', async () => {
      const result = await filterLeads({
        companyName: 'NonExistentCompany',
      }, TEST_ORG_ID);

      expect(result.totalCount).toBe(0);
      expect(result.leads.length).toBe(0);
    });

    it('should handle partial job title matches', async () => {
      const result = await filterLeads({ jobTitle: 'engineering' }, TEST_ORG_ID);

      expect(result.totalCount).toBe(2);
      const titles = result.leads.map(l => l.jobTitle);
      expect(titles).toContain('Director of Engineering');
      expect(titles).toContain('Engineering Manager');
    });
  });

  describe('Hidden Gems Query', () => {
    beforeEach(async () => {
      // Create test data with various ICP scores
      await createTestSubscriber({
        email: 'high1@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/high1',
        icpScore: 95,
      });

      await createTestSubscriber({
        email: 'high2@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/high2',
        icpScore: 85,
      });

      await createTestSubscriber({
        email: 'medium@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/medium',
        icpScore: 65,
      });

      await createTestSubscriber({
        email: 'low@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/low',
        icpScore: 40,
      });

      // Unenriched subscriber (no linkedinUrl)
      await createTestSubscriber({
        email: 'unenriched@gmail.com',
        emailType: 'personal',
        icpScore: 80,
      });
    });

    it('should return only enriched leads with ICP score > 70', async () => {
      const hiddenGems = await getHiddenGems(70, TEST_ORG_ID);

      expect(hiddenGems.length).toBe(2);

      hiddenGems.forEach(gem => {
        expect(gem.icpScore).toBeGreaterThan(70);
        expect(gem.linkedinUrl).not.toBeNull();
      });

      const scores = hiddenGems.map(g => g.icpScore).sort();
      expect(scores).toEqual([85, 95]);
    });

    it('should exclude unenriched subscribers even with high ICP score', async () => {
      const hiddenGems = await getHiddenGems(70, TEST_ORG_ID);

      const emails = hiddenGems.map(g => g.email);
      expect(emails).not.toContain('unenriched@gmail.com');
    });

    it('should support custom threshold', async () => {
      const hiddenGems = await getHiddenGems(90, TEST_ORG_ID);

      expect(hiddenGems.length).toBe(1);
      expect(hiddenGems[0].icpScore).toBe(95);
    });

    it('should include all enrichment fields', async () => {
      await cleanupTestDatabase();

      await createTestSubscriber({
        email: 'complete@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/complete',
        jobTitle: 'VP Engineering',
        companyName: 'Acme Corp',
        companyDomain: 'acme.com',
        headcount: 250,
        industry: 'SaaS',
        icpScore: 90,
      });

      const hiddenGems = await getHiddenGems(70, TEST_ORG_ID);

      expect(hiddenGems.length).toBe(1);
      const gem = hiddenGems[0];

      expect(gem.linkedinUrl).toBe('https://linkedin.com/in/complete');
      expect(gem.jobTitle).toBe('VP Engineering');
      expect(gem.companyName).toBe('Acme Corp');
      expect(gem.companyDomain).toBe('acme.com');
      expect(gem.headcount).toBe(250);
      expect(gem.industry).toBe('SaaS');
    });
  });

  describe('CRM Sync Integration', () => {
    it('should sync leads and update status', async () => {
      const sub1 = await createTestSubscriber({
        email: 'sync1@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/sync1',
        icpScore: 85,
      });

      const sub2 = await createTestSubscriber({
        email: 'sync2@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/sync2',
        icpScore: 90,
      });

      // Sync leads
      const syncResult = await bulkSyncToCRM([sub1.id, sub2.id]);

      expect(syncResult.synced).toBe(2);

      // Verify sync status was updated
      const [updatedSub1] = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.id, sub1.id));

      const [updatedSub2] = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.id, sub2.id));

      expect(updatedSub1.syncedToCRM).toBe(true);
      expect(updatedSub1.syncedAt).not.toBeNull();
      expect(updatedSub2.syncedToCRM).toBe(true);
      expect(updatedSub2.syncedAt).not.toBeNull();
    });

    it('should filter synced vs unsynced leads correctly', async () => {
      const synced = await createTestSubscriber({
        email: 'synced@gmail.com',
        syncedToCRM: true,
        syncedAt: new Date(),
      });

      const unsynced = await createTestSubscriber({
        email: 'unsynced@gmail.com',
        syncedToCRM: false,
      });

      const syncedResult = await filterLeads({ syncStatus: 'synced' });
      expect(syncedResult.totalCount).toBe(1);
      expect(syncedResult.leads[0].id).toBe(synced.id);

      const unsyncedResult = await filterLeads({ syncStatus: 'unsynced' }, TEST_ORG_ID);
      expect(unsyncedResult.totalCount).toBe(1);
      expect(unsyncedResult.leads[0].id).toBe(unsynced.id);
    });
  });

  describe('Complex Query Scenarios', () => {
    it('should handle large dataset efficiently', async () => {
      // Create 100 subscribers
      const subscribers = [];
      for (let i = 0; i < 100; i++) {
        const sub = await createTestSubscriber({
          email: `user${i}@gmail.com`,
          emailType: 'personal',
          linkedinUrl: i % 2 === 0 ? 'https://linkedin.com/in/user' : null,
          companyName: i % 3 === 0 ? 'Acme Corp' : 'Other Corp',
          jobTitle: i % 4 === 0 ? 'VP Engineering' : 'Engineer',
          icpScore: 50 + (i % 50),
        });
        subscribers.push(sub);
      }

      const startTime = Date.now();

      // Test metrics calculation
      const metrics = await calculateDashboardMetrics(TEST_ORG_ID);
      expect(metrics.totalSubscribers).toBe(100);

      // Test filtering
      const filtered = await filterLeads({
        minICPScore: 80,
        companyName: 'acme',
      }, TEST_ORG_ID);
      expect(filtered.totalCount).toBeGreaterThan(0);

      // Test hidden gems
      const gems = await getHiddenGems(70, TEST_ORG_ID);
      expect(gems.length).toBeGreaterThan(0);

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it('should maintain data consistency across queries', async () => {
      // Create test data
      await createTestSubscriber({
        email: 'test1@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/test1',
        icpScore: 85,
      });

      await createTestSubscriber({
        email: 'test2@gmail.com',
        emailType: 'personal',
        linkedinUrl: 'https://linkedin.com/in/test2',
        icpScore: 75,
      });

      // Query using different methods
      const metrics = await calculateDashboardMetrics(TEST_ORG_ID);
      const hiddenGems = await getHiddenGems(70, TEST_ORG_ID);
      const filtered = await filterLeads({ minICPScore: 70 }, TEST_ORG_ID);

      // Verify consistency
      expect(metrics.enrichedCount).toBe(2);
      expect(hiddenGems.length).toBe(2);
      expect(filtered.totalCount).toBe(2);
    });
  });
});
