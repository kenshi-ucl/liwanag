import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Result of webhook signature validation
 */
export interface WebhookValidationResult {
  isValid: boolean;
  signature: string;
  error?: string;
}

/**
 * Validates a webhook signature using HMAC-SHA256
 * 
 * @param payload - The raw webhook payload as a string
 * @param signature - The signature from the webhook header
 * @param secret - The signing secret from environment configuration
 * @returns Validation result with isValid flag and optional error message
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): WebhookValidationResult {
  try {
    // Generate HMAC-SHA256 hash of the payload
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    
    // Ensure both buffers are the same length before comparison
    if (signatureBuffer.length !== expectedBuffer.length) {
      return {
        isValid: false,
        signature,
        error: 'Signature length mismatch',
      };
    }
    
    const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);
    
    return {
      isValid,
      signature,
      error: isValid ? undefined : 'Invalid signature',
    };
  } catch (error) {
    return {
      isValid: false,
      signature,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}
