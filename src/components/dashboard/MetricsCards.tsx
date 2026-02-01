import { Users, Mail, CheckCircle, Clock, CreditCard, Coins, Loader2 } from 'lucide-react';
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

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  color: 'blue' | 'purple' | 'green' | 'amber' | 'cyan' | 'slate';
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

function MetricCard({ icon, label, value, subtext, color }: MetricCardProps) {
  return (
    <div className={`rounded-lg shadow-sm border p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80 mb-1">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtext && (
            <p className="text-xs opacity-70 mt-1">{subtext}</p>
          )}
        </div>
        <div className="opacity-80">{icon}</div>
      </div>
    </div>
  );
}

/**
 * Metrics Dashboard Cards Component
 * 
 * Displays key metrics in card format:
 * - Total subscribers
 * - Personal email count
 * - Enriched count
 * - Pending count
 * - Credit usage (consumed and estimated)
 * 
 * Updates in real-time using polling.
 * 
 * Requirements: 7.2, 7.3, 7.6
 */
export function MetricsCards() {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex items-center justify-center"
          >
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="text-center text-red-600">
          <p className="font-semibold">Failed to load metrics</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const metrics = data!;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Subscribers */}
      <MetricCard
        icon={<Users className="w-8 h-8" />}
        label="Total Subscribers"
        value={metrics.totalSubscribers.toLocaleString()}
        color="blue"
      />

      {/* Personal Emails */}
      <MetricCard
        icon={<Mail className="w-8 h-8" />}
        label="Personal Emails"
        value={metrics.personalEmailCount.toLocaleString()}
        subtext="Dark funnel signals"
        color="purple"
      />

      {/* Enriched Count */}
      <MetricCard
        icon={<CheckCircle className="w-8 h-8" />}
        label="Enriched"
        value={metrics.enrichedCount.toLocaleString()}
        subtext={`${metrics.darkFunnelPercentage.toFixed(1)}% of personal emails`}
        color="green"
      />

      {/* Pending Count */}
      <MetricCard
        icon={<Clock className="w-8 h-8" />}
        label="Pending Enrichment"
        value={metrics.pendingCount.toLocaleString()}
        color="amber"
      />

      {/* Credits Used */}
      <MetricCard
        icon={<CreditCard className="w-8 h-8" />}
        label="Credits Consumed"
        value={metrics.totalCreditsUsed.toLocaleString()}
        subtext="FullEnrich API credits"
        color="cyan"
      />

      {/* Estimated Pending Credits */}
      <MetricCard
        icon={<Coins className="w-8 h-8" />}
        label="Estimated Pending"
        value={metrics.estimatedPendingCredits.toLocaleString()}
        subtext="Credits for pending jobs"
        color="slate"
      />
    </div>
  );
}
