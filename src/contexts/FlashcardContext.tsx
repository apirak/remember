// FlashcardContext - React Context for managing flashcard state
// Handles card data, review sessions, and progress tracking

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react";
import type {
  FlashcardContextState,
  FlashcardAction,
  Flashcard,
  FlashcardData,
  ReviewSession,
} from "../types/flashcard";
import {
  initializeSM2Params,
  calculateSM2,
  QUALITY_RATINGS,
  type QualityRating,
} from "../utils/sm2";
import flashcardsData from "../data/flashcards.json";
import { transformFlashcardData } from "../utils/seedData";

// Helper functions for working with our Flashcard format

// Check if a card is due for review
const isFlashcardDue = (
  card: Flashcard,
  currentDate: Date = new Date()
): boolean => {
  return card.nextReviewDate <= currentDate;
};

// Get cards that are due for review
const getDueFlashcards = (cards: Flashcard[]): Flashcard[] => {
  const currentDate = new Date();
  return cards.filter((card) => isFlashcardDue(card, currentDate));
};

// Calculate review statistics for our flashcard format
const calculateFlashcardStats = (cards: Flashcard[]) => {
  const totalCards = cards.length;
  const dueCards = getDueFlashcards(cards).length;

  let masteredCards = 0;
  let difficultCards = 0;
  let totalReviews = 0;

  cards.forEach((card) => {
    // Mastered: has been reviewed at least once with correct answer (repetitions >= 1)
    // and has good easiness factor (>= 2.0) indicating successful learning
    if (card.repetitions >= 1 && card.easinessFactor >= 2.0 && !card.isNew) {
      masteredCards++;
    }

    // Difficult: easiness factor < 2.2 indicating cards that were rated as Hard
    if (card.easinessFactor < 2.2 && card.totalReviews > 0) {
      difficultCards++;
    }

    totalReviews += card.totalReviews;
  });

  return {
    totalCards,
    dueCards,
    masteredCards,
    difficultCards,
    totalReviews,
    averageEasinessFactor:
      cards.length > 0
        ? cards.reduce((sum, card) => sum + card.easinessFactor, 0) /
          cards.length
        : 0,
    averageQuality:
      cards.length > 0
        ? cards.reduce((sum, card) => sum + card.averageQuality, 0) /
          cards.length
        : 0,
  };
};

// Initial state
const initialState: FlashcardContextState = {
  allCards: [],
  dueCards: [],
  currentSession: null,
  currentCard: null,
  isLoading: false,
  isShowingBack: false,

  // Enhanced loading states
  loadingStates: {
    fetchingCards: false,
    savingProgress: false,
    creatingCard: false,
    deletingCard: false,
    migrating: false,
  },

  // Data source and sync status
  dataSource: "session",
  syncStatus: "idle",
  lastSyncTime: null,

  // Error handling
  error: null,
  pendingOperations: [],

  // Migration status
  migrationStatus: "none",

  stats: {
    totalCards: 0,
    dueCards: 0,
    masteredCards: 0,
    difficultCards: 0,
    reviewsToday: 0,
  },
  isGuest: true,
  user: null,
};

