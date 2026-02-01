import { useQuery, useMutation, useQueryClient } from '@tanstack/react-router';
import { Loader2, Search, Filter, CheckCircle2, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { LeadTable } from './LeadTable';

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

interface FilterState {
  minICPScore: number;
  companyName: string;
  jobTitle: string;
  syncStatus: 'all' | 'synced' | 'unsynced';
}

/**
 * Lead Filters Component
 * 
 * Provides filtering UI for leads:
 * - ICP score slider filter
 * - Company name search input
 * - Job title search input
 * - Sync status filter
 * - Displays filtered result count
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export function LeadFilters() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterState>({
    minICPScore: 0,
    companyName: '',
    jobTitle: '',
    syncStatus: 'all',
  });
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Build query string from filters
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters.minICPScore > 0) {
      params.append('minICPScore', filters.minICPScore.toString());
    }
    if (filters.companyName.trim()) {
      params.append('companyName', filters.companyName.trim());
    }
    if (filters.jobTitle.trim()) {
      params.append('jobTitle', filters.jobTitle.trim());
    }
    if (filters.syncStatus !== 'all') {
      params.append('syncStatus', filters.syncStatus);
    }
    
    return params.toString();
  }, [filters]);

  const { data, isLoading, error } = useQuery<{ leads: Subscriber[]; totalCount: number }>({
    queryKey: ['leads', queryString],
    queryFn: async () => {
      const url = queryString ? `/api/leads?${queryString}` : '/api/leads';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const bulkSyncMutation = useMutation({
    mutationFn: async (subscriberIds: string[]) => {
      const response = await fetch('/api/leads/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriberIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync leads');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['hidden-gems'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setSelectedLeads(new Set());
    },
  });

  const handleBulkSync = () => {
    if (selectedLeads.size > 0) {
      bulkSyncMutation.mutate(Array.from(selectedLeads));
    }
  };

  const handleSelectAll = () => {
    if (!data?.leads) return;
    
    const unsyncedLeads = data.leads.filter(lead => !lead.syncedToCRM);
    if (selectedLeads.size === unsyncedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(unsyncedLeads.map(lead => lead.id)));
    }
  };

  const handleSelectLead = (id: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLeads(newSelected);
  };

  const clearFilters = () => {
    setFilters({
      minICPScore: 0,
      companyName: '',
      jobTitle: '',
      syncStatus: 'all',
    });
  };

  const hasActiveFilters = 
    filters.minICPScore > 0 ||
    filters.companyName.trim() !== '' ||
    filters.jobTitle.trim() !== '' ||
    filters.syncStatus !== 'all';

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ICP Score Slider */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Min ICP Score: {filters.minICPScore}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={filters.minICPScore}
              onChange={(e) => setFilters({ ...filters, minICPScore: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Company Name Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Name
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={filters.companyName}
                onChange={(e) => setFilters({ ...filters, companyName: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Job Title Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Title
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search titles..."
                value={filters.jobTitle}
                onChange={(e) => setFilters({ ...filters, jobTitle: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sync Status Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sync Status
            </label>
            <select
              value={filters.syncStatus}
              onChange={(e) => setFilters({ ...filters, syncStatus: e.target.value as FilterState['syncStatus'] })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="all">All Leads</option>
              <option value="synced">Synced Only</option>
              <option value="unsynced">Unsynced Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header with Bulk Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-slate-700">
              {isLoading ? (
                'Loading...'
              ) : (
                <>
                  {data?.totalCount ?? 0} lead{data?.totalCount !== 1 ? 's' : ''} found
                </>
              )}
            </p>
            {selectedLeads.size > 0 && (
              <p className="text-sm text-cyan-600">
                {selectedLeads.size} selected
              </p>
            )}
          </div>

          {selectedLeads.size > 0 && (
            <button
              onClick={handleBulkSync}
              disabled={bulkSyncMutation.isPending}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {bulkSyncMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Sync {selectedLeads.size} to CRM
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Results Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <div className="text-center text-red-600">
            <p className="font-semibold">Failed to load leads</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        </div>
      ) : (
        <LeadTable
          leads={data?.leads ?? []}
          selectedLeads={selectedLeads}
          onSelectAll={handleSelectAll}
          onSelectLead={handleSelectLead}
        />
      )}
    </div>
  );
}
