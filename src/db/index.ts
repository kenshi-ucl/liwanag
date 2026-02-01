import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/config/env';
import * as schema from './schema';

// Create PostgreSQL connection
const connectionString = env.DATABASE_URL;

// Create postgres client
export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

// Export schema for use in queries
export { schema };

// Export RLS utilities
export * from './rls-policies';

// Export timestamp utilities
export * from './timestamp-utils';
