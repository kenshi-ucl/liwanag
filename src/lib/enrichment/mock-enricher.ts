/**
 * Mock enrichment for demo purposes
 * Simulates FullEnrich API responses for testing without webhook setup
 */

import { db } from '@/db';
import { subscribers, enrichmentJobs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateICPScore } from '@/lib/icp/scorer';

interface MockEnrichmentData {
  linkedinUrl: string;
  jobTitle: string;
  companyName: string;
  companyDomain: string;
  headcount: number;
  industry: string;
}

// Mock data for common personal email domains
const mockEnrichmentDatabase: Record<string, MockEnrichmentData> = {
  'sarah.jenkins.dev@gmail.com': {
    linkedinUrl: 'https://linkedin.com/in/sarahjenkins',
    jobTitle: 'Chief Technology Officer',
    companyName: 'TechCorp Solutions',
    companyDomain: 'techcorp.com',
    headcount: 500,
    industry: 'Enterprise Software',
  },
  'mike.chen.tech@gmail.com': {
    linkedinUrl: 'https://linkedin.com/in/mikechen',
    jobTitle: 'VP of Engineering',
    companyName: 'DataScale Inc',
    companyDomain: 'datascale.io',
    headcount: 300,
    industry: 'Data Analytics',
  },
  'jessica.rodriguez@protonmail.com': {
    linkedinUrl: 'https://linkedin.com/in/jessicarodriguez',
    jobTitle: 'Director of Product',
    companyName: 'CloudNine',
    companyDomain: 'cloudnine.com',
    headcount: 200,
    industry: 'Cloud Infrastructure',
  },
  'david.kim.eng@yahoo.com': {
    linkedinUrl: 'https://linkedin.com/in/davidkim',
    jobTitle: 'Senior Software Engineer',
    companyName: 'StartupXYZ',
    companyDomain: 'startupxyz.com',
    headcount: 50,
    industry: 'Technology',
  },
  'emily.watson.growth@gmail.com': {
    linkedinUrl: 'https://linkedin.com/in/emilywatson',
    jobTitle: 'Head of Growth',
    companyName: 'ScaleUp Inc',
    companyDomain: 'scaleup.com',
    headcount: 150,
    industry: 'Marketing Tech',
  },
};

/**
 * Generate mock enrichment data for any email
 * Uses predefined data if available, otherwise generates realistic data
 */
function generateMockEnrichment(email: string): MockEnrichmentData {
  // Check if we have predefined data
  if (mockEnrichmentDatabase[email.toLowerCase()]) {
    return mockEnrichmentDatabase[email.toLowerCase()];
  }

  // Generate realistic mock data based on email
  const name = email.split('@')[0].replace(/[._-]/g, ' ');
  
  const titles = [
    'VP of Engineering',
    'Director of Product',
    'Head of Growth',
    'Chief Technology Officer',
    'Senior Software Engineer',
    'Product Manager',
    'Engineering Manager',
    'Director of Engineering',
  ];
  
  const companies = [
    'TechVentures',
    'InnovateCo',
    'DataDynamics',
    'CloudScale',
    'GrowthLabs',
    'DevOps Solutions',
    'AI Innovations',
    'SaaS Platform Inc',
  ];
  
  const industries = [
    'Enterprise Software',
    'Data Analytics',
    'Cloud Infrastructure',
    'Marketing Tech',
    'Developer Tools',
    'AI/ML',
    'Cybersecurity',
    'FinTech',
  ];
  
  const headcounts = [50, 100, 150, 200, 300, 500, 1000];
  
  // Use email hash for consistent random selection
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return {
    linkedinUrl: `https://linkedin.com/in/${name.replace(/\s/g, '')}`,
    jobTitle: titles[hash % titles.length],
    companyName: companies[hash % companies.length],
    companyDomain: `${companies[hash % companies.length].toLowerCase().replace(/\s/g, '')}.com`,
    headcount: headcounts[hash % headcounts.length],
    industry: industries[hash % industries.length],
  };
}

/**
 * Mock enrichment processor
 * Simulates the enrichment workflow without requiring webhook setup
 * Only enriches CORPORATE emails - personal emails are skipped
 */
export async function mockEnrichSubscriber(subscriberId: string): Promise<void> {
  // Get subscriber
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, subscriberId))
    .limit(1);

  if (!subscriber) {
    throw new Error(`Subscriber not found: ${subscriberId}`);
  }

  // Only enrich CORPORATE emails
  // Personal emails (gmail, yahoo, etc.) should NOT be enriched
  if (subscriber.emailType !== 'corporate') {
    console.log(`Skipping mock enrichment for ${subscriber.emailType} email: ${subscriber.email}`);
    return;
  }

  // Generate mock enrichment data
  const enrichmentData = generateMockEnrichment(subscriber.email);

  // Update subscriber with enriched data
  await db
    .update(subscribers)
    .set({
      linkedinUrl: enrichmentData.linkedinUrl,
      jobTitle: enrichmentData.jobTitle,
      companyName: enrichmentData.companyName,
      companyDomain: enrichmentData.companyDomain,
      headcount: enrichmentData.headcount,
      industry: enrichmentData.industry,
      updatedAt: new Date(),
    })
    .where(eq(subscribers.id, subscriberId));

  // Fetch updated subscriber to calculate ICP score
  const [updatedSubscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, subscriberId))
    .limit(1);

  if (updatedSubscriber) {
    // Calculate ICP score
    const icpScore = calculateICPScore(updatedSubscriber);

    // Update subscriber with ICP score
    await db
      .update(subscribers)
      .set({
        icpScore,
        updatedAt: new Date(),
      })
      .where(eq(subscribers.id, subscriberId));
  }

  // Update enrichment job status if exists
  const [job] = await db
    .select()
    .from(enrichmentJobs)
    .where(
      and(
        eq(enrichmentJobs.subscriberId, subscriberId),
        eq(enrichmentJobs.status, 'pending')
      )
    )
    .limit(1);

  if (job) {
    await db
      .update(enrichmentJobs)
      .set({
        status: 'enriched',
        actualCredits: 3, // Mock credit usage
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(enrichmentJobs.id, job.id));
  }
}

/**
 * Check if mock enrichment should be used
 * Returns true when explicitly enabled or when webhook URL is not configured
 */
export function shouldUseMockEnrichment(): boolean {
  // Explicit override via environment variable
  const useMock = process.env.USE_MOCK_ENRICHMENT;
  if (useMock !== undefined) {
    return useMock === 'true';
  }
  
  // Check webhook URL validity
  const webhookUrl = process.env.FULLENRICH_WEBHOOK_URL || '';
  
  // Use mock if webhook URL is clearly invalid
  if (
    webhookUrl === '' ||
    webhookUrl.includes('your-domain.com') ||
    webhookUrl.includes('example.com')
  ) {
    return true;
  }
  
  // Default to real API if webhook URL is configured
  return false;
}
