// Tests for Optimized FlashcardService Methods
// Validates the new consolidated data structure operations

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { FlashcardService } from '../services/flashcardService';
import type {
  UserProfileWithProgress,
  CardSetProgress,
} from '../types/flashcard';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc-ref' })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _seconds: Date.now() / 1000 })),
}));

vi.mock('../utils/firebase', () => ({
  firestore: {},
}));

vi.mock('../utils/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock the optimization migration utility
vi.mock('../services/firestoreOptimization', () => ({
  FirestoreOptimizationMigration: {
    autoMigrateAndLoadProfile: vi.fn(),
    updateCardSetProgress: vi.fn(),
    needsMigration: vi.fn(),
    migrateToOptimizedStructure: vi.fn(),
  },
}));

// Mock other utilities
vi.mock('../utils/firestore', () => ({
  getUserFlashcards: vi.fn(),
  saveFlashcardsBatch: vi.fn(),
}));

vi.mock('../utils/cardSetLoader', () => ({
  loadCardSetDataWithFetch: vi.fn(),
}));

// Import mocked functions
import { getCurrentUser } from '../utils/auth';
import { FirestoreOptimizationMigration } from '../services/firestoreOptimization';
import { getUserFlashcards, saveFlashcardsBatch } from '../utils/firestore';
import { loadCardSetDataWithFetch } from '../utils/cardSetLoader';
import { setDoc } from 'firebase/firestore';

const mockGetCurrentUser = getCurrentUser as Mock;
const mockAutoMigrateAndLoadProfile =
  FirestoreOptimizationMigration.autoMigrateAndLoadProfile as Mock;
const mockUpdateCardSetProgress =
  FirestoreOptimizationMigration.updateCardSetProgress as Mock;
const mockNeedsMigration =
  FirestoreOptimizationMigration.needsMigration as Mock;
const mockMigrateToOptimizedStructure =
  FirestoreOptimizationMigration.migrateToOptimizedStructure as Mock;
const mockGetUserFlashcards = getUserFlashcards as Mock;
const mockSaveFlashcardsBatch = saveFlashcardsBatch as Mock;
const mockLoadCardSetDataWithFetch = loadCardSetDataWithFetch as Mock;
const mockSetDoc = setDoc as Mock;

describe('FlashcardService - Optimized Methods', () => {
  const testUserId = 'test-user-123';
  const testUser = { uid: testUserId };

  // Mock data
  const mockUserProfile: UserProfileWithProgress = {
    uid: testUserId,
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-15'),
    isActive: true,
    cardSetsProgress: {
      business_chinese: {
        cardSetId: 'business_chinese',
        totalCards: 50,
        reviewedCards: 25,
        progressPercentage: 50,
        lastReviewDate: new Date('2024-01-10'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-10'),
      },
      hsk_1_set_1: {
        cardSetId: 'hsk_1_set_1',
        totalCards: 30,
        reviewedCards: 10,
        progressPercentage: 33.33,
        lastReviewDate: new Date('2024-01-08'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-08'),
      },
    },
    migrationVersion: 1,
    lastMigrationDate: new Date('2024-01-15'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockReturnValue(testUser);
  });

  describe('loadUserProfileWithProgress', () => {
    it('should load user profile with consolidated progress data', async () => {
      mockAutoMigrateAndLoadProfile.mockResolvedValue(mockUserProfile);

      const result = await FlashcardService.loadUserProfileWithProgress();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserProfile);
      expect(mockAutoMigrateAndLoadProfile).toHaveBeenCalledWith(testUserId);
    });

    it('should handle user not authenticated', async () => {
      mockGetCurrentUser.mockReturnValue(null);

      const result = await FlashcardService.loadUserProfileWithProgress();

      expect(result.success).toBe(false);
      expect(result.error).toContain('User must be authenticated');
    });

    it('should handle profile not found', async () => {
      mockAutoMigrateAndLoadProfile.mockResolvedValue(null);

      const result = await FlashcardService.loadUserProfileWithProgress();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle migration errors', async () => {
      mockAutoMigrateAndLoadProfile.mockRejectedValue(
        new Error('Migration failed')
      );

      const result = await FlashcardService.loadUserProfileWithProgress();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration failed');
    });
  });

  describe('getCardSetProgressFromProfile', () => {
    it('should retrieve progress for existing card set', () => {
      const result = FlashcardService.getCardSetProgressFromProfile(
        'business_chinese',
        mockUserProfile
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        mockUserProfile.cardSetsProgress['business_chinese']
      );
    });

    it('should return null for non-existing card set', () => {
      const result = FlashcardService.getCardSetProgressFromProfile(
        'non_existing',
        mockUserProfile
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle errors gracefully', () => {
      // Pass invalid profile to trigger error
      const result = FlashcardService.getCardSetProgressFromProfile(
        'test',
        null as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot read properties of null');
    });
  });

  describe('updateCardSetProgressOptimized', () => {
    it('should update progress using optimized method', async () => {
      const progressUpdate: CardSetProgress = {
        cardSetId: 'business_chinese',
        totalCards: 50,
        reviewedCards: 30,
        progressPercentage: 60,
        lastReviewDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUpdateCardSetProgress.mockResolvedValue(true);

      const result = await FlashcardService.updateCardSetProgressOptimized(
        'business_chinese',
        progressUpdate
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockUpdateCardSetProgress).toHaveBeenCalledWith(
        testUserId,
        'business_chinese',
        progressUpdate
      );
    });

    it('should handle user not authenticated', async () => {
      mockGetCurrentUser.mockReturnValue(null);

      const result = await FlashcardService.updateCardSetProgressOptimized(
        'test',
        {} as CardSetProgress
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('User must be authenticated');
    });

    it('should handle update failure', async () => {
      mockUpdateCardSetProgress.mockResolvedValue(false);

      const result = await FlashcardService.updateCardSetProgressOptimized(
        'test',
        {} as CardSetProgress
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Failed to update progress in optimized structure'
      );
    });
  });

  describe('ensureCardSetExists', () => {
    const mockFlashcardData = [
      {
        id: 'card1',
        front: {
          icon: '🏢',
          title: 'Business',
          description: 'Commercial enterprise',
        },
        back: { icon: '商业', title: '商业', description: 'shāng yè' },
      },
    ];

    it('should return true if card set already exists', async () => {
      // Mock that cards already exist
      mockGetUserFlashcards.mockResolvedValue({
        success: true,
        data: [{ id: 'existing-card' }],
      });

      const result = await FlashcardService.ensureCardSetExists(
        'business_chinese',
        'business_chinese.json'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      // Should not try to create new cards
      expect(mockLoadCardSetDataWithFetch).not.toHaveBeenCalled();
    });

    it('should create card set if it does not exist', async () => {
      // Mock that no cards exist
      mockGetUserFlashcards.mockResolvedValue({
        success: true,
        data: [],
      });

      // Mock successful JSON loading
      mockLoadCardSetDataWithFetch.mockResolvedValue(mockFlashcardData);

      // Mock successful batch save
      mockSaveFlashcardsBatch.mockResolvedValue({
        success: true,
      });

      // Mock successful progress update
      mockUpdateCardSetProgress.mockResolvedValue(true);

      const result = await FlashcardService.ensureCardSetExists(
        'business_chinese',
        'business_chinese.json'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockLoadCardSetDataWithFetch).toHaveBeenCalledWith(
        'business_chinese.json'
      );
      expect(mockSaveFlashcardsBatch).toHaveBeenCalled();
    });

    it('should handle JSON loading failure', async () => {
      mockGetUserFlashcards.mockResolvedValue({
        success: true,
        data: [],
      });

      mockLoadCardSetDataWithFetch.mockRejectedValue(
        new Error('JSON not found')
      );

      const result = await FlashcardService.ensureCardSetExists(
        'business_chinese',
        'business_chinese.json'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Failed to load cards from business_chinese.json'
      );
    });

    it('should handle batch save failure', async () => {
      mockGetUserFlashcards.mockResolvedValue({
        success: true,
        data: [],
      });

      mockLoadCardSetDataWithFetch.mockResolvedValue(mockFlashcardData);

      mockSaveFlashcardsBatch.mockResolvedValue({
        success: false,
        error: 'Batch save failed',
      });

      const result = await FlashcardService.ensureCardSetExists(
        'business_chinese',
        'business_chinese.json'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Batch save failed');
    });
  });

  describe('getAllCardSetProgressFromProfile', () => {
    it('should return all progress records from profile', () => {
      const result =
        FlashcardService.getAllCardSetProgressFromProfile(mockUserProfile);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data).toEqual(
        Object.values(mockUserProfile.cardSetsProgress)
      );
    });

    it('should handle empty progress', () => {
      const emptyProfile = { ...mockUserProfile, cardSetsProgress: {} };

      const result =
        FlashcardService.getAllCardSetProgressFromProfile(emptyProfile);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('batchUpdateCardSetProgress', () => {
    it('should batch update multiple progress records', async () => {
      const progressUpdates = {
        business_chinese: mockUserProfile.cardSetsProgress['business_chinese'],
        hsk_1_set_1: mockUserProfile.cardSetsProgress['hsk_1_set_1'],
      };

      mockSetDoc.mockResolvedValue(undefined);

      const result =
        await FlashcardService.batchUpdateCardSetProgress(progressUpdates);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockSetDoc).toHaveBeenCalledWith(
        { id: 'mock-doc-ref' },
        expect.objectContaining({
          'cardSetsProgress.business_chinese': expect.any(Object),
          'cardSetsProgress.hsk_1_set_1': expect.any(Object),
        }),
        { merge: true }
      );
    });

    it('should handle user not authenticated', async () => {
      mockGetCurrentUser.mockReturnValue(null);

      const result = await FlashcardService.batchUpdateCardSetProgress({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('User must be authenticated');
    });

    it('should handle batch update errors', async () => {
      mockSetDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await FlashcardService.batchUpdateCardSetProgress({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Firestore error');
    });
  });

  describe('checkMigrationStatus', () => {
    it('should check if migration is needed', async () => {
      mockNeedsMigration.mockResolvedValue(true);

      const result = await FlashcardService.checkMigrationStatus();

      expect(result.success).toBe(true);
      expect(result.data?.needsMigration).toBe(true);
      expect(result.data?.reason).toContain('needs migration');
    });

    it('should check if migration is not needed', async () => {
      mockNeedsMigration.mockResolvedValue(false);

      const result = await FlashcardService.checkMigrationStatus();

      expect(result.success).toBe(true);
      expect(result.data?.needsMigration).toBe(false);
      expect(result.data?.reason).toContain('already has optimized');
    });
  });

  describe('triggerMigration', () => {
    it('should trigger migration successfully', async () => {
      const migrationResult = {
        success: true,
        migratedCardSets: ['business_chinese', 'hsk_1_set_1'],
        errors: [],
        totalReadOperations: 3,
        totalWriteOperations: 1,
      };

      mockMigrateToOptimizedStructure.mockResolvedValue(migrationResult);

      const result = await FlashcardService.triggerMigration();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(migrationResult);
    });

    it('should handle migration failure', async () => {
      const migrationResult = {
        success: false,
        migratedCardSets: [],
        errors: ['Migration error'],
        totalReadOperations: 1,
        totalWriteOperations: 0,
      };

      mockMigrateToOptimizedStructure.mockResolvedValue(migrationResult);

      const result = await FlashcardService.triggerMigration();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration error');
    });
  });
});
