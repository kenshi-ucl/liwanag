import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from appropriate .env file
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
} else {
  dotenv.config();
}

// Environment variable schema with validation
const envSchema = z.object({
  // Database configuration
  DATABASE_URL: z.string().min(1).describe('PostgreSQL connection string'),
  
  // FullEnrich API configuration
  FULLENRICH_API_KEY: z.string().min(1).describe('FullEnrich API key'),
  FULLENRICH_WEBHOOK_URL: z.string().min(1).describe('FullEnrich webhook callback URL'),
  USE_MOCK_ENRICHMENT: z.string().optional().describe('Set to "true" to use mock enrichment, "false" for real API'),
  
  // Webhook signing secrets
  NEWSLETTER_WEBHOOK_SECRET: z.string().min(1).describe('Newsletter webhook signing secret'),
  FULLENRICH_WEBHOOK_SECRET: z.string().min(1).describe('FullEnrich webhook signing secret'),
  
  // Application configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
});

// Validate and export environment variables
export function loadEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => {
        const path = err.path.join('.');
        const message = err.message;
        return `  - ${path}: ${message}`;
      });
      
      console.error('❌ Environment variable validation failed:');
      console.error(missingVars.join('\n'));
      console.error('\nPlease check your .env file and ensure all required variables are set.');
      
      throw new Error('Environment validation failed');
    }
    throw error;
  }
}

// Export validated environment variables
export const env = loadEnv();

// Type for environment variables
export type Env = z.infer<typeof envSchema>;

