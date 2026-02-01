/**
 * Property-Based Tests for UTC Timestamp Handling
 * 
 * **Property 18: Timestamp UTC consistency**
 * **Validates: Requirements 5.4**
 * 
 * For any timestamp stored in the database, it should be in UTC timezone 
 * regardless of the timezone of the input data.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  toUTC, 
  nowUTC, 
  toUTCString, 
  isUTC, 
  normalizeTimestamp, 
  createTimestamp 
} from './timestamp-utils';

describe('Property 18: Timestamp UTC consistency', () => {
  it('should convert any date input to UTC', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        (date) => {
          const utcDate = toUTC(date);
          
          // Verify the result is a Date object
          expect(utcDate).toBeInstanceOf(Date);
          
          // Verify the ISO string ends with 'Z' (UTC indicator)
          expect(utcDate.toISOString()).toMatch(/Z$/);
          
          // Verify the timestamp value is preserved
          expect(utcDate.getTime()).toBe(date.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should convert ISO string to UTC', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        (date) => {
          const isoString = date.toISOString();
          const utcDate = toUTC(isoString);
          
          // Verify the result is a Date object
          expect(utcDate).toBeInstanceOf(Date);
          
          // Verify the ISO string ends with 'Z'
          expect(utcDate.toISOString()).toMatch(/Z$/);
          
          // Verify the timestamp value matches
          expect(utcDate.getTime()).toBe(new Date(isoString).getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should convert timestamp number to UTC', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 946684800000, max: 1924905600000 }), // 2000-2030 range
        (timestamp) => {
          const utcDate = toUTC(timestamp);
          
          // Verify the result is a Date object
          expect(utcDate).toBeInstanceOf(Date);
          
          // Verify the ISO string ends with 'Z'
          expect(utcDate.toISOString()).toMatch(/Z$/);
          
          // Verify the timestamp value matches
          expect(utcDate.getTime()).toBe(timestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return current time in UTC', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No input needed
        () => {
          const before = Date.now();
          const utcNow = nowUTC();
          const after = Date.now();
          
          // Verify the result is a Date object
          expect(utcNow).toBeInstanceOf(Date);
          
          // Verify the ISO string ends with 'Z'
          expect(utcNow.toISOString()).toMatch(/Z$/);
          
          // Verify the timestamp is within the expected range
          expect(utcNow.getTime()).toBeGreaterThanOrEqual(before);
          expect(utcNow.getTime()).toBeLessThanOrEqual(after);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should convert date to UTC ISO string', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        (date) => {
          const utcString = toUTCString(date);
          
          // Verify the result is a string
          expect(typeof utcString).toBe('string');
          
          // Verify the string ends with 'Z'
          expect(utcString).toMatch(/Z$/);
          
          // Verify the string is a valid ISO 8601 format
          expect(utcString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          
          // Verify it can be parsed back to the same timestamp
          expect(new Date(utcString).getTime()).toBe(date.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate UTC dates correctly', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        (date) => {
          // All JavaScript Date objects are internally UTC
          expect(isUTC(date)).toBe(true);
          
          // Verify the ISO string representation ends with 'Z'
          expect(date.toISOString()).toMatch(/Z$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should normalize null/undefined timestamps', () => {
    expect(normalizeTimestamp(null)).toBe(null);
    expect(normalizeTimestamp(undefined)).toBe(null);
  });

  it('should normalize valid timestamps to UTC', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        (date) => {
          const normalized = normalizeTimestamp(date);
          
          // Verify the result is a Date object
          expect(normalized).toBeInstanceOf(Date);
          
          // Verify it's in UTC
          expect(normalized!.toISOString()).toMatch(/Z$/);
          
          // Verify the timestamp value is preserved
          expect(normalized!.getTime()).toBe(date.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should create timestamps in UTC', () => {
    fc.assert(
      fc.property(
        fc.option(fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())), { nil: undefined }),
        (date) => {
          const timestamp = createTimestamp(date);
          
          // Verify the result is a Date object
          expect(timestamp).toBeInstanceOf(Date);
          
          // Verify it's in UTC
          expect(timestamp.toISOString()).toMatch(/Z$/);
          
          if (date !== undefined) {
            // Verify the timestamp value matches input
            expect(timestamp.getTime()).toBe(date.getTime());
          } else {
            // Verify it's close to current time
            const now = Date.now();
            expect(Math.abs(timestamp.getTime() - now)).toBeLessThan(1000);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle database timestamp operations with UTC', () => {
    fc.assert(
      fc.property(
        fc.record({
          createdAt: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
          updatedAt: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        }),
        (timestamps) => {
          // Simulate database timestamp handling
          const normalizedCreatedAt = normalizeTimestamp(timestamps.createdAt);
          const normalizedUpdatedAt = normalizeTimestamp(timestamps.updatedAt);
          
          // Verify both timestamps are normalized to UTC
          expect(normalizedCreatedAt).toBeInstanceOf(Date);
          expect(normalizedUpdatedAt).toBeInstanceOf(Date);
          
          expect(normalizedCreatedAt!.toISOString()).toMatch(/Z$/);
          expect(normalizedUpdatedAt!.toISOString()).toMatch(/Z$/);
          
          // Verify timestamp values are preserved
          expect(normalizedCreatedAt!.getTime()).toBe(timestamps.createdAt.getTime());
          expect(normalizedUpdatedAt!.getTime()).toBe(timestamps.updatedAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prepare timestamps for database insertion', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          source: fc.constantFrom('newsletter', 'waitlist', 'upload'),
          customTimestamp: fc.option(fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())), { nil: undefined }),
        }),
        (data) => {
          // Simulate preparing data for database insertion
          const createdAt = createTimestamp(data.customTimestamp);
          const updatedAt = createTimestamp(data.customTimestamp);
          
          // Verify timestamps are in UTC
          expect(createdAt).toBeInstanceOf(Date);
          expect(updatedAt).toBeInstanceOf(Date);
          
          expect(createdAt.toISOString()).toMatch(/Z$/);
          expect(updatedAt.toISOString()).toMatch(/Z$/);
          
          if (data.customTimestamp !== undefined) {
            // Verify custom timestamp is preserved
            expect(createdAt.getTime()).toBe(data.customTimestamp.getTime());
            expect(updatedAt.getTime()).toBe(data.customTimestamp.getTime());
          } else {
            // Verify current time is used
            const now = Date.now();
            expect(Math.abs(createdAt.getTime() - now)).toBeLessThan(1000);
            expect(Math.abs(updatedAt.getTime() - now)).toBeLessThan(1000);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle timestamp updates consistently', () => {
    fc.assert(
      fc.property(
        fc.record({
          originalCreatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }).filter(d => !isNaN(d.getTime())),
          updateTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') }).filter(d => !isNaN(d.getTime())),
        }),
        (data) => {
          // Simulate timestamp update scenario
          const createdAt = normalizeTimestamp(data.originalCreatedAt);
          const updatedAt = normalizeTimestamp(data.updateTime);
          
          // Verify both timestamps are in UTC
          expect(createdAt).toBeInstanceOf(Date);
          expect(updatedAt).toBeInstanceOf(Date);
          
          expect(createdAt!.toISOString()).toMatch(/Z$/);
          expect(updatedAt!.toISOString()).toMatch(/Z$/);
          
          // Verify updatedAt is after createdAt (based on our test data)
          expect(updatedAt!.getTime()).toBeGreaterThan(createdAt!.getTime());
          
          // Verify timestamp values are preserved
          expect(createdAt!.getTime()).toBe(data.originalCreatedAt.getTime());
          expect(updatedAt!.getTime()).toBe(data.updateTime.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});
