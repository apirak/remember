// Tests for Firestore Optimization Migration
// Validates consolidation of progress data and migration functionality

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { FirestoreOptimizationMigration } from '../services/firestoreOptimization';
import type {
  UserProfileWithProgress,
  CardSetProgress,
  MigrationResult,
} from '../types/flashcard';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  writeBatch: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _seconds: Date.now() / 1000 })),
}));

vi.mock('../utils/firebase', () => ({
  firestore: {},
}));

// Import mocked functions
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  writeBatch,
} from 'firebase/firestore';

const mockDoc = doc as Mock;
const mockGetDoc = getDoc as Mock;
const mockGetDocs = getDocs as Mock;
const mockSetDoc = setDoc as Mock;
const mockCollection = collection as Mock;
const mockWriteBatch = writeBatch as Mock;

describe('FirestoreOptimizationMigration', () => {
  const testUserId = 'test-user-123';

  // Mock data
  const mockUserProfile = {
    uid: testUserId,
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-15'),
    isActive: true,
  };

  const mockProgressData = [
    {
      cardSetId: 'business_chinese',
      totalCards: 50,
      reviewedCards: 25,
      progressPercentage: 50,
      lastReviewDate: new Date('2024-01-10'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-10'),
    },
    {
      cardSetId: 'hsk_1_set_1',
      totalCards: 30,
      reviewedCards: 10,
      progressPercentage: 33.33,
      lastReviewDate: new Date('2024-01-08'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-08'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockDoc.mockReturnValue({ id: 'mock-doc' });
    mockCollection.mockReturnValue({ id: 'mock-collection' });

    // Mock batch operations
    const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
    const mockBatchSet = vi.fn();
    const mockBatchDelete = vi.fn();

    mockWriteBatch.mockReturnValue({
      commit: mockBatchCommit,
      set: mockBatchSet,
      delete: mockBatchDelete,
    });
  });

  describe('needsMigration', () => {
    it('should return true when user document does not exist', async () => {
      // Mock user document not existing
      mockGetDoc.mockResolvedValue({ exists: () => false });

      const needsMigration =
        await FirestoreOptimizationMigration.needsMigration(testUserId);

      expect(needsMigration).toBe(true);
    });

    it('should return false when user has optimized structure', async () => {
      // Mock user with optimized structure
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ...mockUserProfile,
          cardSetsProgress: { business_chinese: mockProgressData[0] },
          migrationVersion: 1,
        }),
      });

      const needsMigration =
        await FirestoreOptimizationMigration.needsMigration(testUserId);

      expect(needsMigration).toBe(false);
    });

    it('should return true when old cardSetProgress collection exists', async () => {
      // Mock user without optimized structure
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUserProfile,
      });

      // Mock old progress collection exists
      mockGetDocs.mockResolvedValueOnce({ empty: false });

      const needsMigration =
        await FirestoreOptimizationMigration.needsMigration(testUserId);

      expect(needsMigration).toBe(true);
    });

    it('should handle errors gracefully and assume migration is needed', async () => {
      // Mock error
      mockGetDoc.mockRejectedValue(new Error('Firestore error'));

      const needsMigration =
        await FirestoreOptimizationMigration.needsMigration(testUserId);

      expect(needsMigration).toBe(true);
    });
  });

  describe('migrateToOptimizedStructure', () => {
    it('should successfully migrate progress data', async () => {
      // Mock existing user profile
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUserProfile,
      });

      // Mock progress documents
      const mockProgressDocs = mockProgressData.map((progress) => ({
        id: progress.cardSetId,
        data: () => ({
          ...progress,
          lastReviewDate: { toDate: () => progress.lastReviewDate },
          createdAt: { toDate: () => progress.createdAt },
          updatedAt: { toDate: () => progress.updatedAt },
        }),
        ref: { id: progress.cardSetId },
      }));

      mockGetDocs.mockResolvedValueOnce({
        size: mockProgressDocs.length,
        forEach: (callback: (doc: any) => void) => {
          mockProgressDocs.forEach(callback);
        },
      });

      const result: MigrationResult =
        await FirestoreOptimizationMigration.migrateToOptimizedStructure(
          testUserId
        );

      expect(result.success).toBe(true);
      expect(result.migratedCardSets).toEqual([
        'business_chinese',
        'hsk_1_set_1',
      ]);
      expect(result.errors).toHaveLength(0);
      expect(result.totalReadOperations).toBe(2); // user + progress collection
      expect(result.totalWriteOperations).toBe(3); // 1 set + 2 deletes
    });

    it('should handle migration when user document does not exist', async () => {
      // Mock user document not existing
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      // Mock progress documents
      const mockProgressDocs = mockProgressData.slice(0, 1); // Just one for simplicity

      mockGetDocs.mockResolvedValueOnce({
        size: mockProgressDocs.length,
        forEach: (callback: (doc: any) => void) => {
          mockProgressDocs.forEach((progress) => {
            callback({
              id: progress.cardSetId,
              data: () => ({
                ...progress,
                lastReviewDate: { toDate: () => progress.lastReviewDate },
                createdAt: { toDate: () => progress.createdAt },
                updatedAt: { toDate: () => progress.updatedAt },
              }),
              ref: { id: progress.cardSetId },
            });
          });
        },
      });

      const result =
        await FirestoreOptimizationMigration.migrateToOptimizedStructure(
          testUserId
        );

      expect(result.success).toBe(true);
      expect(result.migratedCardSets).toEqual(['business_chinese']);
    });

    it('should handle errors during migration', async () => {
      // Mock error during user profile loading
      mockGetDoc.mockRejectedValue(new Error('Firestore connection error'));

      const result =
        await FirestoreOptimizationMigration.migrateToOptimizedStructure(
          testUserId
        );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Migration failed');
    });

    it('should collect errors for individual progress documents', async () => {
      // Mock user profile
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUserProfile,
      });

      // Mock progress documents with one that will cause an error
      mockGetDocs.mockResolvedValueOnce({
        size: 2,
        forEach: (callback: (doc: any) => void) => {
          // Valid document with proper data structure
          callback({
            id: 'business_chinese',
            data: () => ({
              ...mockProgressData[0],
              lastReviewDate: {
                toDate: () => mockProgressData[0].lastReviewDate,
              },
              createdAt: { toDate: () => mockProgressData[0].createdAt },
              updatedAt: { toDate: () => mockProgressData[0].updatedAt },
            }),
            ref: { id: 'business_chinese' },
          });

          // Invalid document (missing required fields)
          callback({
            id: 'invalid-card-set',
            data: () => ({ invalidData: true }), // This will cause processing error
            ref: { id: 'invalid-card-set' },
          });
        },
      });

      const result =
        await FirestoreOptimizationMigration.migrateToOptimizedStructure(
          testUserId
        );

      expect(result.success).toBe(true); // Should still succeed for valid documents
      expect(result.migratedCardSets).toEqual(['business_chinese']);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain(
        'Error processing progress document invalid-card-set'
      );
    });
  });

  describe('loadOptimizedProfile', () => {
    it('should load profile with consolidated progress data', async () => {
      const optimizedProfile: UserProfileWithProgress = {
        ...mockUserProfile,
        cardSetsProgress: {
          business_chinese: mockProgressData[0],
          hsk_1_set_1: mockProgressData[1],
        },
        migrationVersion: 1,
        lastMigrationDate: new Date('2024-01-15'),
      };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => optimizedProfile,
      });

      const result =
        await FirestoreOptimizationMigration.loadOptimizedProfile(testUserId);

      expect(result).toBeDefined();
      expect(result?.uid).toBe(testUserId);
      expect(result?.cardSetsProgress).toBeDefined();
      expect(Object.keys(result?.cardSetsProgress || {})).toHaveLength(2);
    });

    it('should return null when user document does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      const result =
        await FirestoreOptimizationMigration.loadOptimizedProfile(testUserId);

      expect(result).toBeNull();
    });

    it('should initialize empty cardSetsProgress if missing', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUserProfile, // No cardSetsProgress field
      });

      const result =
        await FirestoreOptimizationMigration.loadOptimizedProfile(testUserId);

      expect(result?.cardSetsProgress).toEqual({});
    });

    it('should handle errors gracefully', async () => {
      mockGetDoc.mockRejectedValue(new Error('Network error'));

      const result =
        await FirestoreOptimizationMigration.loadOptimizedProfile(testUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateCardSetProgress', () => {
    it('should update progress for specific card set', async () => {
      const progressUpdate: CardSetProgress = {
        cardSetId: 'business_chinese',
        totalCards: 50,
        reviewedCards: 30,
        progressPercentage: 60,
        lastReviewDate: new Date('2024-01-16'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-16'),
      };

      mockSetDoc.mockResolvedValueOnce(undefined);

      const result = await FirestoreOptimizationMigration.updateCardSetProgress(
        testUserId,
        'business_chinese',
        progressUpdate
      );

      expect(result).toBe(true);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'cardSetsProgress.business_chinese': expect.objectContaining({
            cardSetId: 'business_chinese',
            reviewedCards: 30,
            progressPercentage: 60,
          }),
        }),
        { merge: true }
      );
    });

    it('should handle update errors', async () => {
      const progressUpdate: CardSetProgress = mockProgressData[0];

      mockSetDoc.mockRejectedValue(new Error('Update failed'));

      const result = await FirestoreOptimizationMigration.updateCardSetProgress(
        testUserId,
        'business_chinese',
        progressUpdate
      );

      expect(result).toBe(false);
    });
  });

  describe('autoMigrateAndLoadProfile', () => {
    it('should migrate and load profile when migration is needed', async () => {
      // Mock migration needed
      const needsMigrationSpy = vi
        .spyOn(FirestoreOptimizationMigration, 'needsMigration')
        .mockResolvedValueOnce(true);

      const migrationSpy = vi
        .spyOn(FirestoreOptimizationMigration, 'migrateToOptimizedStructure')
        .mockResolvedValueOnce({
          success: true,
          migratedCardSets: ['business_chinese'],
          errors: [],
          totalReadOperations: 2,
          totalWriteOperations: 2,
        });

      const loadSpy = vi
        .spyOn(FirestoreOptimizationMigration, 'loadOptimizedProfile')
        .mockResolvedValueOnce({
          ...mockUserProfile,
          cardSetsProgress: { business_chinese: mockProgressData[0] },
          migrationVersion: 1,
          lastMigrationDate: new Date(),
        });

      const result =
        await FirestoreOptimizationMigration.autoMigrateAndLoadProfile(
          testUserId
        );

      expect(needsMigrationSpy).toHaveBeenCalledWith(testUserId);
      expect(migrationSpy).toHaveBeenCalledWith(testUserId);
      expect(loadSpy).toHaveBeenCalledWith(testUserId);
      expect(result).toBeDefined();
      expect(result?.cardSetsProgress).toBeDefined();
    });

    it('should load profile directly when no migration is needed', async () => {
      const needsMigrationSpy = vi
        .spyOn(FirestoreOptimizationMigration, 'needsMigration')
        .mockResolvedValueOnce(false);

      const migrationSpy = vi.spyOn(
        FirestoreOptimizationMigration,
        'migrateToOptimizedStructure'
      );

      const loadSpy = vi
        .spyOn(FirestoreOptimizationMigration, 'loadOptimizedProfile')
        .mockResolvedValueOnce({
          ...mockUserProfile,
          cardSetsProgress: {},
          migrationVersion: 1,
          lastMigrationDate: new Date(),
        });

      const result =
        await FirestoreOptimizationMigration.autoMigrateAndLoadProfile(
          testUserId
        );

      expect(needsMigrationSpy).toHaveBeenCalledWith(testUserId);
      expect(migrationSpy).not.toHaveBeenCalled();
      expect(loadSpy).toHaveBeenCalledWith(testUserId);
      expect(result).toBeDefined();
    });

    it('should attempt to load profile even if migration fails', async () => {
      vi.spyOn(
        FirestoreOptimizationMigration,
        'needsMigration'
      ).mockResolvedValueOnce(true);

      const migrationSpy = vi
        .spyOn(FirestoreOptimizationMigration, 'migrateToOptimizedStructure')
        .mockResolvedValueOnce({
          success: false,
          migratedCardSets: [],
          errors: ['Migration error'],
          totalReadOperations: 1,
          totalWriteOperations: 0,
        });

      const loadSpy = vi
        .spyOn(FirestoreOptimizationMigration, 'loadOptimizedProfile')
        .mockResolvedValueOnce(null);

      const result =
        await FirestoreOptimizationMigration.autoMigrateAndLoadProfile(
          testUserId
        );

      expect(migrationSpy).toHaveBeenCalled();
      expect(loadSpy).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
