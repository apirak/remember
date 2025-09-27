/**
 * Unit Tests for User Profile Service Functions
 * Tests CRUD operations for user profile data in Firestore
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FlashcardService } from '../../src/services/flashcardService';
import { getCurrentUser } from '../../src/utils/auth';
import type { UserProfile } from '../../src/types/flashcard';

// Mock Firebase functions
vi.mock('../../src/utils/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('../../src/utils/firebase', () => ({
  firestore: {}, // Mock firestore instance
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ isEqual: () => true })),
}));

const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
};

const mockUserProfile: UserProfile = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2024-01-02'),
  totalReviewsCount: 50,
  preferredLanguage: 'th',
  theme: 'dark',
  migratedFromGuest: true,
  migrationDate: new Date('2024-01-01'),
  isActive: true,
};

describe('FlashcardService - User Profile Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('saveUserProfile', () => {
    it('should save user profile successfully', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const { setDoc } = await import('firebase/firestore');
      const mockSetDoc = vi.mocked(setDoc);
      mockSetDoc.mockResolvedValue(undefined);

      // Act
      const result = await FlashcardService.saveUserProfile(mockUserProfile);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);

      // Check the call arguments
      const callArgs = mockSetDoc.mock.calls[0];
      const actualData = callArgs[1];
      const options = callArgs[2];

      expect(actualData).toMatchObject({
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        isActive: true,
      });
      expect(options).toEqual({ merge: true });
    });

    it('should fail when user is not authenticated', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(null);

      // Act
      const result = await FlashcardService.saveUserProfile(mockUserProfile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('User must be authenticated');
    });

    it('should fail when profile UID does not match current user', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const invalidProfile = {
        ...mockUserProfile,
        uid: 'different-user-123',
      };

      // Act
      const result = await FlashcardService.saveUserProfile(invalidProfile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Profile UID must match authenticated user ID'
      );
    });

    it('should handle Firestore errors gracefully', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const { setDoc } = await import('firebase/firestore');
      const mockSetDoc = vi.mocked(setDoc);
      mockSetDoc.mockRejectedValue(new Error('Firestore connection failed'));

      // Act
      const result = await FlashcardService.saveUserProfile(mockUserProfile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Firestore connection failed');
    });
  });

  describe('loadUserProfile', () => {
    it('should load user profile successfully', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const { getDoc } = await import('firebase/firestore');
      const mockGetDoc = vi.mocked(getDoc);

      const mockDocData = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        createdAt: { toDate: () => new Date('2024-01-01') },
        lastLoginAt: { toDate: () => new Date('2024-01-02') },
        totalReviewsCount: 50,
        preferredLanguage: 'th',
        theme: 'dark',
        migratedFromGuest: true,
        migrationDate: { toDate: () => new Date('2024-01-01') },
        isActive: true,
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockDocData,
      } as any);

      // Act
      const result = await FlashcardService.loadUserProfile();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          uid: 'test-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          totalReviewsCount: 50,
          preferredLanguage: 'th',
          theme: 'dark',
          migratedFromGuest: true,
          isActive: true,
        })
      );
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });

    it('should return null when profile does not exist', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const { getDoc } = await import('firebase/firestore');
      const mockGetDoc = vi.mocked(getDoc);
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      // Act
      const result = await FlashcardService.loadUserProfile();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it('should fail when user is not authenticated', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(null);

      // Act
      const result = await FlashcardService.loadUserProfile();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('User must be authenticated');
    });

    it('should prevent loading other users profiles', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      // Act
      const result =
        await FlashcardService.loadUserProfile('different-user-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Can only load own profile data');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const { setDoc } = await import('firebase/firestore');
      const mockSetDoc = vi.mocked(setDoc);
      mockSetDoc.mockResolvedValue(undefined);

      const updates = {
        displayName: 'Updated Name',
        preferredLanguage: 'en' as const,
        theme: 'light' as const,
        totalReviewsCount: 100,
      };

      // Act
      const result = await FlashcardService.updateUserProfile(updates);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);

      // Check the call arguments
      const callArgs = mockSetDoc.mock.calls[0];
      const actualData = callArgs[1];
      const options = callArgs[2];

      expect(actualData).toMatchObject({
        displayName: 'Updated Name',
        preferredLanguage: 'en',
        theme: 'light',
        totalReviewsCount: 100,
        uid: 'test-user-123', // Security: UID should be forced to current user
      });
      expect(options).toEqual({ merge: true });
    });

    it('should filter out undefined values', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const { setDoc } = await import('firebase/firestore');
      const mockSetDoc = vi.mocked(setDoc);
      mockSetDoc.mockResolvedValue(undefined);

      const updates = {
        displayName: 'Updated Name',
        preferredLanguage: undefined,
        theme: 'light' as const,
      };

      // Act
      const result = await FlashcardService.updateUserProfile(updates);

      // Assert
      expect(result.success).toBe(true);
      const callArgs = mockSetDoc.mock.calls[0];
      const updateData = callArgs[1];

      // Should not contain preferredLanguage since it was undefined
      expect(updateData).not.toHaveProperty('preferredLanguage');
      expect(updateData).toHaveProperty('displayName', 'Updated Name');
      expect(updateData).toHaveProperty('theme', 'light');
    });

    it('should fail when user is not authenticated', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(null);

      // Act
      const result = await FlashcardService.updateUserProfile({});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('User must be authenticated');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const { setDoc } = await import('firebase/firestore');
      const mockSetDoc = vi.mocked(setDoc);
      mockSetDoc.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await FlashcardService.saveUserProfile(mockUserProfile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle unknown errors with fallback message', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const { setDoc } = await import('firebase/firestore');
      const mockSetDoc = vi.mocked(setDoc);
      mockSetDoc.mockRejectedValue('Unknown error');

      // Act
      const result = await FlashcardService.saveUserProfile(mockUserProfile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Failed to save user profile to Firestore'
      );
    });
  });

  describe('Security Validations', () => {
    it('should enforce UID security in profile save', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const maliciousProfile = {
        ...mockUserProfile,
        uid: 'malicious-user-id',
      };

      // Act
      const result = await FlashcardService.saveUserProfile(maliciousProfile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Profile UID must match authenticated user ID'
      );
    });

    it('should enforce UID security in profile update', async () => {
      // Arrange
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockReturnValue(mockUser as any);

      const { setDoc } = await import('firebase/firestore');
      const mockSetDoc = vi.mocked(setDoc);
      mockSetDoc.mockResolvedValue(undefined);

      const updates = {
        uid: 'malicious-user-id', // Try to change UID
        displayName: 'Hacker',
      };

      // Act
      const result = await FlashcardService.updateUserProfile(updates);

      // Assert
      expect(result.success).toBe(true);
      const callArgs = mockSetDoc.mock.calls[0];
      const updateData = callArgs[1];

      // Should force UID to current user, not allow changing it
      expect(updateData).toHaveProperty('uid', 'test-user-123');
    });
  });
});
