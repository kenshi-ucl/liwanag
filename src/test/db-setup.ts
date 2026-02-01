/**
 * Database setup utilities for testing
 * 
 * This module provides functions to initialize and clean up the test database
 * before and after running tests that require database access.
 */

import { sql } from 'drizzle-orm';
import { db, client } from '@/db';
import { subscribers, enrichmentJobs, webhookLogs } from '@/db/schema';

/**
 * Initialize the test database schema
 * Creates all tables if they don't exist
 */
export async function initializeTestDatabase() {
  try {
    // Create subscribers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        email_type VARCHAR(20) NOT NULL,
        source VARCHAR(100),
        linkedin_url TEXT,
        job_title VARCHAR(255),
        company_name VARCHAR(255),
        company_domain VARCHAR(255),
        headcount INTEGER,
        industry VARCHAR(100),
        icp_score INTEGER,
        synced_to_crm BOOLEAN DEFAULT false,
        synced_at TIMESTAMPTZ,
        raw_payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    // Create enrichment_jobs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS enrichment_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        subscriber_id UUID NOT NULL REFERENCES subscribers(id),
        status VARCHAR(20) NOT NULL,
        enrichment_id VARCHAR(255),
        estimated_credits INTEGER NOT NULL,
        actual_credits INTEGER,
        failure_reason TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMPTZ
      )
    `);

    // Create webhook_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        signature TEXT,
        is_valid BOOLEAN NOT NULL,
        processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    console.log('✅ Test database schema initialized');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Clean up all test data from the database
 * Truncates all tables to ensure a clean state
 */
export async function cleanupTestDatabase() {
  try {
    await db.execute(sql`TRUNCATE TABLE enrichment_jobs CASCADE`);
    await db.execute(sql`TRUNCATE TABLE subscribers CASCADE`);
    await db.execute(sql`TRUNCATE TABLE webhook_logs CASCADE`);
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
    throw error;
  }
}

/**
 * Drop all tables from the test database
 * Use with caution - this removes all schema and data
 */
export async function dropTestDatabase() {
  try {
    await db.execute(sql`DROP TABLE IF EXISTS enrichment_jobs CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS subscribers CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS webhook_logs CASCADE`);
    console.log('✅ Test database tables dropped');
  } catch (error) {
    console.error('❌ Failed to drop test database:', error);
    throw error;
  }
}

/**
 * Close the database connection
 * Should be called after all tests complete
 */
export async function closeTestDatabase() {
  try {
    await client.end();
    console.log('✅ Test database connection closed');
  } catch (error) {
    console.error('❌ Failed to close test database connection:', error);
    throw error;
  }
}

/**
 * Check if the database is accessible
 * Returns true if connection is successful, false otherwise
 */
export async function isDatabaseAccessible(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    return false;
  }
}
