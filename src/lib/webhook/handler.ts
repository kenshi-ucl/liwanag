import { db } from '@/db';
import { subscribers, webhookLogs, type NewSubscriber, type Subscriber } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { classifyEmail } from '@/lib/email/classifier';
import { parseWebhookPayload, type WebhookPayload } from './schema';
import { validateWebhookSignature, type WebhookValidationResult } from './signature';
import { triggerEnrichmentForSubscriber } from '@/lib/workflow/triggers';
import { nowUTC } from '@/db/timestamp-utils';

/**
 * Result of webhook processing
 */
export interface WebhookProcessingResult {
  success: boolean;
  subscriberId?: string;
  status: 'created' | 'updated';
  error?: string;
}

/**
 * Processes a webhook payload and stores subscriber data
 * 
 * @param rawPayload - The raw webhook payload string
 * @param signature - The webhook signature from headers
 * @param secret - The signing secret for validation
 * @param organizationId - The organization ID for multi-tenant support
 * @returns Processing result with subscriber ID or error
 */
export async function processWebhook(
  rawPayload: string,
  signature: string,
  secret: string,
  organizationId: string = '00000000-0000-4000-8000-000000000001'
): Promise<WebhookProcessingResult> {
  try {
    // Step 1: Validate webhook signature
    const validationResult: WebhookValidationResult = validateWebhookSignature(
      rawPayload,
      signature,
      secret
    );

    // Log webhook attempt
    await db.insert(webhookLogs).values({
      source: 'newsletter',
      payload: JSON.parse(rawPayload),
      signature,
      isValid: validationResult.isValid,
    });

    if (!validationResult.isValid) {
      return {
        success: false,
        status: 'created',
        error: validationResult.error || 'Invalid signature',
      };
    }

    // Step 2: Parse and validate payload
    const payload: WebhookPayload = parseWebhookPayload(rawPayload);

    // Step 3: Classify email
    const emailType = classifyEmail(payload.email);

    // Step 4: Upsert subscriber (insert or update if exists)
    const result = await upsertSubscriber(payload, emailType, organizationId);

    // Step 5: Trigger enrichment workflow for personal emails
    if (result.status === 'created' && emailType === 'personal') {
      try {
        await triggerEnrichmentForSubscriber(result, organizationId);
      } catch (error) {
        // Log error but don't fail the webhook processing
        console.error('Failed to trigger enrichment workflow:', error);
      }
    }

    return {
      success: true,
      subscriberId: result.id,
      status: result.status,
    };
  } catch (error) {
    return {
      success: false,
      status: 'created',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upserts a subscriber record (insert or update if exists)
 * 
 * @param payload - Validated webhook payload
 * @param emailType - Classified email type
 * @param organizationId - The organization ID for multi-tenant support
 * @returns Subscriber record and status
 */
export async function upsertSubscriber(
  payload: WebhookPayload,
  emailType: 'personal' | 'corporate',
  organizationId: string
): Promise<Subscriber & { status: 'created' | 'updated' }> {
  // Check if subscriber already exists
  const existing = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, payload.email))
    .limit(1);

  const subscriberData: NewSubscriber = {
    organizationId,
    email: payload.email,
    emailType,
    source: payload.source,
    rawPayload: payload,
    updatedAt: nowUTC(),
  };

  if (existing.length > 0) {
    // Update existing subscriber
    const [updated] = await db
      .update(subscribers)
      .set(subscriberData)
      .where(eq(subscribers.email, payload.email))
      .returning();

    return {
      ...updated,
      status: 'updated',
    };
  } else {
    // Insert new subscriber
    const [created] = await db
      .insert(subscribers)
      .values(subscriberData)
      .returning();

    return {
      ...created,
      status: 'created',
    };
  }
}
