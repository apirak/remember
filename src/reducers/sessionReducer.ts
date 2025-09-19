// Session Management Reducer
// Handles review session state and interactions

import type {
  FlashcardContextState,
  Flashcard,
  ReviewSession,
} from "../types/flashcard";
import {
  calculateSM2,
  QUALITY_RATINGS,
  type QualityRating,
} from "../utils/sm2";
import {
  getDueFlashcards,
  calculateFlashcardStats,
} from "../utils/flashcardHelpers";

/**
 * Session-related action types that this reducer handles
 */
export type SessionAction =
  | { type: "START_REVIEW_SESSION"; payload: Flashcard[] }
  | { type: "SHOW_CARD_BACK" }
  | { type: "RATE_CARD"; payload: { cardId: string; quality: number } }
  | { type: "NEXT_CARD" }
  | { type: "COMPLETE_SESSION" }
  | { type: "RESET_SESSION" };

/**
 * Session reducer - handles all session-related state updates
 * @param state Current flashcard context state
 * @param action Session action to process
 * @returns Updated state
 */
export const sessionReducer = (
  state: FlashcardContextState,
  action: SessionAction
): Partial<FlashcardContextState> => {
  switch (action.type) {
    case "START_REVIEW_SESSION": {
      const reviewCards = action.payload;

      if (reviewCards.length === 0) {
        return {}; // No changes if no cards to review
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
        currentSession: session,
        currentCard: reviewCards[0],
        isShowingBack: false,
      };
    }

    case "SHOW_CARD_BACK": {
      return {
        isShowingBack: true,
      };
    }

    case "RATE_CARD": {
      if (!state.currentSession || !state.currentCard) {
        return {}; // No changes if no active session
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
        return {}; // No changes if no active session
      }

      const nextIndex = state.currentSession.currentIndex + 1;
      const isComplete = nextIndex >= state.currentSession.cards.length;

      if (isComplete) {
        return {
          currentSession: { ...state.currentSession, isComplete: true },
          currentCard: null,
          isShowingBack: false,
        };
      }

      const nextCard = state.currentSession.cards[nextIndex];

      return {
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
        currentSession: null,
        currentCard: null,
        isShowingBack: false,
      };
    }

    default:
      return {}; // No changes for unknown actions
  }
};