// Reducer function to manage state updates
const flashcardReducer = (
  state: FlashcardContextState,
  action: FlashcardAction
): FlashcardContextState => {
  switch (action.type) {
    case "LOAD_CARDS": {
      const allCards = action.payload;
      const dueCards = getDueFlashcards(allCards);
      const stats = calculateFlashcardStats(allCards);

      return {
        ...state,
        allCards,
        dueCards,
        stats: {
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          difficultCards: stats.difficultCards,
          reviewsToday: 0, // Will be calculated from session data
        },
        isLoading: false,
      };
    }

    case "START_REVIEW_SESSION": {
      const reviewCards = action.payload;

      if (reviewCards.length === 0) {
        return state;
      }

      const session: ReviewSession = {
        cards: [...reviewCards],
        currentIndex: 0,
        isShowingBack: false,
        isComplete: false,
        startTime: new Date(),
        totalCards: reviewCards.length,
        reviewedCards: 0,
        easyCount: 0,
        hardCount: 0,
        againCount: 0,
        reviewedCardIds: new Set<string>(),
      };

      return {
        ...state,
        currentSession: session,
        currentCard: reviewCards[0],
        isShowingBack: false,
      };
    }

    case "SHOW_CARD_BACK": {
      return {
        ...state,
        isShowingBack: true,
      };
    }

    case "RATE_CARD": {
      if (!state.currentSession || !state.currentCard) {
        return state;
      }

      const { cardId, quality } = action.payload;
      const currentCard = state.currentCard;

      // Update card with SM-2 algorithm
      const updatedCard: Flashcard = {
        ...currentCard,
        ...calculateSM2(currentCard, quality as QualityRating),
        updatedAt: new Date(),
        isNew: false,
      };

      // Update the card in allCards array
      const updatedAllCards = state.allCards.map((card) =>
        card.id === cardId ? updatedCard : card
      );

      // Clone session for updates
      const updatedSession = { ...state.currentSession };

      // Track response type based on quality
      if (quality === QUALITY_RATINGS.AGAIN) {
        updatedSession.againCount++;
        // Add card back to end of queue for re-review
        updatedSession.cards.push(updatedCard);
      } else if (quality === QUALITY_RATINGS.HARD) {
        updatedSession.hardCount++;
        // Card is completed - mark as reviewed
        updatedSession.reviewedCardIds.add(cardId);
        updatedSession.reviewedCards = updatedSession.reviewedCardIds.size;
      } else {
        // QUALITY_RATINGS.GOOD or QUALITY_RATINGS.EASY (I Know)
        updatedSession.easyCount++;
        // Card is completed - mark as reviewed
        updatedSession.reviewedCardIds.add(cardId);
        updatedSession.reviewedCards = updatedSession.reviewedCardIds.size;
      }

      // Check if session is complete
      const nextIndex = state.currentSession.currentIndex + 1;
      const isComplete = nextIndex >= updatedSession.cards.length;

      let nextCard = null;
      if (!isComplete && nextIndex < updatedSession.cards.length) {
        nextCard = updatedSession.cards[nextIndex];
      }

      // Recalculate due cards and stats after each rating
      const updatedDueCards = getDueFlashcards(updatedAllCards);
      const updatedStats = calculateFlashcardStats(updatedAllCards);

      return {
        ...state,
        allCards: updatedAllCards,
        dueCards: updatedDueCards,
        currentSession: isComplete
          ? { ...updatedSession, isComplete: true }
          : { ...updatedSession, currentIndex: nextIndex },
        currentCard: nextCard,
        isShowingBack: false,
        stats: {
          totalCards: updatedStats.totalCards,
          dueCards: updatedStats.dueCards,
          masteredCards: updatedStats.masteredCards,
          difficultCards: updatedStats.difficultCards,
          reviewsToday: state.stats.reviewsToday + 1,
        },
      };
    }

    case "NEXT_CARD": {
      if (!state.currentSession) {
        return state;
      }

      const nextIndex = state.currentSession.currentIndex + 1;
      const isComplete = nextIndex >= state.currentSession.cards.length;

      if (isComplete) {
        return {
          ...state,
          currentSession: { ...state.currentSession, isComplete: true },
          currentCard: null,
          isShowingBack: false,
        };
      }

      const nextCard = state.currentSession.cards[nextIndex];

      return {
        ...state,
        currentSession: { ...state.currentSession, currentIndex: nextIndex },
        currentCard: nextCard,
        isShowingBack: false,
      };
    }

    case "COMPLETE_SESSION": {
      // Recalculate due cards and stats after session completion
      const dueCards = getDueFlashcards(state.allCards);
      const stats = calculateFlashcardStats(state.allCards);

      return {
        ...state,
        dueCards,
        stats: {
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          difficultCards: stats.difficultCards,
          reviewsToday: state.stats.reviewsToday,
        },
      };
    }

    case "RESET_SESSION": {
      return {
        ...state,
        currentSession: null,
        currentCard: null,
        isShowingBack: false,
      };
    }

    case "SET_LOADING": {
      return {
        ...state,
        isLoading: action.payload,
      };
    }

    case "UPDATE_STATS": {
      const stats = calculateFlashcardStats(state.allCards);
      const dueCards = getDueFlashcards(state.allCards);

      return {
        ...state,
        dueCards,
        stats: {
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          difficultCards: stats.difficultCards,
          reviewsToday: state.stats.reviewsToday,
        },
      };
    }

    case "RESET_TODAY_PROGRESS": {
      // Reset all cards to be due today and reset reviewsToday counter
      const resetCards = state.allCards.map((card) => ({
        ...card,
        nextReviewDate: new Date(),
        interval: 1,
        repetitions: 0,
        totalReviews: 0,
        easinessFactor: 2.5, // Reset to default SM2 value
        isNew: true,
        lastReviewDate: new Date(0), // Reset to epoch
      }));

      const stats = calculateFlashcardStats(resetCards);
      const dueCards = getDueFlashcards(resetCards);

      return {
        ...state,
        allCards: resetCards,
        dueCards,
        stats: {
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          difficultCards: stats.difficultCards,
          reviewsToday: 0, // Reset reviews today counter
        },
        currentSession: null,
        currentCard: null,
        isShowingBack: false,
      };
    }

    // Enhanced loading states
    case "SET_LOADING_STATE": {
      const { key, value } = action.payload;
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
          [key]: value,
        },
      };
    }

    // Data source and sync management
    case "SET_DATA_SOURCE": {
      return {
        ...state,
        dataSource: action.payload,
      };
    }

    case "SET_SYNC_STATUS": {
      return {
        ...state,
        syncStatus: action.payload,
      };
    }

    case "SET_LAST_SYNC_TIME": {
      return {
        ...state,
        lastSyncTime: action.payload,
      };
    }

    // Error handling
    case "SET_ERROR": {
      return {
        ...state,
        error: action.payload,
      };
    }

    case "CLEAR_ERROR": {
      return {
        ...state,
        error: null,
      };
    }

    case "ADD_PENDING_OPERATION": {
      return {
        ...state,
        pendingOperations: [...state.pendingOperations, action.payload],
      };
    }

    case "REMOVE_PENDING_OPERATION": {
      return {
        ...state,
        pendingOperations: state.pendingOperations.filter(
          (op) => op.id !== action.payload
        ),
      };
    }

    case "RETRY_PENDING_OPERATIONS": {
      // Reset retry count for all pending operations
      return {
        ...state,
        pendingOperations: state.pendingOperations.map((op) => ({
          ...op,
          retryCount: 0,
        })),
      };
    }

    // Migration
    case "SET_MIGRATION_STATUS": {
      return {
        ...state,
        migrationStatus: action.payload,
      };
    }

    // User authentication
    case "SET_USER": {
      const { user, isGuest } = action.payload;
      return {
        ...state,
        user,
        isGuest,
      };
    }

    default:
      return state;
  }
};

