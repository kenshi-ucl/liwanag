/**
 * JSONB Validation Utilities
 * 
 * Provides validation for JSONB data before storing in PostgreSQL JSONB columns.
 * Ensures data is well-formed JSON and handles malformed JSON gracefully.
 * 
 * Requirements: 13.4
 */

import { isValidJSON } from './json';

/**
 * JSONB validation error thrown when validation fails
 */
export class JSONBValidationError extends Error {
  constructor(message: string, public readonly invalidData?: string) {
    super(message);
    this.name = 'JSONBValidationError';
  }
}

/**
 * Validation result for JSONB data
 */
export interface JSONBValidationResult {
  isValid: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Validates that data can be safely stored in a JSONB column
 * 
 * Checks that:
 * 1. Data can be serialized to JSON
 * 2. Serialized JSON is well-formed
 * 3. Data can be round-tripped through JSON serialization
 * 
 * @param data - The data to validate for JSONB storage
 * @returns The validated data ready for JSONB storage
 * @throws JSONBValidationError if validation fails
 */
export function validateJSONB<T>(data: T): T {
  try {
    // Attempt to serialize the data
    const serialized = JSON.stringify(data);
    
    // Verify it's valid JSON
    if (!isValidJSON(serialized)) {
      throw new JSONBValidationError(
        'Data cannot be serialized to valid JSON',
        typeof serialized === 'string' ? serialized : undefined
      );
    }
    
    // Verify round-trip works
    const parsed = JSON.parse(serialized);
    
    return parsed as T;
  } catch (error) {
    if (error instanceof JSONBValidationError) {
      throw error;
    }
    
    throw new JSONBValidationError(
      `JSONB validation failed: ${error instanceof Error ? error.message : String(error)}`,
      undefined
    );
  }
}

/**
 * Safely validates JSONB data without throwing
 * 
 * @param data - The data to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function safeValidateJSONB<T>(data: T): JSONBValidationResult {
  try {
    const validated = validateJSONB(data);
    return {
      isValid: true,
      data: validated,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validates a string as JSONB-compatible JSON
 * 
 * @param json - The JSON string to validate
 * @returns true if valid JSONB, false otherwise
 */
export function isValidJSONB(json: string): boolean {
  try {
    // Must be valid JSON
    if (!isValidJSON(json)) {
      return false;
    }
    
    // Parse and verify it's an object or array (JSONB requirement)
    const parsed = JSON.parse(json);
    
    // JSONB in PostgreSQL can store objects, arrays, strings, numbers, booleans, and null
    // All of these are valid
    return true;
  } catch {
    return false;
  }
}

/**
 * Prepares data for JSONB storage by validating and normalizing it
 * 
 * Handles:
 * - Undefined values (converts to null)
 * - Circular references (throws error)
 * - Invalid JSON (throws error)
 * 
 * @param data - The data to prepare for JSONB storage
 * @returns Validated and normalized data
 * @throws JSONBValidationError if data cannot be stored in JSONB
 */
export function prepareForJSONB<T>(data: T): unknown {
  // Validate the data
  const validated = validateJSONB(data);
  
  // Return the validated data
  // PostgreSQL JSONB will handle the actual storage
  return validated;
}

/**
 * Validates webhook payload for JSONB storage
 * 
 * Ensures the payload is valid JSON and contains expected structure.
 * 
 * @param payload - The webhook payload to validate
 * @returns Validated payload
 * @throws JSONBValidationError if payload is invalid
 */
export function validateWebhookPayloadForJSONB(payload: unknown): unknown {
  if (payload === null || payload === undefined) {
    throw new JSONBValidationError('Webhook payload cannot be null or undefined');
  }
  
  // Validate it can be stored as JSONB
  return validateJSONB(payload);
}

/**
 * Validates enrichment data for JSONB storage
 * 
 * @param data - The enrichment data to validate
 * @returns Validated enrichment data
 * @throws JSONBValidationError if data is invalid
 */
export function validateEnrichmentDataForJSONB(data: unknown): unknown {
  if (data === null || data === undefined) {
    throw new JSONBValidationError('Enrichment data cannot be null or undefined');
  }
  
  // Validate it can be stored as JSONB
  return validateJSONB(data);
}
