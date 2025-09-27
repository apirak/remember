// Test suite for guest data migration functionality
// Tests the migrateGuestToAuthenticatedUser function

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FlashcardService } from '../../src/services/flashcardService';
import * as authUtils from '../../src/utils/auth';
import type { Flashcard } from '../../src/types/flashcard';

// Mock dependencies
vi.mock('../../src/utils/auth');
vi.mock('../../src/utils/firestore');

describe('FlashcardService - Guest Data Migration', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockGuestCards: Flashcard[] = [
    {
      id: 'card-1',
      cardSetId: 'hsk_1_set_1',
      front: {
        icon: '👋',
        title: 'nǐ hǎo',
        description: 'Hello',
      },
      back: {
        icon: '🇨🇳',
        title: 'Hello',
        description: 'A common greeting',
      },
      easinessFactor: 2.8, // Modified from default 2.5
      repetitions: 3,
      interval: 7,
      nextReviewDate: new Date('2024-12-01'),
      lastReviewDate: new Date('2024-11-24'),
      totalReviews: 5,
      correctStreak: 3,
      averageQuality: 4.2,
      isNew: false, // Not new - has been reviewed
      createdAt: new Date('2024-11-01'),
      updatedAt: new Date('2024-11-24'),
    },
    {
      id: 'card-2',
      cardSetId: 'hsk_1_set_1',
      front: {
        icon: '🙏',
        title: 'xiè xiè',
        description: 'Thank you',
      },
      back: {
        icon: '🇨🇳',
        title: 'Thank you',
        description: 'Expression of gratitude',
      },
      easinessFactor: 2.5, // Default - no progress
      repetitions: 1,
      interval: 1,
      nextReviewDate: new Date(),
      lastReviewDate: new Date(), // Use current date instead of null
      totalReviews: 0,
      correctStreak: 0,
      averageQuality: 0,
      isNew: true, // New card - no progress
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (authUtils.getCurrentUser as any).mockReturnValue(mockUser);

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('migrateGuestToAuthenticatedUser', () => {
    it('should successfully migrate guest cards with progress', async () => {
      // Mock successful migration
      const mockMigrateGuestData = vi.fn().mockResolvedValue({ success: true });
      FlashcardService.migrateGuestData = mockMigrateGuestData;

      // Mock localStorage card set data
      (global.localStorage.getItem as any).mockReturnValue(
        JSON.stringify({ id: 'hsk_1_set_1', name: 'HSK 1 Set 1' })
      );

      const result =
        await FlashcardService.migrateGuestToAuthenticatedUser(mockGuestCards);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        migratedCards: 2,
        migratedProgress: 1, // Only card-1 has meaningful progress (totalReviews > 0)
      });

      // Should have called the migration with filtered cards
      expect(mockMigrateGuestData).toHaveBeenCalledWith({
        cards: [mockGuestCards[0]], // Only card with progress
        cardSetId: 'hsk_1_set_1',
        stats: {},
        migrationTimestamp: expect.any(String),
      });

      // Should clear localStorage after migration
      expect(global.localStorage.removeItem).toHaveBeenCalledWith(
        'remember_last_card_set'
      );
    });

    it('should handle empty guest data gracefully', async () => {
      const result = await FlashcardService.migrateGuestToAuthenticatedUser([]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        migratedCards: 0,
        migratedProgress: 0,
      });

      // Should not call migration for empty data
      expect(FlashcardService.migrateGuestData).not.toHaveBeenCalled();
    });

    it('should handle null/undefined guest data', async () => {
      const result = await FlashcardService.migrateGuestToAuthenticatedUser(
        null as any
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        migratedCards: 0,
        migratedProgress: 0,
      });
    });

    it('should require authenticated user', async () => {
      (authUtils.getCurrentUser as any).mockReturnValue(null);

      const result =
        await FlashcardService.migrateGuestToAuthenticatedUser(mockGuestCards);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'User must be authenticated to migrate guest data.'
      );
    });

    it('should handle migration failure gracefully', async () => {
      // Mock migration failure
      const mockMigrateGuestData = vi.fn().mockResolvedValue({
        success: false,
        error: 'Firestore permission denied',
      });
      FlashcardService.migrateGuestData = mockMigrateGuestData;

      const result =
        await FlashcardService.migrateGuestToAuthenticatedUser(mockGuestCards);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Firestore permission denied');

      // Should not clear localStorage on failure
      expect(global.localStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should use default card set if localStorage is corrupted', async () => {
      // Mock corrupted localStorage
      (global.localStorage.getItem as any).mockReturnValue('invalid-json');

      const mockMigrateGuestData = vi.fn().mockResolvedValue({ success: true });
      FlashcardService.migrateGuestData = mockMigrateGuestData;

      const result =
        await FlashcardService.migrateGuestToAuthenticatedUser(mockGuestCards);

      expect(result.success).toBe(true);

      // Should use 'default' as fallback card set ID
      expect(mockMigrateGuestData).toHaveBeenCalledWith(
        expect.objectContaining({
          cardSetId: 'default',
        })
      );
    });

    it('should filter cards correctly based on progress criteria', async () => {
      const mixedCards: Flashcard[] = [
        {
          ...mockGuestCards[0],
          id: 'reviewed-card',
          totalReviews: 5, // Has progress
        },
        {
          ...mockGuestCards[0],
          id: 'modified-ease',
          totalReviews: 0,
          easinessFactor: 3.0, // Modified from default
        },
        {
          ...mockGuestCards[0],
          id: 'modified-interval',
          totalReviews: 0,
          easinessFactor: 2.5,
          interval: 3, // Modified from default
        },
        {
          ...mockGuestCards[0],
          id: 'not-new',
          totalReviews: 0,
          easinessFactor: 2.5,
          interval: 1,
          isNew: false, // Not new
        },
        {
          ...mockGuestCards[1], // Default/new card - should be filtered out
          id: 'default-card',
        },
      ];

      const mockMigrateGuestData = vi.fn().mockResolvedValue({ success: true });
      FlashcardService.migrateGuestData = mockMigrateGuestData;

      const result =
        await FlashcardService.migrateGuestToAuthenticatedUser(mixedCards);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        migratedCards: 5,
        migratedProgress: 4, // All except the default card
      });

      // Should only migrate cards with meaningful progress
      const migratedCardIds = mockMigrateGuestData.mock.calls[0][0].cards.map(
        (c: any) => c.id
      );
      expect(migratedCardIds).toContain('reviewed-card');
      expect(migratedCardIds).toContain('modified-ease');
      expect(migratedCardIds).toContain('modified-interval');
      expect(migratedCardIds).toContain('not-new');
      expect(migratedCardIds).not.toContain('default-card');
    });

    it('should handle localStorage access errors gracefully', async () => {
      // Mock localStorage error
      (global.localStorage.getItem as any).mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });
      (global.localStorage.removeItem as any).mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      const mockMigrateGuestData = vi.fn().mockResolvedValue({ success: true });
      FlashcardService.migrateGuestData = mockMigrateGuestData;

      const result =
        await FlashcardService.migrateGuestToAuthenticatedUser(mockGuestCards);

      expect(result.success).toBe(true);

      // Should continue with migration despite localStorage errors
      expect(mockMigrateGuestData).toHaveBeenCalled();
    });
  });
});
