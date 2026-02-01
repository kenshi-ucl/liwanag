import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { calculateDashboardMetrics } from '@/lib/dashboard/metrics';

/**
 * GET /api/dashboard/metrics
 * 
 * Returns all dashboard metrics in a single response
 * Requirements: 7.1, 7.2, 7.3
 */
export const Route = createFileRoute('/api/dashboard/metrics')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const metrics = await calculateDashboardMetrics();
          
          return json(
            {
              totalSubscribers: metrics.totalSubscribers,
              personalEmailCount: metrics.personalEmailCount,
              enrichedCount: metrics.enrichedCount,
              pendingCount: metrics.pendingCount,
              darkFunnelPercentage: metrics.darkFunnelPercentage,
              totalCreditsUsed: metrics.totalCreditsUsed,
              estimatedPendingCredits: metrics.estimatedPendingCredits,
            },
            { status: 200 }
          );
        } catch (error) {
          console.error('Dashboard metrics calculation error:', error);
          
          return json(
            {
              error: error instanceof Error ? error.message : 'Internal server error',
              code: 'METRICS_CALCULATION_ERROR',
              timestamp: new Date().toISOString(),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