// Create context
const FlashcardContext = createContext<{
  state: FlashcardContextState;
  dispatch: React.Dispatch<FlashcardAction>;
  // Action helpers
  loadCards: (cards: Flashcard[]) => void;
  startReviewSession: () => void;
  showCardBack: () => void;
  rateCard: (quality: number) => void;
  knowCard: () => void;
  nextCard: () => void;
  completeSession: () => void;
  resetSession: () => void;
  resetTodayProgress: () => void;
  // Enhanced helpers for loading states and error handling
  setLoadingState: (
    key: keyof FlashcardContextState["loadingStates"],
    value: boolean
  ) => void;
  setDataSource: (source: "session" | "firestore" | "fallback") => void;
  setSyncStatus: (status: "idle" | "syncing" | "error" | "offline") => void;
  setError: (error: string, retryable?: boolean) => void;
  clearError: () => void;
  retryPendingOperations: () => void;
  setUser: (user: any, isGuest: boolean) => void;
} | null>(null);

// Context provider component
export const FlashcardProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(flashcardReducer, initialState);

  // Load initial flashcard data on mount
  useEffect(() => {
    dispatch({ type: "SET_LOADING", payload: true });

    // Transform raw data to include SM-2 parameters
    const transformedCards = (flashcardsData as FlashcardData[]).map(
      transformFlashcardData
    );

    dispatch({ type: "LOAD_CARDS", payload: transformedCards });
  }, []);

  // Action helper functions
  const loadCards = (cards: Flashcard[]) => {
    dispatch({ type: "LOAD_CARDS", payload: cards });
  };

  const startReviewSession = () => {
    if (state.dueCards.length > 0) {
      // Limit review session to maximum 20 cards
      const reviewCards = state.dueCards.slice(0, 20);
      dispatch({ type: "START_REVIEW_SESSION", payload: reviewCards });
    }
  };

  const showCardBack = () => {
    dispatch({ type: "SHOW_CARD_BACK" });
  };

  const rateCard = (quality: number) => {
    if (state.currentCard) {
      dispatch({
        type: "RATE_CARD",
        payload: { cardId: state.currentCard.id, quality },
      });
    }
  };

  const knowCard = () => {
    // "I Know" button is equivalent to "Easy" rating
    rateCard(QUALITY_RATINGS.EASY);
  };

  const nextCard = () => {
    dispatch({ type: "NEXT_CARD" });
  };

  const completeSession = () => {
    dispatch({ type: "COMPLETE_SESSION" });
  };

  const resetSession = () => {
    dispatch({ type: "RESET_SESSION" });
  };

  const resetTodayProgress = () => {
    // Reset all cards and progress counters
    dispatch({ type: "RESET_TODAY_PROGRESS" });
  };

  // Enhanced helper functions for loading states and error handling
  const setLoadingState = (
    key: keyof FlashcardContextState["loadingStates"],
    value: boolean
  ) => {
    dispatch({ type: "SET_LOADING_STATE", payload: { key, value } });
  };

  const setDataSource = (source: "session" | "firestore" | "fallback") => {
    dispatch({ type: "SET_DATA_SOURCE", payload: source });
  };

  const setSyncStatus = (status: "idle" | "syncing" | "error" | "offline") => {
    dispatch({ type: "SET_SYNC_STATUS", payload: status });
  };

  const setError = (errorMessage: string, retryable: boolean = true) => {
    const error = {
      code: "CONTEXT_ERROR",
      message: errorMessage,
      retryable,
      timestamp: new Date(),
    };
    dispatch({ type: "SET_ERROR", payload: error });
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const retryPendingOperations = () => {
    dispatch({ type: "RETRY_PENDING_OPERATIONS" });
  };

  const setUser = (user: any, isGuest: boolean) => {
    dispatch({ type: "SET_USER", payload: { user, isGuest } });
  };

  const contextValue = {
    state,
    dispatch,
    loadCards,
    startReviewSession,
    showCardBack,
    rateCard,
    knowCard,
    nextCard,
    completeSession,
    resetSession,
    resetTodayProgress,
    // Enhanced helpers
    setLoadingState,
    setDataSource,
    setSyncStatus,
    setError,
    clearError,
    retryPendingOperations,
    setUser,
  };

  return (
    <FlashcardContext.Provider value={contextValue}>
      {children}
    </FlashcardContext.Provider>
  );
};

// Custom hook to use the flashcard context
export const useFlashcard = () => {
  const context = useContext(FlashcardContext);
  if (!context) {
    throw new Error("useFlashcard must be used within a FlashcardProvider");
  }
  return context;
};

export default FlashcardContext;
