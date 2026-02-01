import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { BarChart3 } from 'lucide-react';
import { DarkFunnelMeter } from '@/components/dashboard/DarkFunnelMeter';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { HiddenGemsList } from '@/components/dashboard/HiddenGemsList';
import { LeadFilters } from '@/components/dashboard/LeadFilters';

// Server function to fetch dashboard metrics
const getDashboardMetrics = createServerFn({ method: 'GET' }).handler(async () => {
  const response = await fetch('http://localhost:3000/api/dashboard/metrics');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard metrics');
  }
  return response.json();
});

// Server function to fetch hidden gems
const getHiddenGems = createServerFn({ method: 'GET' }).handler(async () => {
  const response = await fetch('http://localhost:3000/api/leads?minICPScore=71');
  if (!response.ok) {
    throw new Error('Failed to fetch hidden gems');
  }
  return response.json();
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
