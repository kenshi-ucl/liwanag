import { useRouter } from '@tanstack/react-router';
import { Loader2, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DashboardMetrics {
  totalSubscribers: number;
  personalEmailCount: number;
  enrichedCount: number;
  pendingCount: number;
  darkFunnelPercentage: number;
  totalCreditsUsed: number;
  estimatedPendingCredits: number;
}

/**
 * Dark Funnel Meter Component
 * 
 * Displays the percentage of personal email subscribers that have been enriched
 * with a visual progress indicator. Updates in real-time using polling.
 * 
 * Requirements: 7.1, 7.6
 */
export function DarkFunnelMeter() {
  const router = useRouter();
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/dashboard/metrics');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard metrics');
        }
        const metrics = await response.json();
        setData(metrics);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
        <div className="text-center text-red-600">
          <p className="font-semibold">Failed to load metrics</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const percentage = data?.darkFunnelPercentage ?? 0;
  const enrichedCount = data?.enrichedCount ?? 0;
  const personalEmailCount = data?.personalEmailCount ?? 0;

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg shadow-sm border border-cyan-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-cyan-600" />
        <h2 className="text-xl font-semibold text-slate-900">
          Dark Funnel Meter
        </h2>
      </div>

      <div className="flex items-end gap-8">
        {/* Percentage Display */}
        <div>
          <div className="text-6xl font-bold text-cyan-600">
            {percentage.toFixed(1)}%
          </div>
          <p className="text-sm text-slate-600 mt-2">
            of personal emails enriched
          </p>
        </div>

        {/* Visual Progress Bar */}
        <div className="flex-1">
          <div className="relative h-12 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out flex items-center justify-end pr-4"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            >
              {percentage > 10 && (
                <span className="text-white font-semibold text-sm">
                  {enrichedCount} / {personalEmailCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Additional Context */}
      <div className="mt-6 pt-6 border-t border-cyan-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">Enriched:</span>
            <span className="ml-2 font-semibold text-slate-900">
              {enrichedCount}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Pending:</span>
            <span className="ml-2 font-semibold text-slate-900">
              {data?.pendingCount ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
