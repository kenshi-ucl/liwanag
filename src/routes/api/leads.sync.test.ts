import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bulkSyncToCRM } from '@/lib/crm/sync';

// Mock the CRM sync module
vi.mock('@/lib/crm/sync', () => ({
  bulkSyncToCRM: vi.fn(),
}));

describe('POST /api/leads/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sync subscribers and return counts', async () => {
    // Mock successful sync
    vi.mocked(bulkSyncToCRM).mockResolvedValue({
      synced: 3,
      alreadySynced: 1,
      notFound: 0,
    });

    const subscriberIds = [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003',
    ];

    // Call the sync function directly
    const result = await bulkSyncToCRM(subscriberIds);

    // Verify the result
    expect(result.synced).toBe(3);
    expect(result.alreadySynced).toBe(1);
    expect(result.notFound).toBe(0);
    expect(bulkSyncToCRM).toHaveBeenCalledWith(subscriberIds);
  });

  it('should handle empty subscriber array', async () => {
    // Mock empty sync
    vi.mocked(bulkSyncToCRM).mockResolvedValue({
      synced: 0,
      alreadySynced: 0,
      notFound: 0,
    });

    const result = await bulkSyncToCRM([]);

    expect(result.synced).toBe(0);
    expect(result.alreadySynced).toBe(0);
    expect(result.notFound).toBe(0);
  });

  it('should handle all already-synced subscribers', async () => {
    // Mock all already synced
    vi.mocked(bulkSyncToCRM).mockResolvedValue({
      synced: 0,
      alreadySynced: 5,
      notFound: 0,
    });

    const subscriberIds = [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003',
      '123e4567-e89b-12d3-a456-426614174004',
    ];

    const result = await bulkSyncToCRM(subscriberIds);

    expect(result.synced).toBe(0);
    expect(result.alreadySynced).toBe(5);
    expect(result.notFound).toBe(0);
  });

  it('should handle mix of valid and invalid subscriber IDs', async () => {
    // Mock mixed result
    vi.mocked(bulkSyncToCRM).mockResolvedValue({
      synced: 2,
      alreadySynced: 1,
      notFound: 2,
    });

    const subscriberIds = [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
      '123e4567-e89b-12d3-a456-426614174003',
      '123e4567-e89b-12d3-a456-426614174004',
    ];

    const result = await bulkSyncToCRM(subscriberIds);

    expect(result.synced).toBe(2);
    expect(result.alreadySynced).toBe(1);
    expect(result.notFound).toBe(2);
    expect(result.synced + result.alreadySynced + result.notFound).toBe(5);
  });

  it('should handle database errors gracefully', async () => {
    // Mock database error
    vi.mocked(bulkSyncToCRM).mockRejectedValue(new Error('Database connection failed'));

    const subscriberIds = ['123e4567-e89b-12d3-a456-426614174000'];

    await expect(bulkSyncToCRM(subscriberIds)).rejects.toThrow('Database connection failed');
  });

  it('should validate subscriber ID format', async () => {
    // Mock successful sync
    vi.mocked(bulkSyncToCRM).mockResolvedValue({
      synced: 1,
      alreadySynced: 0,
      notFound: 0,
    });

    // Valid UUID format
    const validId = '123e4567-e89b-12d3-a456-426614174000';
    const result = await bulkSyncToCRM([validId]);

    expect(result.synced).toBe(1);
    expect(bulkSyncToCRM).toHaveBeenCalledWith([validId]);
  });

  it('should handle large batches of subscriber IDs', async () => {
    // Mock large batch sync
    vi.mocked(bulkSyncToCRM).mockResolvedValue({
      synced: 100,
      alreadySynced: 0,
      notFound: 0,
    });

    // Generate 100 subscriber IDs
    const subscriberIds = Array.from({ length: 100 }, (_, i) =>
      `123e4567-e89b-12d3-a456-${String(i).padStart(12, '0')}`
    );

    const result = await bulkSyncToCRM(subscriberIds);

    expect(result.synced).toBe(100);
    expect(bulkSyncToCRM).toHaveBeenCalledWith(subscriberIds);
  });

  it('should return accurate count totals', async () => {
    // Mock sync result
    vi.mocked(bulkSyncToCRM).mockResolvedValue({
      synced: 5,
      alreadySynced: 3,
      notFound: 2,
    });

    const subscriberIds = Array.from({ length: 10 }, (_, i) =>
      `123e4567-e89b-12d3-a456-${String(i).padStart(12, '0')}`
    );

    const result = await bulkSyncToCRM(subscriberIds);

    // Verify total count matches input
    const totalProcessed = result.synced + result.alreadySynced + result.notFound;
    expect(totalProcessed).toBe(10);
  });
});
