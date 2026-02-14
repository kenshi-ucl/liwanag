import { Loader2, Linkedin, Building2, Users as UsersIcon, Briefcase, CheckCircle2, ExternalLink, Sparkles, Copy, X, DollarSign, Trash2 } from 'lucide-react';
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

interface GeneratedOutreach {
  subject: string;
  opener: string;
  fullEmail: string;
}

interface LeadCardProps {
  lead: Subscriber;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
  isSyncing: boolean;
  isDeleting: boolean;
}

/**
 * Calculate estimated pipeline value based on company headcount
 */
function estimatePipelineValue(headcount: number | null): number {
  if (!headcount) return 25000;
  if (headcount >= 1000) return 100000;
  if (headcount >= 500) return 75000;
  if (headcount >= 200) return 50000;
  if (headcount >= 100) return 35000;
  if (headcount >= 50) return 25000;
  return 15000;
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value}`;
}

function LeadCard({ lead, onSync, onDelete, isSyncing, isDeleting }: LeadCardProps) {
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
  const [outreach, setOutreach] = useState<GeneratedOutreach | null>(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const pipelineValue = estimatePipelineValue(lead.headcount);

  const handleGenerateOutreach = async () => {
    if (!lead.jobTitle || !lead.companyName) return;

    setIsGeneratingOutreach(true);
    try {
      const response = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: lead.jobTitle,
          companyName: lead.companyName,
          industry: lead.industry,
          headcount: lead.headcount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOutreach(data);
        setShowOutreachModal(true);
      }
    } catch (error) {
      console.error('Failed to generate outreach:', error);
    } finally {
      setIsGeneratingOutreach(false);
    }
  };

  const handleCopy = async () => {
    if (outreach) {
      await navigator.clipboard.writeText(outreach.fullEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative">
        {/* Pipeline Value Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
          <DollarSign className="w-3 h-3" />
          {formatCurrency(pipelineValue)} pipeline
        </div>

        {/* Header with ICP Score */}
        <div className="flex items-start gap-3 mb-4 pr-24">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {lead.icpScore}
          </div>
          <div className="min-w-0">
            {/* Email display - no blur */}
            <div className="group">
              <h3 className="font-semibold text-slate-900 truncate">
                {lead.email}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-slate-500">ICP: {lead.icpScore}/100</p>
              {lead.syncedToCRM && (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Synced</span>
                </div>
              )}
            </div>
          </div>
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

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          {/* Generate Outreach Button */}
          {lead.jobTitle && lead.companyName && (
            <button
              onClick={handleGenerateOutreach}
              disabled={isGeneratingOutreach}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white text-sm rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              {isGeneratingOutreach ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI Outreach
                </>
              )}
            </button>
          )}

          {/* Sync Button */}
          {!lead.syncedToCRM && (
            <button
              onClick={() => onSync(lead.id)}
              disabled={isSyncing}
              className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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

          {/* Delete Button */}
          {showDeleteConfirm ? (
            <div className="flex gap-2">
              <button
                onClick={() => onDelete(lead.id)}
                disabled={isDeleting}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs rounded-lg font-medium transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Confirm'
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete lead"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Outreach Modal */}
      {showOutreachModal && outreach && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-purple-500 to-purple-600">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold">AI-Generated Outreach</h3>
              </div>
              <button
                onClick={() => setShowOutreachModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Subject Line */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Subject Line
                </label>
                <p className="mt-1 p-3 bg-slate-50 rounded-lg text-slate-900 font-medium">
                  {outreach.subject}
                </p>
              </div>

              {/* Email Body */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Email Body
                </label>
                <div className="mt-1 p-4 bg-slate-50 rounded-lg text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {outreach.fullEmail}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowOutreachModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hidden Gems List Component
 * 
 * Displays enriched leads with ICP score > 70.
 * Shows all enrichment fields (LinkedIn, job title, company, etc.)
 * Includes visual indicators for synced leads.
 * Features email blur/reveal effect and AI outreach generation.
 * 
 * Requirements: 7.4, 7.5, 9.3
 */
export function HiddenGemsList() {
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch('/api/leads/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriberIds: [id] }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      // Refetch data after successful delete
      await fetchHiddenGems();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete lead. Please try again.');
    } finally {
      setDeletingId(null);
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

  // Calculate total pipeline value
  const totalPipeline = leads.reduce((sum, lead) => sum + estimatePipelineValue(lead.headcount), 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-600">
          Found {leads.length} high-value lead{leads.length !== 1 ? 's' : ''}
        </span>
        <span className="text-sm font-semibold text-amber-600 flex items-center gap-1">
          <DollarSign className="w-4 h-4" />
          {formatCurrency(totalPipeline)} total pipeline
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onSync={handleSync}
            onDelete={handleDelete}
            isSyncing={syncingId === lead.id}
            isDeleting={deletingId === lead.id}
          />
        ))}
      </div>
    </div>
  );
}
