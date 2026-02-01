import { useRouter } from '@tanstack/react-router';
import { Loader2, Linkedin, Building2, Users as UsersIcon, Briefcase, CheckCircle2, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Subscriber {
  id: string;
  email: string;
  emailType: string;
  source: string | null;
  linkedinUrl: string | null;
  jobTitle: string | null;
  companyName: string | null;
  companyDomain: string | null;
  headcount: number | null;
  industry: string | null;
  icpScore: number | null;
  syncedToCRM: boolean;
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LeadCardProps {
  lead: Subscriber;
  onSync: (id: string) => void;
  isSyncing: boolean;
}

function LeadCard({ lead, onSync, isSyncing }: LeadCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      {/* Header with ICP Score and Sync Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
            {lead.icpScore}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{lead.email}</h3>
            <p className="text-sm text-slate-500">ICP Score: {lead.icpScore}/100</p>
          </div>
        </div>
        
        {lead.syncedToCRM && (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Synced</span>
          </div>
        )}
      </div>

      {/* Enrichment Details */}
      <div className="space-y-3">
        {/* Job Title */}
        {lead.jobTitle && (
          <div className="flex items-start gap-2">
            <Briefcase className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Job Title</p>
              <p className="text-sm font-medium text-slate-900">{lead.jobTitle}</p>
            </div>
          </div>
        )}

        {/* Company */}
        {lead.companyName && (
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Company</p>
              <p className="text-sm font-medium text-slate-900">{lead.companyName}</p>
              {lead.companyDomain && (
                <p className="text-xs text-slate-500">{lead.companyDomain}</p>
              )}
            </div>
          </div>
        )}

        {/* Headcount */}
        {lead.headcount && (
          <div className="flex items-start gap-2">
            <UsersIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Company Size</p>
              <p className="text-sm font-medium text-slate-900">
                {lead.headcount.toLocaleString()} employees
              </p>
            </div>
          </div>
        )}

        {/* Industry */}
        {lead.industry && (
          <div className="flex items-start gap-2">
            <Briefcase className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Industry</p>
              <p className="text-sm font-medium text-slate-900">{lead.industry}</p>
            </div>
          </div>
        )}

        {/* LinkedIn */}
        {lead.linkedinUrl && (
          <div className="flex items-start gap-2">
            <Linkedin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <a
                href={lead.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View LinkedIn Profile
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Sync Button */}
      {!lead.syncedToCRM && (
        <button
          onClick={() => onSync(lead.id)}
          disabled={isSyncing}
          className="mt-4 w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing...
            </>
          ) : (
            'Sync to CRM'
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Hidden Gems List Component
 * 
 * Displays enriched leads with ICP score > 70.
 * Shows all enrichment fields (LinkedIn, job title, company, etc.)
 * Includes visual indicators for synced leads.
 * 
 * Requirements: 7.4, 7.5, 9.3
 */
export function HiddenGemsList() {
  const router = useRouter();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [data, setData] = useState<{ leads: Subscriber[]; totalCount: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHiddenGems = async () => {
    try {
      const response = await fetch('/api/leads?minICPScore=71');
      if (!response.ok) {
        throw new Error('Failed to fetch hidden gems');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHiddenGems();
    const interval = setInterval(fetchHiddenGems, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const response = await fetch('/api/leads/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriberIds: [id] }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync lead');
      }

      // Refetch data after successful sync
      await fetchHiddenGems();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncingId(null);
    }
  };

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
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="text-center text-red-600">
          <p className="font-semibold">Failed to load hidden gems</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const leads = data?.leads ?? [];

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center text-slate-500">
          <p className="font-medium">No hidden gems yet</p>
          <p className="text-sm mt-1">
            Enriched leads with ICP score &gt; 70 will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 text-sm text-slate-600">
        Found {leads.length} high-value lead{leads.length !== 1 ? 's' : ''}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onSync={handleSync}
            isSyncing={syncingId === lead.id}
          />
        ))}
      </div>
    </div>
  );
}
