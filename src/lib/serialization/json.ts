/**
 * JSON Serialization Utilities
 * 
 * Provides type-safe JSON serialization and deserialization with UTF-8 encoding
 * and proper handling of optional fields.
 * 
 * Requirements: 13.3, 13.5
 */

/**
 * Serialization error thrown when JSON operations fail
 */
export class SerializationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SerializationError';
  }
}

/**
 * Serializes a value to JSON string with UTF-8 encoding
 * 
 * @param value - The value to serialize
 * @returns JSON string representation
 * @throws SerializationError if serialization fails
 */
export function serialize<T>(value: T): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    throw new SerializationError(
      `Failed to serialize value: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

/**
 * Deserializes a JSON string to a typed value
 * 
 * Handles optional fields by preserving undefined/null values.
 * 
 * @param json - The JSON string to deserialize
 * @returns Deserialized value
 * @throws SerializationError if deserialization fails
 */
export function deserialize<T>(json: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    throw new SerializationError(
      `Failed to deserialize JSON: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

/**
 * Safely deserializes JSON with optional field handling
 * 
 * Returns null if deserialization fails instead of throwing.
 * 
 * @param json - The JSON string to deserialize
 * @returns Deserialized value or null if parsing fails
 */
export function safeDeserialize<T>(json: string): T | null {
  try {
    return deserialize<T>(json);
  } catch {
    return null;
  }
}

/**
 * Validates that a string is valid JSON without parsing it
 * 
 * @param json - The string to validate
 * @returns true if valid JSON, false otherwise
 */
export function isValidJSON(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * Serializes a value with optional field handling
 * 
 * Removes undefined values from objects before serialization.
 * Null values are preserved.
 * 
 * @param value - The value to serialize
 * @returns JSON string with undefined fields removed
 */
export function serializeWithOptionals<T extends Record<string, unknown>>(value: T): string {
  const cleaned = Object.entries(value).reduce((acc, [key, val]) => {
    if (val !== undefined) {
      acc[key] = val;
    }
    return acc;
  }, {} as Record<string, unknown>);
  
  return serialize(cleaned);
}

/**
 * Deserializes JSON and ensures optional fields are properly handled
 * 
 * Missing fields in the JSON will be set to undefined in the result.
 * 
 * @param json - The JSON string to deserialize
 * @param defaults - Default values for optional fields
 * @returns Deserialized value with optional fields handled
 */
export function deserializeWithOptionals<T extends Record<string, unknown>>(
  json: string,
  defaults?: Partial<T>
): T {
  const parsed = deserialize<Partial<T>>(json);
  
  if (defaults) {
    return { ...defaults, ...parsed } as T;
  }
  
  return parsed as T;
}
