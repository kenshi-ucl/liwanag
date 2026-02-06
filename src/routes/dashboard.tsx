import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { BarChart3, Sparkles } from 'lucide-react';
import { DarkFunnelMeter } from '@/components/dashboard/DarkFunnelMeter';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { HiddenGemsList } from '@/components/dashboard/HiddenGemsList';
import { LeadFilters } from '@/components/dashboard/LeadFilters';
import { calculateDashboardMetrics } from '@/lib/dashboard/metrics';
import { getHiddenGems as fetchHiddenGems } from '@/lib/dashboard/lead-filter';

// Server function to fetch dashboard metrics - calls database directly
const getDashboardMetrics = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const metrics = await calculateDashboardMetrics();
    return {
      totalSubscribers: metrics.totalSubscribers,
      enrichedCount: metrics.enrichedCount,
      personalEmailCount: metrics.personalEmailCount,
      pendingCount: metrics.pendingCount,
      darkFunnelPercentage: metrics.darkFunnelPercentage,
      totalCreditsUsed: metrics.totalCreditsUsed,
      estimatedPendingCredits: metrics.estimatedPendingCredits,
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    // Return empty data on error
    return {
      totalSubscribers: 0,
      enrichedCount: 0,
      personalEmailCount: 0,
      pendingCount: 0,
      darkFunnelPercentage: 0,
      totalCreditsUsed: 0,
      estimatedPendingCredits: 0,
    };
  }
});

// Server function to fetch hidden gems - calls database directly
const getHiddenGems = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const hiddenGems = await fetchHiddenGems(70); // ICP score > 70
    // Serialize the data to ensure proper JSON serialization
    return {
      leads: hiddenGems.map(lead => ({
        ...lead,
        rawPayload: (lead.rawPayload ?? null) as Record<string, any> | null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        syncedAt: lead.syncedAt?.toISOString() ?? null,
      })),
      totalCount: hiddenGems.length,
    };
  } catch (error) {
    console.error('Error fetching hidden gems:', error);
    return {
      leads: [],
      totalCount: 0,
    };
  }
});

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
  loader: async () => {
    const [metrics, hiddenGems] = await Promise.all([
      getDashboardMetrics(),
      getHiddenGems(),
    ]);
    return { metrics, hiddenGems };
  },
});

function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-cyan-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Dark Funnel Intelligence
              </h1>
              <p className="text-sm text-slate-600">
                Uncover hidden high-value leads from personal email subscriptions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Dark Funnel Meter */}
        <div className="mb-8">
          <DarkFunnelMeter />
        </div>

        {/* Metrics Cards */}
        <div className="mb-8">
          <MetricsCards />
        </div>

        {/* Hidden Gems Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-semibold text-slate-900">
              Hidden Gems
            </h2>
            <span className="text-sm text-slate-600">
              (ICP Score &gt; 70)
            </span>
          </div>
          <HiddenGemsList />
        </div>

        {/* All Leads with Filters */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            All Leads
          </h2>
          <LeadFilters />
        </div>
      </div>
    </div>
  );
}
