import { z } from 'zod';

/**
 * Webhook payload validation schema
 */
export const webhookPayloadSchema = z.object({
  email: z.string().email('Invalid email address'),
  source: z.string().min(1, 'Source is required'),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime('Invalid timestamp format'),
});

/**
 * Type for validated webhook payload
 */
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

/**
 * Parses and validates a raw webhook payload
 * 
 * @param rawPayload - The raw payload string from the webhook
 * @returns Validated webhook payload
 * @throws ZodError if validation fails
 */
export function parseWebhookPayload(rawPayload: string): WebhookPayload {
  const parsed = JSON.parse(rawPayload);
  return webhookPayloadSchema.parse(parsed);
}
