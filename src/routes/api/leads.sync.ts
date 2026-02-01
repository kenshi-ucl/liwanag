import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { bulkSyncToCRM } from '@/lib/crm/sync';
import { z } from 'zod';

/**
 * Request body schema for CRM sync
 */
const syncRequestSchema = z.object({
  subscriberIds: z.array(z.string().uuid()).min(1, 'At least one subscriber ID is required'),
});

/**
 * POST /api/leads/sync
 * 
 * Sync leads to CRM
 * Requirements: 9.1, 9.4
 * 
 * Request Body:
 * {
 *   subscriberIds: string[] - Array of subscriber UUIDs to sync
 * }
 * 
 * Response:
 * {
 *   synced: number - Count of newly synced subscribers
 *   alreadySynced: number - Count of already-synced subscribers
 *   notFound: number - Count of non-existent subscriber IDs
 * }
 */
export const Route = createFileRoute('/api/leads/sync')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Parse request body
          const body = await request.json();
          
          // Validate request body
          const validationResult = syncRequestSchema.safeParse(body);
          
          if (!validationResult.success) {
            return json(
              {
                error: 'Invalid request body',
                code: 'INVALID_REQUEST_BODY',
                details: validationResult.error.issues,
                timestamp: new Date().toISOString(),
              },
              { status: 400 }
            );
          }
          
          const { subscriberIds } = validationResult.data;
          
          // Perform bulk sync
          const result = await bulkSyncToCRM(subscriberIds);
          
          // Return sync result
          return json(
            {
              synced: result.synced,
              alreadySynced: result.alreadySynced,
              notFound: result.notFound,
            },
            { status: 200 }
          );
        } catch (error) {
          console.error('CRM sync error:', error);
          
          return json(
            {
              error: error instanceof Error ? error.message : 'Internal server error',
              code: 'SYNC_ERROR',
              timestamp: new Date().toISOString(),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
