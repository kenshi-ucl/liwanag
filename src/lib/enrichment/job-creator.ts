import { db } from '@/db';
import { enrichmentJobs, subscribers } from '@/db/schema';
import type { NewEnrichmentJob } from '@/db/schema';
import { eq } from 'drizzle-orm';

export type EmailType = 'personal' | 'mobile' | 'corporate';

/**
 * Estimate credits required for enrichment based on email type
 * - Personal email: 3 credits
 * - Mobile: 10 credits
 * - Corporate: 1 credit (but we don't enrich corporate emails)
 */
export function estimateCredits(emailType: EmailType): number {
  switch (emailType) {
    case 'personal':
      return 3;
    case 'mobile':
      return 10;
    case 'corporate':
      return 1;
    default:
      return 3; // Default to personal email cost
  }
}

/**
 * Create an enrichment job for a subscriber
 * Only creates jobs for personal email subscribers
 */
export async function createEnrichmentJob(
  subscriberId: string,
  emailType: EmailType = 'personal'
): Promise<string> {
  // Only create enrichment jobs for personal emails
  if (emailType === 'corporate') {
    throw new Error('Cannot create enrichment job for corporate email');
  }

  const credits = estimateCredits(emailType);

  const newJob: NewEnrichmentJob = {
    subscriberId,
    status: 'pending',
    estimatedCredits: credits,
    retryCount: 0,
  };

  const [job] = await db.insert(enrichmentJobs).values(newJob).returning();

  return job.id;
}

/**
 * Create enrichment job when a new personal email subscriber is added
 * This is the main entry point for automatic job creation
 */
export async function createEnrichmentJobForSubscriber(
  subscriberId: string
): Promise<string | null> {
  // Fetch subscriber to check email type
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, subscriberId))
    .limit(1);

  if (!subscriber) {
    throw new Error(`Subscriber not found: ${subscriberId}`);
  }

  // Only create job for personal emails
  if (subscriber.emailType !== 'personal') {
    return null;
  }

  return createEnrichmentJob(subscriberId, 'personal');
}
