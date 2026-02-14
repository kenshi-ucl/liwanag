import { db } from '@/db';
import { enrichmentJobs, subscribers } from '@/db/schema';
import type { NewEnrichmentJob } from '@/db/schema';
import { eq } from 'drizzle-orm';

export type EmailType = 'personal' | 'mobile' | 'corporate';

/**
 * Estimate credits required for enrichment based on email type
 * - Personal email: 3 credits (reverse email lookup)
 * - Mobile: 10 credits
 * - Corporate: 1 credit (contact enrichment)
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
      return 1; // Default to corporate email cost
  }
}

/**
 * Create an enrichment job for a subscriber
 * Creates jobs for all email subscribers (personal and corporate)
 * 
 * @param subscriberId - The subscriber ID
 * @param organizationId - The organization ID for multi-tenant support
 * @param emailType - The email type (default: 'corporate')
 */
export async function createEnrichmentJob(
  subscriberId: string,
  organizationId: string,
  emailType: EmailType = 'corporate'
): Promise<string> {
  const credits = estimateCredits(emailType);

  const newJob: NewEnrichmentJob = {
    organizationId,
    subscriberId,
    status: 'pending',
    estimatedCredits: credits,
    retryCount: 0,
  };

  const [job] = await db.insert(enrichmentJobs).values(newJob).returning();

  return job.id;
}

/**
 * Create enrichment job when a new subscriber is added
 * This is the main entry point for automatic job creation
 * 
 * @param subscriberId - The subscriber ID
 * @param organizationId - The organization ID for multi-tenant support
 */
export async function createEnrichmentJobForSubscriber(
  subscriberId: string,
  organizationId: string
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

  // Create job for all email types (personal and corporate)
  const emailType = subscriber.emailType === 'personal' ? 'personal' : 'corporate';
  return createEnrichmentJob(subscriberId, organizationId, emailType);
}
