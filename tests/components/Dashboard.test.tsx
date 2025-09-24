// Tests for Dashboard component
// Tests button states and interactions during loading and review start

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../../src/components/flashcard/Dashboard';

// Mock the useFlashcard hook
vi.mock('../../src/contexts/FlashcardContext', () => ({
  MAX_REVIEW_CARDS: 10,
  useFlashcard: vi.fn(),
}));

// Mock LoginButton component
vi.mock('../../src/components/auth/LoginButton', () => ({
  default: () => <div data-testid="login-button">Login Button</div>,
}));

// Mock EmojiText component
vi.mock('../../src/components/EmojiSVG', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

import { useFlashcard } from '../../src/contexts/FlashcardContext';

describe('Dashboard Component', () => {
  const mockOnNavigate = vi.fn();
  const mockStartReviewSession = vi.fn();
  const mockResetTodayProgress = vi.fn();
  const mockClearError = vi.fn();

  const defaultMockState = {
    isLoading: false,
    stats: {
      dueCards: 5,
      totalCards: 20,
      masteredCards: 10,
      difficultCards: 2,
      reviewsToday: 3,
    },
    dueCards: [
      {
        id: 'card1',
        front: 'Front 1',
        back: 'Back 1',
        nextReviewDate: new Date(),
      },
      {
        id: 'card2',
        front: 'Front 2',
        back: 'Back 2',
        nextReviewDate: new Date(),
      },
    ],
    loadingStates: {
      savingProgress: false,
    },
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    (useFlashcard as any).mockReturnValue({
      state: defaultMockState,
      startReviewSession: mockStartReviewSession,
      resetTodayProgress: mockResetTodayProgress,
      clearError: mockClearError,
    });
  });

  describe('Start Review Button States', () => {
    it('should enable Start Review button when not loading and has due cards', () => {
      render(<Dashboard onNavigate={mockOnNavigate} />);

      const startButton = screen.getByRole('button', { name: /start review/i });
      expect(startButton).not.toBeDisabled();
      expect(startButton).toHaveTextContent('Start Review');
    });

    it('should disable Start Review button when no due cards', () => {
      (useFlashcard as any).mockReturnValue({
        state: {
          ...defaultMockState,
          stats: {
            ...defaultMockState.stats,
            dueCards: 0,
          },
        },
        startReviewSession: mockStartReviewSession,
        resetTodayProgress: mockResetTodayProgress,
        clearError: mockClearError,
      });

      render(<Dashboard onNavigate={mockOnNavigate} />);

      const startButton = screen.getByRole('button', {
        name: /done.*tomorrow/i,
      });
      expect(startButton).toBeDisabled();
      expect(startButton).toHaveTextContent('Done! See you tomorrow');
    });
  });

  describe('Start Review Button Interactions', () => {
    it('should call startReviewSession and navigate when clicked and not loading', () => {
      render(<Dashboard onNavigate={mockOnNavigate} />);

      const startButton = screen.getByRole('button', { name: /start review/i });
      fireEvent.click(startButton);

      expect(mockStartReviewSession).toHaveBeenCalledTimes(1);
      expect(mockOnNavigate).toHaveBeenCalledWith('review');
    });
  });

  describe('Loading State', () => {
    it('should show loading screen when isLoading is true', () => {
      (useFlashcard as any).mockReturnValue({
        state: {
          ...defaultMockState,
          isLoading: true,
        },
        startReviewSession: mockStartReviewSession,
        resetTodayProgress: mockResetTodayProgress,
        clearError: mockClearError,
      });

      render(<Dashboard onNavigate={mockOnNavigate} />);

      expect(screen.getByText('Loading flashcards...')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /start review/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Card Count Display', () => {
    it('should show card count when not loading and has due cards', () => {
      render(<Dashboard onNavigate={mockOnNavigate} />);

      expect(
        screen.getByText('5 cards ready for today. 🚀')
      ).toBeInTheDocument();
    });

    it('should not show card count when loading', () => {
      (useFlashcard as any).mockReturnValue({
        state: {
          ...defaultMockState,
          isLoading: true,
        },
        startReviewSession: mockStartReviewSession,
        resetTodayProgress: mockResetTodayProgress,
        clearError: mockClearError,
      });

      render(<Dashboard onNavigate={mockOnNavigate} />);

      expect(
        screen.queryByText(/cards ready for today/i)
      ).not.toBeInTheDocument();
    });

    it('should not show card count when no due cards', () => {
      (useFlashcard as any).mockReturnValue({
        state: {
          ...defaultMockState,
          stats: {
            ...defaultMockState.stats,
            dueCards: 0,
          },
        },
        startReviewSession: mockStartReviewSession,
        resetTodayProgress: mockResetTodayProgress,
        clearError: mockClearError,
      });

      render(<Dashboard onNavigate={mockOnNavigate} />);

      expect(
        screen.queryByText(/cards ready for today/i)
      ).not.toBeInTheDocument();
    });
  });
});
