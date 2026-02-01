import { z } from 'zod';

// Bulk enrichment request schema
export const bulkEnrichmentRequestSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
  webhookUrl: z.string().url(),
});

// Bulk enrichment response schema
export const bulkEnrichmentResponseSchema = z.object({
  enrichmentId: z.string(),
  estimatedCredits: z.number().int().positive(),
  status: z.literal('accepted'),
});

// Enrichment result schema (single result from webhook)
// Note: Using permissive email validation to accept RFC 5322 compliant emails
// This includes edge cases like "!@a.aa" which are technically valid
export const enrichmentResultSchema = z.object({
  email: z.string().regex(/^.+@.+\..+$/, 'Invalid email format'),
  linkedinUrl: z.string().url().optional(),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  companyDomain: z.string().optional(),
  headcount: z.number().int().positive().optional(),
  industry: z.string().optional(),
  creditsUsed: z.number().int().positive(),
});

// Enrichment webhook callback schema (array of results)
export const enrichmentWebhookCallbackSchema = z.object({
  enrichmentId: z.string(),
  results: z.array(enrichmentResultSchema),
});

// TypeScript types inferred from schemas
export type BulkEnrichmentRequest = z.infer<typeof bulkEnrichmentRequestSchema>;
export type BulkEnrichmentResponse = z.infer<typeof bulkEnrichmentResponseSchema>;
export type EnrichmentResult = z.infer<typeof enrichmentResultSchema>;
export type EnrichmentWebhookCallback = z.infer<typeof enrichmentWebhookCallbackSchema>;
