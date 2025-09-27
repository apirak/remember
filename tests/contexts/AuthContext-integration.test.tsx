/**
 * Integration Tests for Authentication with User Profile Auto-save
 * Tests the complete auth flow with automatic profile creation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import React from 'react';

// Mock Firebase and related dependencies
vi.mock('../../src/utils/auth', () => ({
  onAuthStateChange: vi.fn(),
  createUserProfile: vi.fn(),
  signOutUser: vi.fn(),
}));

vi.mock('../../src/services/flashcardService', () => ({
  FlashcardService: {
    saveUserProfile: vi.fn(),
  },
}));

const mockFirebaseUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
};

const mockUserProfile = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  createdAt: new Date(),
  lastLoginAt: new Date(),
  totalReviewsCount: 0,
  preferredLanguage: 'en',
  theme: 'system' as const,
  migratedFromGuest: false,
  isActive: true,
};

describe('AuthContext - User Profile Integration', () => {
  let mockAuthStateCallback: ((user: any) => void) | null = null;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock onAuthStateChange to capture the callback
    const mockOnAuthStateChange = vi.mocked(
      (await import('../../src/utils/auth')).onAuthStateChange
    );
    mockOnAuthStateChange.mockImplementation((callback) => {
      mockAuthStateCallback = callback;
      return () => {}; // Unsubscribe function
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    mockAuthStateCallback = null;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('Auto-save User Profile on Sign In', () => {
    it('should auto-save user profile when user signs in', async () => {
      // Arrange
      const mockCreateUserProfile = vi.mocked(
        (await import('../../src/utils/auth')).createUserProfile
      );
      const mockFlashcardService = vi.mocked(
        (await import('../../src/services/flashcardService')).FlashcardService
      );

      mockCreateUserProfile.mockReturnValue(mockUserProfile);
      mockFlashcardService.saveUserProfile.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initial state should be guest mode
      expect(result.current.state.isGuest).toBe(true);
      expect(result.current.state.user).toBe(null);

      // Act - Simulate Firebase user sign in
      await act(async () => {
        if (mockAuthStateCallback) {
          await mockAuthStateCallback(mockFirebaseUser);
        }
      });

      // Assert
      expect(mockCreateUserProfile).toHaveBeenCalledWith(mockFirebaseUser);
      expect(mockFlashcardService.saveUserProfile).toHaveBeenCalledWith(
        mockUserProfile
      );
      expect(result.current.state.isGuest).toBe(false);
      expect(result.current.state.user).toEqual(mockFirebaseUser);
      expect(result.current.state.authError).toBe(null);
    });

    it('should continue authentication even if profile save fails', async () => {
      // Arrange
      const mockCreateUserProfile = vi.mocked(
        (await import('../../src/utils/auth')).createUserProfile
      );
      const mockFlashcardService = vi.mocked(
        (await import('../../src/services/flashcardService')).FlashcardService
      );

      mockCreateUserProfile.mockReturnValue(mockUserProfile);
      mockFlashcardService.saveUserProfile.mockResolvedValue({
        success: false,
        error: 'Firestore connection failed',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act - Simulate Firebase user sign in with profile save failure
      await act(async () => {
        if (mockAuthStateCallback) {
          await mockAuthStateCallback(mockFirebaseUser);
        }
      });

      // Assert - Authentication should succeed despite profile save failure
      expect(result.current.state.isGuest).toBe(false);
      expect(result.current.state.user).toEqual(mockFirebaseUser);
      expect(result.current.state.authError).toBe(null); // No auth error for profile save failure
    });

    it('should handle profile save network errors gracefully', async () => {
      // Arrange
      const mockCreateUserProfile = vi.mocked(
        (await import('../../src/utils/auth')).createUserProfile
      );
      const mockFlashcardService = vi.mocked(
        (await import('../../src/services/flashcardService')).FlashcardService
      );

      mockCreateUserProfile.mockReturnValue(mockUserProfile);
      mockFlashcardService.saveUserProfile.mockRejectedValue(
        new Error('Network timeout')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act - Simulate Firebase user sign in with network error
      await act(async () => {
        if (mockAuthStateCallback) {
          await mockAuthStateCallback(mockFirebaseUser);
        }
      });

      // Assert - Authentication should still succeed
      expect(result.current.state.isGuest).toBe(false);
      expect(result.current.state.user).toEqual(mockFirebaseUser);
      // Should not block authentication on profile save error
    });

    it('should set loading states properly during profile save', async () => {
      // Arrange
      const mockCreateUserProfile = vi.mocked(
        (await import('../../src/utils/auth')).createUserProfile
      );
      const mockFlashcardService = vi.mocked(
        (await import('../../src/services/flashcardService')).FlashcardService
      );

      mockCreateUserProfile.mockReturnValue(mockUserProfile);

      // Create a promise that we can control the resolution timing
      let resolveProfileSave: (value: any) => void;
      const profileSavePromise = new Promise((resolve) => {
        resolveProfileSave = resolve;
      });
      mockFlashcardService.saveUserProfile.mockReturnValue(
        profileSavePromise as any
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act - Start the auth process
      const authPromise = act(async () => {
        if (mockAuthStateCallback) {
          await mockAuthStateCallback(mockFirebaseUser);
        }
      });

      // Should be loading during profile save
      expect(result.current.state.isAuthLoading).toBe(true);

      // Complete the profile save
      resolveProfileSave!({ success: true });
      await authPromise;

      // Should not be loading after completion
      expect(result.current.state.isAuthLoading).toBe(false);
    });
  });

  describe('Sign Out Flow', () => {
    it('should return to guest mode on sign out', async () => {
      // Arrange
      const mockSignOutUser = vi.mocked(
        (await import('../../src/utils/auth')).signOutUser
      );
      mockSignOutUser.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // First sign in
      await act(async () => {
        if (mockAuthStateCallback) {
          await mockAuthStateCallback(mockFirebaseUser);
        }
      });

      expect(result.current.state.isGuest).toBe(false);

      // Act - Sign out
      await act(async () => {
        await result.current.signOut();
      });

      // Simulate Firebase auth state change to null
      await act(async () => {
        if (mockAuthStateCallback) {
          await mockAuthStateCallback(null);
        }
      });

      // Assert
      expect(result.current.state.isGuest).toBe(true);
      expect(result.current.state.user).toBe(null);
      expect(mockSignOutUser).toHaveBeenCalledTimes(1);
    });

    it('should handle sign out errors properly', async () => {
      // Arrange
      const mockSignOutUser = vi.mocked(
        (await import('../../src/utils/auth')).signOutUser
      );
      mockSignOutUser.mockResolvedValue({
        success: false,
        error: 'Sign out failed',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act & Assert
      await act(async () => {
        await expect(result.current.signOut()).rejects.toThrow(
          'Sign out failed'
        );
      });

      expect(result.current.state.authError).toContain('Sign out failed');
    });
  });

  describe('Migration Status Management', () => {
    it('should allow setting migration status', async () => {
      // Arrange
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act
      act(() => {
        result.current.setMigrationStatus('in-progress');
      });

      // Assert
      expect(result.current.state.migrationStatus).toBe('in-progress');

      // Act
      act(() => {
        result.current.setMigrationStatus('completed');
      });

      // Assert
      expect(result.current.state.migrationStatus).toBe('completed');
    });

    it('should allow setting auth errors', async () => {
      // Arrange
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act
      act(() => {
        result.current.setAuthError('Test error message');
      });

      // Assert
      expect(result.current.state.authError).toBe('Test error message');

      // Act
      act(() => {
        result.current.clearAuthError();
      });

      // Assert
      expect(result.current.state.authError).toBe(null);
    });
  });

  describe('Component Integration', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      // Arrange & Act & Assert
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow(
        'useAuth must be used within an AuthProvider. Make sure your component is wrapped in an AuthProvider.'
      );
    });

    it('should provide all required context methods', () => {
      // Arrange
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      expect(typeof result.current.setUser).toBe('function');
      expect(typeof result.current.setMigrationStatus).toBe('function');
      expect(typeof result.current.setAuthLoading).toBe('function');
      expect(typeof result.current.setAuthError).toBe('function');
      expect(typeof result.current.clearAuthError).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(result.current.state).toBeDefined();
      expect(result.current.dispatch).toBeDefined();
    });
  });
});
