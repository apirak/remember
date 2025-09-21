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

// Card set specific progress tracking
// This interface tracks progress independently for each card set
export interface CardSetProgress {
  cardSetId: string; // Unique identifier for the card set
  totalCards: number; // Total number of cards in this set
  dueCards: number; // Cards that are due for review today
  masteredCards: number; // Cards that have been mastered (high ease factor)
  difficultCards: number; // Cards that are marked as difficult (low ease factor)
  reviewsToday: number; // Number of cards reviewed today in this set
  lastReviewDate: Date | null; // When this card set was last reviewed
  dailyGoal: number; // Daily review goal for this card set (default: 10)
  currentStreak: number; // Consecutive days of meeting daily goal
  createdAt: Date; // When progress tracking started for this set
  updatedAt: Date; // Last time progress was updated
}

// Application state for the flashcard context
export interface FlashcardContextState {
  // Card management
  allCards: Flashcard[];
  dueCards: Flashcard[];

  // Current session
  currentSession: ReviewSession | null;
  currentCard: Flashcard | null;

  // Card set management
  currentCardSet: {
    id: string;
    name: string;
    cover: string;
    dataFile: string;
  } | null;

  // Track last successfully loaded card set for error recovery
  lastWorkingCardSet: {
    id: string;
    name: string;
    cover: string;
    dataFile: string;
  } | null;

  // UI state
  isLoading: boolean;
  isShowingBack: boolean;

  // Enhanced loading states for different operations
  loadingStates: {
    fetchingCards: boolean;
    savingProgress: boolean;
    creatingCard: boolean;
    deletingCard: boolean;
    migrating: boolean;
  };

  // Data source and sync status
  dataSource: "session" | "firestore" | "fallback";
  syncStatus: "idle" | "syncing" | "error" | "offline";
  lastSyncTime: Date | null;

  // Error handling
  error: AppError | null;
  pendingOperations: PendingOperation[];

  // Migration status
  migrationStatus: "none" | "pending" | "in-progress" | "completed" | "failed";

  // Progress statistics
  stats: {
    totalCards: number;
    dueCards: number;
    masteredCards: number;
    difficultCards: number;
    reviewsToday: number;
  };

  // User state (for Firebase integration)
  isGuest: boolean;
  user: any | null;
}

// Action types for context reducer
export type FlashcardAction =
  | { type: "LOAD_CARDS"; payload: Flashcard[] }
  | { type: "START_REVIEW_SESSION"; payload: Flashcard[] }
  | { type: "SHOW_CARD_BACK" }
  | { type: "RATE_CARD"; payload: { cardId: string; quality: number } }
  | { type: "NEXT_CARD" }
  | { type: "COMPLETE_SESSION" }
  | { type: "RESET_SESSION" }
  | { type: "RESET_TODAY_PROGRESS" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "UPDATE_STATS" }
  // Enhanced loading states
  | {
      type: "SET_LOADING_STATE";
      payload: {
        key: keyof FlashcardContextState["loadingStates"];
        value: boolean;
      };
    }
  // Data source and sync management
  | { type: "SET_DATA_SOURCE"; payload: "session" | "firestore" | "fallback" }
  | {
      type: "SET_SYNC_STATUS";
      payload: "idle" | "syncing" | "error" | "offline";
    }
  | { type: "SET_LAST_SYNC_TIME"; payload: Date }
  // Error handling
  | { type: "SET_ERROR"; payload: AppError | null }
  | { type: "CLEAR_ERROR" }
  | { type: "ADD_PENDING_OPERATION"; payload: PendingOperation }
  | { type: "REMOVE_PENDING_OPERATION"; payload: string }
  | { type: "RETRY_PENDING_OPERATIONS" }
  // Migration
  | {
      type: "SET_MIGRATION_STATUS";
      payload: "none" | "pending" | "in-progress" | "completed" | "failed";
    }
  // User authentication
  | { type: "SET_USER"; payload: { user: any; isGuest: boolean } }
  // Card set management
  | {
      type: "SET_CURRENT_CARD_SET";
      payload: {
        id: string;
        name: string;
        cover: string;
        dataFile: string;
      } | null;
    }
  | {
      type: "SET_LAST_WORKING_CARD_SET";
      payload: {
        id: string;
        name: string;
        cover: string;
        dataFile: string;
      } | null;
    };

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
export type AppRoute = "dashboard" | "review" | "complete";

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

// Specific error codes for better error handling and user feedback
export type ErrorCode =
  | "CONTEXT_ERROR" // Generic context errors
  | "CARD_SET_NOT_FOUND" // Card set file doesn't exist
  | "CARD_SET_INVALID_DATA" // Card set data is corrupted/invalid
  | "CARD_SET_LOAD_FAILED" // General loading failure
  | "CARD_SET_EMPTY" // Card set contains no valid cards
  | "FIRESTORE_ERROR" // Firebase/Firestore related errors
  | "NETWORK_ERROR" // Network connectivity issues
  | "SESSION_ERROR"; // Review session related errors

// Helper function to create specific card set errors with user-friendly messages
export interface CardSetError extends AppError {
  cardSetId?: string;
  dataFile?: string;
}

// Pending operation for offline/fallback support
export interface PendingOperation {
  id: string;
  type: "rate_card" | "add_card" | "edit_card" | "delete_card" | "migrate_data";
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

// Export utility type for transforming raw flashcard data to full flashcard
export type FlashcardTransform = (data: FlashcardData) => Flashcard;
