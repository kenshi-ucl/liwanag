import { CheckCircle2, Loader2, ExternalLink, Linkedin, Trash2 } from 'lucide-react';
import { useState } from 'react';

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

interface LeadTableProps {
  leads: Subscriber[];
  selectedLeads: Set<string>;
  onSelectAll: () => void;
  onSelectLead: (id: string) => void;
  onRefresh: () => Promise<void>;
}

/**
 * Lead Table Component
 * 
 * Displays leads in a table format with:
 * - Individual "Sync to CRM" buttons
 * - Bulk sync checkbox selection
 * - Disabled sync for already-synced leads
 * - Visual indicators for synced status
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */
export function LeadTable({ leads, selectedLeads, onSelectAll, onSelectLead, onRefresh }: LeadTableProps) {
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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

      await onRefresh();
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

      await onRefresh();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete lead. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center text-slate-500">
          <p className="font-medium">No leads found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  const unsyncedLeads = leads.filter(lead => !lead.syncedToCRM);
  const allUnsyncedSelected = unsyncedLeads.length > 0 &&
    unsyncedLeads.every(lead => selectedLeads.has(lead.id));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allUnsyncedSelected}
                  onChange={onSelectAll}
                  disabled={unsyncedLeads.length === 0}
                  className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500 disabled:opacity-50"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Job Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Headcount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Industry
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                ICP Score
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                LinkedIn
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Delete
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedLeads.has(lead.id)}
                    onChange={() => onSelectLead(lead.id)}
                    disabled={lead.syncedToCRM}
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500 disabled:opacity-50"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="group cursor-pointer">
                    <div className={`text-sm font-medium text-slate-900`}>
                      {lead.email}
                    </div>
                    <div className="text-xs text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {lead.source && <span>{lead.source}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-900">
                    {lead.jobTitle || <span className="text-slate-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-900">
                    {lead.companyName || <span className="text-slate-400">—</span>}
                  </div>
                  {lead.companyDomain && (
                    <div className="text-xs text-slate-500">{lead.companyDomain}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-900">
                    {lead.headcount ? lead.headcount.toLocaleString() : <span className="text-slate-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-900">
                    {lead.industry || <span className="text-slate-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {lead.icpScore !== null ? (
                    <span
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${lead.icpScore >= 70
                        ? 'bg-green-100 text-green-700'
                        : lead.icpScore >= 40
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                        }`}
                    >
                      {lead.icpScore}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {lead.linkedinUrl ? (
                    <a
                      href={lead.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <Linkedin className="w-4 h-4" />
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {lead.syncedToCRM ? (
                    <div className="inline-flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Synced</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm">Not synced</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {lead.syncedToCRM ? (
                    <button
                      disabled
                      className="px-3 py-1 bg-slate-100 text-slate-400 rounded text-sm font-medium cursor-not-allowed"
                    >
                      Synced
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSync(lead.id)}
                      disabled={syncingId === lead.id}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white rounded text-sm font-medium transition-colors"
                    >
                      {syncingId === lead.id ? (
                        <Loader2 className="w-4 h-4 animate-spin inline" />
                      ) : (
                        'Sync'
                      )}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {showDeleteConfirm === lead.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        disabled={deletingId === lead.id}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded text-xs font-medium transition-colors"
                      >
                        {deletingId === lead.id ? (
                          <Loader2 className="w-3 h-3 animate-spin inline" />
                        ) : (
                          'Confirm'
                        )}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        disabled={deletingId === lead.id}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(lead.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
