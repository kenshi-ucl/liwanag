import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { filterLeads, type LeadFilter } from '@/lib/dashboard/lead-filter';
import { z } from 'zod';

/**
 * Query parameter schema for lead filtering
 */
const leadFilterQuerySchema = z.object({
  minICPScore: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  syncStatus: z.enum(['synced', 'unsynced']).optional(),
});

/**
 * GET /api/leads
 * 
 * Returns filtered leads based on query parameters
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * Query Parameters:
 * - minICPScore: number (optional) - Minimum ICP score threshold
 * - companyName: string (optional) - Company name search (case-insensitive partial match)
 * - jobTitle: string (optional) - Job title search (case-insensitive partial match)
 * - syncStatus: 'synced' | 'unsynced' (optional) - CRM sync status filter
 */
export const Route = createFileRoute('/api/leads')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Parse query parameters from URL
          const url = new URL(request.url);
          const queryParams = Object.fromEntries(url.searchParams.entries());
          
          // Validate query parameters
          const validationResult = leadFilterQuerySchema.safeParse(queryParams);
          
          if (!validationResult.success) {
            return json(
              {
                error: 'Invalid query parameters',
                code: 'INVALID_QUERY_PARAMS',
                details: validationResult.error.issues,
                timestamp: new Date().toISOString(),
              },
              { status: 400 }
            );
          }
          
          const filter: LeadFilter = validationResult.data;
          
          // Validate minICPScore range if provided
          if (filter.minICPScore !== undefined) {
            if (filter.minICPScore < 0 || filter.minICPScore > 100) {
              return json(
                {
                  error: 'minICPScore must be between 0 and 100',
                  code: 'INVALID_ICP_SCORE',
                  timestamp: new Date().toISOString(),
                },
                { status: 400 }
              );
            }
          }
          
          // Execute filter query
          const result = await filterLeads(filter);
          
          // Return filtered leads and total count
          return json(
            {
              leads: result.leads,
              totalCount: result.totalCount,
            },
            { status: 200 }
          );
        } catch (error) {
          console.error('Lead filtering error:', error);
          
          return json(
            {
              error: error instanceof Error ? error.message : 'Internal server error',
              code: 'FILTERING_ERROR',
              timestamp: new Date().toISOString(),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
