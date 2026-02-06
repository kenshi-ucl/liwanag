import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/config/env';
import * as schema from './schema';

// Create PostgreSQL connection
const connectionString = env.DATABASE_URL;

// Determine if we need SSL (Heroku requires it)
const isProduction = process.env.NODE_ENV === 'production';

// Create postgres client with SSL in production
export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

// Export schema for use in queries
export { schema };

// Export RLS utilities
export * from './rls-policies';

// Export timestamp utilities
export * from './timestamp-utils';
