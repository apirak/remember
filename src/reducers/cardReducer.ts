// Card Management Reducer
// Handles flashcard data operations, statistics, and progress management

import type { FlashcardContextState, Flashcard } from "../types/flashcard";
import {
  getDueFlashcards,
  calculateFlashcardStats,
} from "../utils/flashcardHelpers";

/**
 * Card-related action types that this reducer handles
 */
export type CardAction =
  | { type: "LOAD_CARDS"; payload: Flashcard[] }
  | { type: "UPDATE_STATS" }
  | { type: "RESET_TODAY_PROGRESS" }
  | { type: "SET_LOADING"; payload: boolean };

/**
 * Card reducer - handles all card-related state updates
 * @param state Current flashcard context state
 * @param action Card action to process
 * @returns Updated state
 */
export const cardReducer = (
  state: FlashcardContextState,
  action: CardAction
): Partial<FlashcardContextState> => {
  switch (action.type) {
    case "LOAD_CARDS": {
      const allCards = action.payload;
      const dueCards = getDueFlashcards(allCards);
      const stats = calculateFlashcardStats(allCards);

      return {
        allCards,
        dueCards,
        stats: {
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          difficultCards: stats.difficultCards,
          reviewsToday: stats.reviewsToday,
        },
        isLoading: false,
      };
    }

    case "SET_LOADING": {
      return {
        isLoading: action.payload,
      };
    }

    case "UPDATE_STATS": {
      const stats = calculateFlashcardStats(state.allCards);
      const dueCards = getDueFlashcards(state.allCards);

      return {
        dueCards,
        stats: {
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          difficultCards: stats.difficultCards,
          reviewsToday: stats.reviewsToday, // Now calculated from actual card data
        },
      };
    }

    case "RESET_TODAY_PROGRESS": {
      // Reset all cards to be due today and reset reviewsToday counter
      // Set lastReviewDate to yesterday so cards won't be counted as "reviewed today"
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const resetCards = state.allCards.map((card) => ({
        ...card,
        nextReviewDate: new Date(),
        interval: 1,
        repetitions: 0,
        totalReviews: 0,
        easinessFactor: 2.5, // Reset to default SM2 value
        isNew: true,
        lastReviewDate: yesterday,
      }));

      const stats = calculateFlashcardStats(resetCards);
      const dueCards = getDueFlashcards(resetCards);

      return {
        allCards: resetCards,
        dueCards,
        stats: {
          totalCards: stats.totalCards,
          dueCards: stats.dueCards,
          masteredCards: stats.masteredCards,
          difficultCards: stats.difficultCards,
          reviewsToday: stats.reviewsToday,
        },
        currentSession: null,
        currentCard: null,
        isShowingBack: false,
      };
    }

    default:
      return {}; // No changes for unknown actions
  }
};
