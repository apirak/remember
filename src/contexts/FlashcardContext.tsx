// FlashcardContext - React Context for managing flashcard state
// Handles card data, review sessions, and progress tracking

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { 
  FlashcardContextState, 
  FlashcardAction, 
  Flashcard, 
  FlashcardData,
  ReviewSession
} from '../types/flashcard';
import { 
  initializeSM2Params, 
  calculateSM2, 
  QUALITY_RATINGS,
  type QualityRating
} from '../utils/sm2';
import flashcardsData from '../data/flashcards.json';

// Helper functions for working with our Flashcard format

// Check if a card is due for review
const isFlashcardDue = (card: Flashcard, currentDate: Date = new Date()): boolean => {
  return card.nextReviewDate <= currentDate;
};

// Get cards that are due for review
const getDueFlashcards = (cards: Flashcard[]): Flashcard[] => {
  const currentDate = new Date();
  return cards.filter(card => isFlashcardDue(card, currentDate));
};

// Calculate review statistics for our flashcard format
const calculateFlashcardStats = (cards: Flashcard[]) => {
  const totalCards = cards.length;
  const dueCards = getDueFlashcards(cards).length;
  
  let masteredCards = 0;
  let difficultCards = 0;
  let totalReviews = 0;
  
  cards.forEach(card => {
    // Mastered: repetitions >= 3 and easiness factor >= 2.0
    if (card.repetitions >= 3 && card.easinessFactor >= 2.0) {
      masteredCards++;
    }
    
    // Difficult: easiness factor < 1.8
    if (card.easinessFactor < 1.8) {
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
    averageEasinessFactor: cards.length > 0 ? 
      cards.reduce((sum, card) => sum + card.easinessFactor, 0) / cards.length : 0,
    averageQuality: cards.length > 0 ? 
      cards.reduce((sum, card) => sum + card.averageQuality, 0) / cards.length : 0,
  };
};

// Transform raw flashcard data to include SM-2 parameters
const transformFlashcardData = (data: FlashcardData): Flashcard => {
  const sm2Params = initializeSM2Params();
  const now = new Date();
  
  return {
    ...data,
    ...sm2Params,
    createdAt: now,
    updatedAt: now,
    isNew: true,
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
const flashcardReducer = (state: FlashcardContextState, action: FlashcardAction): FlashcardContextState => {
  switch (action.type) {
    case 'LOAD_CARDS': {
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

    case 'START_REVIEW_SESSION': {
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

    case 'SHOW_CARD_BACK': {
      return {
        ...state,
        isShowingBack: true,
      };
    }

    case 'RATE_CARD': {
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
      const updatedAllCards = state.allCards.map(card => 
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

      return {
        ...state,
        allCards: updatedAllCards,
        currentSession: isComplete ? { ...updatedSession, isComplete: true } : { ...updatedSession, currentIndex: nextIndex },
        currentCard: nextCard,
        isShowingBack: false,
        stats: {
          ...state.stats,
          reviewsToday: state.stats.reviewsToday + 1,
        }
      };
    }

    case 'NEXT_CARD': {
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

    case 'COMPLETE_SESSION': {
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

    case 'RESET_SESSION': {
      return {
        ...state,
        currentSession: null,
        currentCard: null,
        isShowingBack: false,
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload,
      };
    }

    case 'UPDATE_STATS': {
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
} | null>(null);

// Context provider component
export const FlashcardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(flashcardReducer, initialState);

  // Load initial flashcard data on mount
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // Transform raw data to include SM-2 parameters
    const transformedCards = (flashcardsData as FlashcardData[]).map(transformFlashcardData);
    
    dispatch({ type: 'LOAD_CARDS', payload: transformedCards });
  }, []);

  // Action helper functions
  const loadCards = (cards: Flashcard[]) => {
    dispatch({ type: 'LOAD_CARDS', payload: cards });
  };

  const startReviewSession = () => {
    if (state.dueCards.length > 0) {
      dispatch({ type: 'START_REVIEW_SESSION', payload: state.dueCards });
    }
  };

  const showCardBack = () => {
    dispatch({ type: 'SHOW_CARD_BACK' });
  };

  const rateCard = (quality: number) => {
    if (state.currentCard) {
      dispatch({ type: 'RATE_CARD', payload: { cardId: state.currentCard.id, quality } });
    }
  };

  const knowCard = () => {
    // "I Know" button is equivalent to "Easy" rating
    rateCard(QUALITY_RATINGS.EASY);
  };

  const nextCard = () => {
    dispatch({ type: 'NEXT_CARD' });
  };

  const completeSession = () => {
    dispatch({ type: 'COMPLETE_SESSION' });
  };

  const resetSession = () => {
    dispatch({ type: 'RESET_SESSION' });
  };

  const resetTodayProgress = () => {
    // Reset all cards to be due today (for testing purposes)
    const resetCards = state.allCards.map(card => ({
      ...card,
      nextReviewDate: new Date(),
      interval: 1,
      repetitions: 0,
    }));
    
    dispatch({ type: 'LOAD_CARDS', payload: resetCards });
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
    throw new Error('useFlashcard must be used within a FlashcardProvider');
  }
  return context;
};

export default FlashcardContext;