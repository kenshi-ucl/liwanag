import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { processWebhook } from '@/lib/webhook/handler';
import { env } from '@/config/env';

export const Route = createFileRoute('/api/webhooks/subscribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Get signature from headers
          const signature = request.headers.get('X-Webhook-Signature');
          
          if (!signature) {
            return json(
              {
                error: 'Missing webhook signature',
                code: 'MISSING_SIGNATURE',
                timestamp: new Date().toISOString(),
              },
              { status: 401 }
            );
          }

          // Get raw body
          const rawPayload = await request.text();

          // Process webhook with newsletter secret
          const result = await processWebhook(
            rawPayload,
            signature,
            env.NEWSLETTER_WEBHOOK_SECRET
          );

          if (!result.success) {
            return json(
              {
                error: result.error || 'Webhook processing failed',
                code: 'INVALID_SIGNATURE',
                timestamp: new Date().toISOString(),
              },
              { status: 401 }
            );
          }

          // Return success response with subscriber ID
          return json(
            {
              subscriberId: result.subscriberId,
              status: result.status,
            },
            { status: 200 }
          );
        } catch (error) {
          console.error('Webhook processing error:', error);
          
          return json(
            {
              error: error instanceof Error ? error.message : 'Internal server error',
              code: 'PROCESSING_ERROR',
              timestamp: new Date().toISOString(),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
