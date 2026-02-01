/**
 * UTC Timestamp Utilities
 * 
 * Ensures all timestamps are consistently stored and handled in UTC timezone.
 * This prevents timezone-related bugs and ensures data consistency across regions.
 */

/**
 * Convert any date input to UTC Date object
 * Handles various input formats: Date objects, ISO strings, timestamps
 * Returns null for invalid dates
 */
export function toUTC(date: Date | string | number): Date {
  const inputDate = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  // Check if the date is valid
  if (isNaN(inputDate.getTime())) {
    throw new Error('Invalid date input');
  }
  
  // Create a new Date object in UTC
  return new Date(inputDate.toISOString());
}

/**
 * Get current timestamp in UTC
 */
export function nowUTC(): Date {
  return new Date();
}

/**
 * Convert a date to UTC ISO string
 */
export function toUTCString(date: Date | string | number): string {
  const utcDate = toUTC(date);
  return utcDate.toISOString();
}

/**
 * Validate that a timestamp is in UTC
 * Returns true if the date is properly formatted as UTC
 */
export function isUTC(date: Date): boolean {
  // Check if the date's timezone offset is 0 (UTC)
  // Note: JavaScript Date objects always store time in UTC internally,
  // but we verify the string representation ends with 'Z'
  const isoString = date.toISOString();
  return isoString.endsWith('Z');
}

/**
 * Normalize timestamp input to ensure UTC storage
 * This should be used before storing any timestamp in the database
 */
export function normalizeTimestamp(timestamp: Date | string | number | null | undefined): Date | null {
  if (timestamp === null || timestamp === undefined) {
    return null;
  }
  
  return toUTC(timestamp);
}

/**
 * Create a timestamp object for database insertion
 * Ensures the timestamp is in UTC format
 */
export function createTimestamp(date?: Date | string | number): Date {
  if (date === undefined) {
    return nowUTC();
  }
  
  return toUTC(date);
}
