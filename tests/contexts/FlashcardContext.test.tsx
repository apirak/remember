// Integration tests for FlashcardContext card set persistence
// Tests the full flow of saving/loading card sets through context

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  FlashcardProvider,
  useFlashcard,
} from '../../src/contexts/FlashcardContext';
import * as cardSetLoader from '../../src/utils/cardSetLoader';

// Mock card set loader for fetch-based loading
vi.mock('../../src/utils/cardSetLoader', () => ({
  loadCardSetDataWithFetch: vi.fn(),
}));

// Mock Firebase to avoid real authentication
vi.mock('../../src/utils/auth', () => ({
  onAuthStateChange: vi.fn((_callback) => {
    // Return unsubscribe function
    return () => {};
  }),
}));

vi.mock('../../src/utils/firebase', () => ({
  auth: {},
  db: {},
}));

describe('FlashcardContext Card Set Persistence', () => {
  const mockCardSet1 = {
    id: 'chinese_essentials_1',
    name: 'Chinese Essentials 1',
    description: 'Basic everyday communication',
    cover: '🇨🇳',
    cardCount: 50,
    category: 'language_basics',
    tags: ['chinese', 'communication', 'beginner'],
    dataFile: 'chinese_essentials_in_communication_1.json',
    author: 'Test Author',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockCardSet2 = {
    id: 'chinese_essentials_2',
    name: 'Chinese Essentials 2',
    description: 'Intermediate communication',
    cover: '🏮',
    cardCount: 75,
    category: 'language_intermediate',
    tags: ['chinese', 'communication', 'intermediate'],
    dataFile: 'chinese_essentials_in_communication_2.json',
    author: 'Test Author',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();

    // Mock card set loader for different files
    (cardSetLoader.loadCardSetDataWithFetch as any).mockImplementation(
      (filename: string) => {
        switch (filename) {
          case 'flashcards.json':
            return Promise.resolve([
              {
                id: 'test-1',
                front: 'Test Front 1',
                back: 'Test Back 1',
              },
            ]);
          case 'chinese_essentials_in_communication_1.json':
            return Promise.resolve([
              {
                id: 'ce1-1',
                front: 'Hello',
                back: 'Nǐ hǎo',
              },
            ]);
          case 'chinese_essentials_in_communication_2.json':
            return Promise.resolve([
              {
                id: 'ce2-1',
                front: 'Goodbye',
                back: 'Zàijiàn',
              },
            ]);
          default:
            return Promise.reject(new Error(`File not found: ${filename}`));
        }
      }
    );
  });

  const renderHookWithProvider = <T,>(hook: () => T) => {
    return renderHook(hook, {
      wrapper: ({ children }) => (
        <FlashcardProvider>{children}</FlashcardProvider>
      ),
    });
  };

  describe('Initial card set loading', () => {
    it('should load default card set when no saved data exists', () => {
      const { result } = renderHookWithProvider(() => useFlashcard());

      expect(result.current.state.currentCardSet).toEqual(mockCardSet1);
    });

    it('should load saved card set from localStorage on initialization', () => {
      // Pre-populate localStorage
      localStorage.setItem(
        'remember_last_card_set',
        JSON.stringify(mockCardSet2)
      );

      const { result } = renderHookWithProvider(() => useFlashcard());

      expect(result.current.state.currentCardSet).toEqual(mockCardSet2);
    });

    it('should fall back to default when localStorage contains invalid data', () => {
      // Set invalid data
      localStorage.setItem('remember_last_card_set', 'invalid-json');

      const { result } = renderHookWithProvider(() => useFlashcard());

      expect(result.current.state.currentCardSet).toEqual(mockCardSet1);
    });
  });

  describe('Card set selection and persistence', () => {
    it('should update context and save to localStorage when card set changes', async () => {
      const { result } = renderHookWithProvider(() => useFlashcard());

      // Change card set
      await act(async () => {
        result.current.setSelectedCardSet(mockCardSet2);
      });

      // Check context updated
      expect(result.current.state.selectedCardSet).toEqual(mockCardSet2);

      // Check localStorage updated
      const stored = localStorage.getItem('remember_last_card_set');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockCardSet2);
    });

    it('should not save to localStorage when setting null card set', async () => {
      const { result } = renderHookWithProvider(() => useFlashcard());

      // Set card set to null
      await act(async () => {
        result.current.setCurrentCardSet(null);
      });

      // Check context updated
      expect(result.current.state.currentCardSet).toBeNull();

      // Check localStorage not updated (should remain empty)
      expect(localStorage.getItem('remember_last_card_set')).toBeNull();
    });

    it('should handle localStorage errors gracefully during save', async () => {
      // Mock localStorage.setItem to throw error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHookWithProvider(() => useFlashcard());

      // Should not throw error
      await act(async () => {
        expect(() => {
          result.current.setCurrentCardSet(mockCardSet2);
        }).not.toThrow();
      });

      // Context should still be updated
      expect(result.current.state.currentCardSet).toEqual(mockCardSet2);

      setItemSpy.mockRestore();
    });
  });

  describe('Card data loading with persistence', () => {
    it('should load card data when card set changes', async () => {
      const { result } = renderHookWithProvider(() => useFlashcard());

      // Wait for initial load
      await act(async () => {
        // Give time for useEffect to run
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Initially should have default cards
      expect(result.current.state.allCards.length).toBeGreaterThan(0);

      // Change card set
      await act(async () => {
        result.current.setCurrentCardSet(mockCardSet2);
      });

      // Wait for new data to load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should have loaded different cards (mocked data)
      expect(result.current.state.currentCardSet).toEqual(mockCardSet2);
    });
  });

  describe('Persistence across context recreation', () => {
    it('should restore card set when context is recreated', () => {
      // First context instance - set card set
      const { result: result1, unmount } = renderHookWithProvider(() =>
        useFlashcard()
      );

      act(() => {
        result1.current.setCurrentCardSet(mockCardSet2);
      });

      expect(result1.current.state.currentCardSet).toEqual(mockCardSet2);

      // Unmount first context
      unmount();

      // Create new context instance - should restore from localStorage
      const { result: result2 } = renderHookWithProvider(() => useFlashcard());

      expect(result2.current.state.currentCardSet).toEqual(mockCardSet2);
    });
  });

  describe('Error recovery scenarios', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      // Set corrupted data
      localStorage.setItem('remember_last_card_set', '{"id":"test"}'); // Missing required fields

      const { result } = renderHookWithProvider(() => useFlashcard());

      // Should fall back to default
      expect(result.current.state.currentCardSet).toEqual(mockCardSet1);
    });

    it('should continue working when localStorage is unavailable', () => {
      // Mock localStorage to be unavailable
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available');
        },
      });

      const { result } = renderHookWithProvider(() => useFlashcard());

      // Should still work with default card set
      expect(result.current.state.currentCardSet).toEqual(mockCardSet1);

      // Should handle setCurrentCardSet without errors
      act(() => {
        expect(() => {
          result.current.setCurrentCardSet(mockCardSet2);
        }).not.toThrow();
      });

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });
});
