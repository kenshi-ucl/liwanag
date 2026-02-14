import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { db } from '@/db';
import { subscribers, enrichmentJobs } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const Route = createFileRoute('/api/leads/delete')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { subscriberIds } = body;

          if (!subscriberIds || !Array.isArray(subscriberIds) || subscriberIds.length === 0) {
            return json(
              {
                error: 'Invalid request: subscriberIds array is required',
                code: 'INVALID_REQUEST',
              },
              { status: 400 }
            );
          }

          // Delete associated enrichment jobs first (foreign key constraint)
          await db
            .delete(enrichmentJobs)
            .where(inArray(enrichmentJobs.subscriberId, subscriberIds));

          // Delete subscribers
          const deletedSubscribers = await db
            .delete(subscribers)
            .where(inArray(subscribers.id, subscriberIds))
            .returning();

          return json(
            {
              success: true,
              deletedCount: deletedSubscribers.length,
              deletedIds: deletedSubscribers.map(s => s.id),
            },
            { status: 200 }
          );
        } catch (error) {
          console.error('Delete error:', error);

          return json(
            {
              error: error instanceof Error ? error.message : 'Failed to delete leads',
              code: 'DELETE_FAILED',
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
