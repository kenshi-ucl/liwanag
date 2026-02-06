import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

// Users table for authentication
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

// Subscribers table
export const subscribers = pgTable('subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(), // For RLS isolation
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailType: varchar('email_type', { length: 20 }).notNull(), // 'personal' | 'corporate'
  source: varchar('source', { length: 100 }), // 'newsletter', 'waitlist', 'upload'

  // Enriched data (nullable until enrichment completes)
  linkedinUrl: text('linkedin_url'),
  jobTitle: varchar('job_title', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  companyDomain: varchar('company_domain', { length: 255 }),
  headcount: integer('headcount'),
  industry: varchar('industry', { length: 100 }),

  // ICP scoring
  icpScore: integer('icp_score'), // 0-100

  // CRM sync tracking
  syncedToCRM: boolean('synced_to_crm').default(false),
  syncedAt: timestamp('synced_at', { mode: 'date', withTimezone: true }),

  // Audit fields
  rawPayload: jsonb('raw_payload'), // Original webhook/upload data
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

// Enrichment jobs table
export const enrichmentJobs = pgTable('enrichment_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(), // For RLS isolation
  subscriberId: uuid('subscriber_id').references(() => subscribers.id).notNull(),

  status: varchar('status', { length: 20 }).notNull(), // 'pending' | 'enriched' | 'failed' | 'stale'
  enrichmentId: varchar('enrichment_id', { length: 255 }), // FullEnrich tracking ID

  // Credit tracking
  estimatedCredits: integer('estimated_credits').notNull(),
  actualCredits: integer('actual_credits'),

  // Error handling
  failureReason: text('failure_reason'),
  retryCount: integer('retry_count').default(0),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { mode: 'date', withTimezone: true }),
});

// Webhook logs table (for debugging and audit)
export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: varchar('source', { length: 50 }).notNull(), // 'newsletter' | 'fullenrich'
  payload: jsonb('payload').notNull(),
  signature: text('signature'),
  isValid: boolean('is_valid').notNull(),
  processedAt: timestamp('processed_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
});

// TypeScript types (inferred from Drizzle schema)
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscriber = typeof subscribers.$inferSelect;
export type NewSubscriber = typeof subscribers.$inferInsert;
export type EnrichmentJob = typeof enrichmentJobs.$inferSelect;
export type NewEnrichmentJob = typeof enrichmentJobs.$inferInsert;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;

