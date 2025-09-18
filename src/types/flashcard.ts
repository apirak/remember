// TypeScript type definitions for the flashcard application

// Core flashcard data structure
export interface FlashcardContent {
  icon: string;
  title: string;
  description: string;
}

export interface FlashcardData {
  id: string;
  front: FlashcardContent;
  back: FlashcardContent;
}

// Enhanced flashcard with SM-2 parameters and progress tracking
export interface Flashcard extends FlashcardData {
  // SM-2 spaced repetition parameters
  easinessFactor: number;
  repetitions: number;
  interval: number;
  nextReviewDate: Date;
  lastReviewDate: Date;
  totalReviews: number;
  correctStreak: number;
  averageQuality: number;
  
  // Additional metadata
  createdAt: Date;
  updatedAt: Date;
  isNew: boolean;
}

// Review session state
export interface ReviewSession {
  cards: Flashcard[];
  currentIndex: number;
  isShowingBack: boolean;
  isComplete: boolean;
  startTime: Date;
  totalCards: number; // Original number of unique cards to review
  reviewedCards: number; // Unique cards that have been completed (not added back to queue)
  easyCount: number; // Count of "Easy" responses (Got It + I Know)
  hardCount: number; // Count of "Hard" responses 
  againCount: number; // Count of "Again" responses
  reviewedCardIds: Set<string>; // Track which unique cards have been completed
}

// Application state for the flashcard context
export interface FlashcardContextState {
  // Card management
  allCards: Flashcard[];
  dueCards: Flashcard[];
  
  // Current session
  currentSession: ReviewSession | null;
  currentCard: Flashcard | null;
  
  // UI state
  isLoading: boolean;
  isShowingBack: boolean;
  
  // Progress statistics
  stats: {
    totalCards: number;
    dueCards: number;
    masteredCards: number;
    difficultCards: number;
    reviewsToday: number;
  };
  
  // User state (for later Firebase integration)
  isGuest: boolean;
  user: any | null;
}

// Action types for context reducer
export type FlashcardAction =
  | { type: 'LOAD_CARDS'; payload: Flashcard[] }
  | { type: 'START_REVIEW_SESSION'; payload: Flashcard[] }
  | { type: 'SHOW_CARD_BACK' }
  | { type: 'RATE_CARD'; payload: { cardId: string; quality: number } }
  | { type: 'NEXT_CARD' }
  | { type: 'COMPLETE_SESSION' }
  | { type: 'RESET_SESSION' }
  | { type: 'RESET_TODAY_PROGRESS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_STATS' };

// Review statistics for dashboard display
export interface ReviewStats {
  totalCards: number;
  dueCards: number;
  masteredCards: number; // Cards with easinessFactor >= 2.5 and interval >= 21
  difficultCards: number; // Cards with easinessFactor < 1.8
  reviewsToday: number;
  averageEasinessFactor: number;
  totalReviews: number;
  averageQuality: number;
}

// Router navigation types
export type AppRoute = 'dashboard' | 'review' | 'complete';

// Component props interfaces
export interface DashboardProps {
  stats: ReviewStats;
  onStartReview: () => void;
  onResetProgress: () => void;
}

export interface FlashcardProps {
  card: Flashcard;
  isShowingBack: boolean;
  onShowBack: () => void;
  onKnowCard: () => void;
}

export interface ReviewControlsProps {
  isShowingBack: boolean;
  onRate: (quality: number) => void;
  onShowBack: () => void;
  onKnowCard: () => void;
}

export interface CompletionProps {
  session: ReviewSession;
  onReturnToDashboard: () => void;
  onReviewAgain: () => void;
}

// Error handling types
export interface AppError {
  code: string;
  message: string;
  retryable: boolean;
  timestamp: Date;
  context?: any;
}

// Export utility type for transforming raw flashcard data to full flashcard
export type FlashcardTransform = (data: FlashcardData) => Flashcard;