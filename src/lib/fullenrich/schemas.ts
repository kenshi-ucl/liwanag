import { z } from 'zod';

// Contact data for enrichment - all fields optional except what we're sending
export const contactDataSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  full_name: z.string().optional(),
  company_domain: z.string().optional(),
  company_name: z.string().optional(),
  linkedin_url: z.string().optional(),
  email: z.string().optional(),
  domain: z.string().optional(),
  enrich_fields: z.array(z.string()).optional(),
  custom: z.record(z.string(), z.string()).optional(),
}).passthrough(); // Allow additional fields

// Bulk enrichment request schema
export const bulkEnrichmentRequestSchema = z.object({
  name: z.string().optional(),
  webhook_url: z.string().url(),
  data: z.array(contactDataSchema).min(1).max(100),
}).passthrough(); // Allow additional fields

// Bulk enrichment response schema - flexible to handle FullEnrich's actual response
export const bulkEnrichmentResponseSchema = z.object({
  enrichment_id: z.string(),
}).passthrough(); // Allow additional fields

// Enrichment result schema (single result from webhook) - matches FullEnrich Reverse Email Lookup response
export const enrichmentResultSchema = z.object({
  input: z.object({
    email: z.string(),
  }).optional(),
  custom: z.record(z.string(), z.any()).optional(),
  contact_info: z.object({
    emails: z.array(z.object({
      email: z.string(),
      type: z.string().optional(),
    })).optional(),
    phones: z.array(z.object({
      number: z.string(),
      type: z.string().optional(),
    })).optional(),
  }).optional(),
  profile: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    job_title: z.string().optional(),
    linkedin_url: z.string().optional(),
    company: z.object({
      name: z.string().optional(),
      domain: z.string().optional(),
      headcount: z.number().optional(),
      industry: z.string().optional(),
    }).optional(),
  }).optional(),
}).passthrough(); // Allow additional fields

// Enrichment webhook callback schema - matches FullEnrich webhook format
export const enrichmentWebhookCallbackSchema = z.object({
  id: z.string(), // FullEnrich sends "id" not "enrichment_id"
  name: z.string().optional(),
  status: z.string(),
  cost: z.object({
    credits: z.number(),
  }).optional(),
  data: z.array(enrichmentResultSchema), // FullEnrich sends "data" not "results"
}).passthrough(); // Allow additional fields

// TypeScript types inferred from schemas
export type ContactData = z.infer<typeof contactDataSchema>;
export type BulkEnrichmentRequest = z.infer<typeof bulkEnrichmentRequestSchema>;
export type BulkEnrichmentResponse = z.infer<typeof bulkEnrichmentResponseSchema>;
export type EnrichmentResult = z.infer<typeof enrichmentResultSchema>;
export type EnrichmentWebhookCallback = z.infer<typeof enrichmentWebhookCallbackSchema>;
