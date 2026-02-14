import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { processEnrichmentWebhook } from '@/lib/enrichment/webhook-receiver';

export const Route = createFileRoute('/api/webhooks/enrichment')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Get signature from headers (optional - FullEnrich may not send it)
          const signature = request.headers.get('X-Webhook-Signature');
          
          // Get raw body
          const rawPayload = await request.text();

          // Process enrichment webhook (skip signature validation if not provided)
          let result;
          if (signature) {
            result = await processEnrichmentWebhook(rawPayload, signature);
          } else {
            // FullEnrich doesn't send signature, so we skip validation
            console.warn('Webhook received without signature - processing anyway');
            result = await processEnrichmentWebhook(rawPayload, '');
          }

          if (!result.success) {
            return json(
              {
                error: result.error || 'Webhook processing failed',
                code: 'PROCESSING_FAILED',
                timestamp: new Date().toISOString(),
              },
              { status: 400 }
            );
          }

          // Return success response
          return json(
            {
              processed: result.processed,
              status: 'success',
              timestamp: new Date().toISOString(),
            },
            { status: 200 }
          );
        } catch (error) {
          console.error('Enrichment webhook error:', error);

          return json(
            {
              error: error instanceof Error ? error.message : 'Internal server error',
              code: 'INTERNAL_ERROR',
              timestamp: new Date().toISOString(),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
